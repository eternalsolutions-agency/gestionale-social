
alter table public.meta_publish_jobs add column if not exists media_required boolean not null default false;
create extension if not exists pg_cron;
create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if not exists(select 1 from vault.secrets where name='kairo_meta_scheduler_key') then
 perform vault.create_secret(replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'kairo_meta_scheduler_key','KAIRO scheduled publication worker key');
 end if;
end; $$;
create or replace function public.kairo_validate_scheduler_secret(p_secret text)
returns boolean language plpgsql security definer set search_path='' as $$
declare expected text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required'; end if;
 select decrypted_secret into expected from vault.decrypted_secrets where name='kairo_meta_scheduler_key';
 return expected is not null and length(p_secret)=64 and p_secret=expected;
end; $$;
revoke all on function public.kairo_validate_scheduler_secret(text) from public,anon,authenticated;
grant execute on function public.kairo_validate_scheduler_secret(text) to service_role;
create or replace function kairo_internal.dispatch_meta_schedule()
returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint;
begin
 if not exists(select 1 from public.meta_publish_jobs where (status='queued' and scheduled_for<=now()) or (status='pending' and scheduled_for is not null and updated_at<now()-interval '45 seconds') or (status='processing' and updated_at<now()-interval '10 minutes')) then return null; end if;
 select net.http_post(
 url:='https://tkjajqizdjaynslvwcfp.supabase.co/functions/v1/meta-social-scheduler',
 headers:=jsonb_build_object('Content-Type','application/json','x-kairo-scheduler-key',(select decrypted_secret from vault.decrypted_secrets where name='kairo_meta_scheduler_key')),
 body:='{}'::jsonb,timeout_milliseconds:=150000) into request_id;
 return request_id;
end; $$;
revoke all on function kairo_internal.dispatch_meta_schedule() from public,anon,authenticated;

alter table public.meta_publish_jobs drop constraint if exists meta_publish_jobs_status_check;
alter table public.meta_publish_jobs add constraint meta_publish_jobs_status_check check(status in ('queued','processing','pending','published','failed','uncertain','cancelled'));
alter table public.meta_publish_jobs add column if not exists scheduled_for timestamptz;
alter table public.meta_publish_jobs add column if not exists attempt_count integer not null default 0;
alter table public.meta_publish_jobs add column if not exists caption_snapshot text;
alter table public.meta_publish_jobs add column if not exists format_snapshot text;
create index if not exists meta_publish_jobs_due_idx on public.meta_publish_jobs(scheduled_for) where status in ('queued','pending');
create schema if not exists kairo_internal;
revoke all on schema kairo_internal from public,anon,authenticated;

create or replace function public.kairo_schedule_meta_post(p_content_id uuid,p_connection_id uuid,p_asset_id uuid,p_scheduled_for timestamptz)
returns uuid language plpgsql security definer set search_path='' as $$
declare c public.contents%rowtype; a public.media_assets%rowtype; cn public.social_connections%rowtype; job public.meta_publish_jobs%rowtype; v_caption text; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO'; end if;
 if p_scheduled_for is null or p_scheduled_for<now()+interval '2 minutes' or p_scheduled_for>now()+interval '180 days' then raise exception 'Scegli una data tra 2 minuti e 180 giorni nel futuro'; end if;
 select ct.* into c from public.contents ct join public.businesses b on b.id=ct.business_id where ct.id=p_content_id and b.owner_id=auth.uid() for update of ct;
 if c.id is null then raise exception 'Contenuto non disponibile'; end if;
 if c.status not in ('ready','scheduled') then raise exception 'Approva prima il contenuto nel calendario'; end if;
 select * into cn from public.social_connections where id=p_connection_id and business_id=c.business_id and status='connected';
 if cn.id is null or cn.platform not in ('facebook','instagram') then raise exception 'Account non collegato'; end if;
 if c.format ~* '(stor|carousel|carosell)' then raise exception 'Stories e caroselli non ancora supportati'; end if;
 if p_asset_id is not null then
  select * into a from public.media_assets where id=p_asset_id and business_id=c.business_id;
  if a.id is null or a.storage_path is null then raise exception 'Media non disponibile'; end if;
  if cn.platform='facebook' and a.kind='video' then raise exception 'Video Facebook non ancora supportati'; end if;
  if a.kind<>'video' and a.mime_type is distinct from 'image/jpeg' then raise exception 'Seleziona una foto JPEG'; end if;
 elsif cn.platform='instagram' then raise exception 'Instagram richiede una foto o un Reel'; end if;
 v_caption:=concat_ws(E'\n\n',nullif(coalesce(nullif(c.caption,''),c.body),''),nullif(c.cta,''),nullif(array_to_string(c.hashtags,' '),''));
 if v_caption='' and p_asset_id is null then raise exception 'Il contenuto e vuoto'; end if;
 if cn.platform='instagram' and length(v_caption)>2200 then raise exception 'La caption supera 2200 caratteri'; end if;
 select * into job from public.meta_publish_jobs where content_id=c.id and connection_id=cn.id for update;
 if job.status in ('processing','pending','published','uncertain','failed') then raise exception 'Invio gia avviato o da verificare: non riprogrammare questo post'; end if;
 insert into public.meta_publish_jobs(content_id,connection_id,status,asset_id,scheduled_for,caption_snapshot,format_snapshot,media_required)
 values(c.id,cn.id,'queued',p_asset_id,p_scheduled_for,v_caption,c.format,p_asset_id is not null)
 on conflict(content_id,connection_id) do update set status='queued',asset_id=excluded.asset_id,scheduled_for=excluded.scheduled_for,caption_snapshot=excluded.caption_snapshot,format_snapshot=excluded.format_snapshot,media_required=excluded.media_required,container_id=null,error_message=null,attempt_count=0,updated_at=now()
 returning id into v_id;
 update public.contents set status='scheduled',scheduled_at=(select min(scheduled_for) from public.meta_publish_jobs where content_id=c.id and status='queued'),updated_at=now() where id=c.id;
 return v_id;
end; $$;
revoke all on function public.kairo_schedule_meta_post(uuid,uuid,uuid,timestamptz) from public,anon;
grant execute on function public.kairo_schedule_meta_post(uuid,uuid,uuid,timestamptz) to authenticated;

create or replace function public.kairo_cancel_meta_post(p_job_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_content uuid;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO'; end if;
 update public.meta_publish_jobs j set status='cancelled',updated_at=now()
 where j.id=p_job_id and j.status='queued' and exists(select 1 from public.contents c join public.businesses b on b.id=c.business_id where c.id=j.content_id and b.owner_id=auth.uid())
 returning j.content_id into v_content;
 if v_content is null then raise exception 'Invio gia avviato o non disponibile'; end if;
 update public.contents set status='ready',scheduled_at=null,updated_at=now() where id=v_content and status='scheduled' and not exists(select 1 from public.meta_publish_jobs where content_id=v_content and status in ('queued','pending','processing'));
 return true;
end; $$;
revoke all on function public.kairo_cancel_meta_post(uuid) from public,anon;
grant execute on function public.kairo_cancel_meta_post(uuid) to authenticated;

create or replace function public.kairo_claim_due_meta_posts()
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_jobs jsonb;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required'; end if;
 update public.meta_publish_jobs set status='uncertain',error_message='Invio interrotto: verifica il profilo prima di riprovare.',updated_at=now() where status='processing' and updated_at<now()-interval '10 minutes';
 update public.meta_publish_jobs set status='failed',error_message='Elaborazione Meta troppo lunga. Verifica il media prima di riprovare.',updated_at=now() where status='pending' and attempt_count>=30;
 with candidates as(
 select j.id,j.status as previous_status,b.owner_id
 from public.meta_publish_jobs j join public.contents c on c.id=j.content_id join public.businesses b on b.id=c.business_id
 where ((j.status='queued' and j.scheduled_for<=now()) or (j.status='pending' and j.scheduled_for is not null and j.updated_at<now()-interval '45 seconds'))
 order by j.scheduled_for nulls last limit 3 for update of j skip locked
 ), claimed as(
 update public.meta_publish_jobs j set status='processing',attempt_count=j.attempt_count+1,updated_at=now()
 from candidates v where j.id=v.id returning j.*,v.previous_status,v.owner_id
 )
 select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) into v_jobs from claimed;
 return v_jobs;
end; $$;
revoke all on function public.kairo_claim_due_meta_posts() from public,anon,authenticated;
grant execute on function public.kairo_claim_due_meta_posts() to service_role;

create or replace function kairo_internal.cancel_queue_on_content_status()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='scheduled' and new.status not in ('scheduled') then
  update public.meta_publish_jobs set status='cancelled',error_message='Programmazione annullata dal calendario.',updated_at=now() where content_id=new.id and status in ('queued','pending');
 end if;
 return new;
end; $$;
revoke all on function kairo_internal.cancel_queue_on_content_status() from public,anon,authenticated;
create trigger meta_cancel_queue_on_status after update of status on public.contents for each row execute function kairo_internal.cancel_queue_on_content_status();

select cron.schedule('kairo-meta-publication-minute','* * * * *','select kairo_internal.dispatch_meta_schedule();');