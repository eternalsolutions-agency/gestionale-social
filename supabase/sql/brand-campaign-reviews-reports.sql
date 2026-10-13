alter table public.contents add column if not exists approval_status text not null default 'draft' check(approval_status in ('draft','pending','approved','changes_requested'));
alter table public.contents add column if not exists revision integer not null default 1;
alter table public.contents add column if not exists approved_by uuid references auth.users(id) on delete set null;
alter table public.contents add column if not exists approved_at timestamptz;
alter table public.contents add column if not exists approved_asset_id uuid references public.media_assets(id) on delete set null;
update public.contents c set approval_status='approved',approved_by=b.owner_id,approved_at=coalesce(c.updated_at,c.created_at),approved_asset_id=coalesce((select a.id from public.media_assets a where a.id::text=c.metadata->>'media_asset_id' and a.business_id=c.business_id),(select j.asset_id from public.meta_publish_jobs j where j.content_id=c.id and j.asset_id is not null limit 1)) from public.businesses b where b.id=c.business_id and c.status in ('ready','scheduled','published');
create table public.kairo_content_reviews(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,content_id uuid not null references public.contents(id) on delete cascade,actor_id uuid references auth.users(id) on delete set null,revision integer not null,action text not null check(action in ('pending','approved','changes_requested','draft')),note text not null default '',created_at timestamptz not null default now());
create index on public.kairo_content_reviews(content_id,created_at desc);
alter table public.kairo_content_reviews enable row level security;
revoke all on public.kairo_content_reviews from anon,authenticated;
grant select on public.kairo_content_reviews to authenticated;
grant all on public.kairo_content_reviews to service_role;
create policy reviews_team_read on public.kairo_content_reviews for select to authenticated using(kairo_private.can_work(business_id));
create or replace function kairo_private.content_review_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;changed boolean:=false;locked boolean:=false;removed_asset boolean:=false;removed_actor boolean:=false;begin
 select owner_id into owner from public.businesses where id=new.business_id;
 if tg_op='INSERT' then
  new.revision:=1;new.approved_by:=null;new.approved_at:=null;new.approved_asset_id:=null;
  if auth.uid()=owner and new.status='ready' then new.approval_status:='approved';else new.approval_status:='draft';if new.status in ('ready','scheduled','published') then new.status:='draft';end if;end if;
 else
  removed_asset:=pg_trigger_depth()>1 and old.approved_asset_id is not null and new.approved_asset_id is null;removed_actor:=pg_trigger_depth()>1 and old.approved_by is not null and new.approved_by is null;
  changed:=row(new.title,new.hook,new.body,new.caption,new.cta,new.hashtags,new.format,new.media_urls,new.metadata->'media_asset_id',new.metadata->'media_asset_ids',new.metadata->'media_set_id') is distinct from row(old.title,old.hook,old.body,old.caption,old.cta,old.hashtags,old.format,old.media_urls,old.metadata->'media_asset_id',old.metadata->'media_asset_ids',old.metadata->'media_set_id');
  new.revision:=old.revision;new.approved_by:=old.approved_by;new.approved_at:=old.approved_at;new.approved_asset_id:=old.approved_asset_id;
  if removed_asset and old.status<>'published' then changed:=true;end if;
  if removed_actor then new.approved_by:=null;end if;if removed_asset then new.approved_asset_id:=null;end if;
  if changed or new.approval_status is distinct from old.approval_status then
   select exists(select 1 from public.meta_publish_jobs where content_id=old.id and status in ('queued','pending','processing','uncertain')) into locked;
   if locked then raise exception 'Annulla gli invii programmati o verifica quelli avviati prima di modificare il contenuto';end if;
   if old.status='published' then raise exception 'Il contenuto è pubblicato: crea una nuova bozza';end if;
  end if;
  if changed then new.revision:=old.revision+1;new.approval_status:='draft';new.status:='draft';new.approved_by:=null;new.approved_at:=null;new.approved_asset_id:=null;
  elsif new.status='ready' and old.status not in ('ready','scheduled','published') and new.approval_status=old.approval_status then
   if auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare il contenuto';end if;new.approval_status:='approved';
  end if;
  if new.status in ('scheduled','published') and new.status is distinct from old.status and new.approval_status<>'approved' then raise exception 'Il titolare deve approvare prima il contenuto';end if;
  if new.approval_status is distinct from old.approval_status and new.approval_status in ('approved','changes_requested') and auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare o richiedere modifiche';end if;
 end if;
 if new.approval_status='approved' and (tg_op='INSERT' or old.approval_status is distinct from 'approved') then
  if auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare il contenuto';end if;
  new.approved_by:=owner;new.approved_at:=now();select id into new.approved_asset_id from public.media_assets where id::text=new.metadata->>'media_asset_id' and business_id=new.business_id;
 elsif new.approval_status<>'approved' then new.approved_by:=null;new.approved_at:=null;new.approved_asset_id:=null;if new.status in ('ready','scheduled','published') then new.status:='draft';end if;end if;
 if new.status in ('scheduled','published') and new.approval_status<>'approved' then raise exception 'Approva prima il contenuto';end if;
 return new;end $$;
create trigger kairo_content_review_guard before insert or update on public.contents for each row execute function kairo_private.content_review_guard();
create or replace function kairo_private.content_review_audit() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' or old.approval_status is distinct from new.approval_status or old.revision<>new.revision then
 insert into public.kairo_content_reviews(business_id,content_id,actor_id,revision,action) values(new.business_id,new.id,auth.uid(),new.revision,new.approval_status);end if;return new;end $$;
create trigger kairo_content_review_audit after insert or update on public.contents for each row execute function kairo_private.content_review_audit();
create or replace function kairo_private.review_content(p_content uuid,p_action text,p_note text,p_revision integer) returns boolean language plpgsql security definer set search_path='' as $$
declare c public.contents%rowtype;owner uuid;begin
 select * into c from public.contents where id=p_content for update;
 if c.id is null or not kairo_private.can_work(c.business_id) then raise exception 'Contenuto non disponibile';end if;
 if p_action not in ('pending','approved','changes_requested') or length(coalesce(p_note,''))>2000 then raise exception 'Richiesta non valida';end if;
 if p_revision is distinct from c.revision then raise exception 'Il contenuto è cambiato: aggiorna prima di approvare';end if;
 select owner_id into owner from public.businesses where id=c.business_id;
 if p_action in ('approved','changes_requested') and auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare o richiedere modifiche';end if;
 if p_action='changes_requested' and length(trim(coalesce(p_note,'')))=0 then raise exception 'Indica le modifiche richieste';end if;
 if c.status='published' or exists(select 1 from public.meta_publish_jobs where content_id=c.id and status in ('queued','pending','processing','uncertain')) then raise exception 'Annulla o verifica prima gli invii di questo contenuto';end if;
 update public.contents set approval_status=p_action,status=case when p_action='approved' then 'ready' else 'draft' end,updated_at=now() where id=c.id;
 insert into public.kairo_content_reviews(business_id,content_id,actor_id,revision,action,note) values(c.business_id,c.id,auth.uid(),c.revision,p_action,coalesce(p_note,''));return true;end $$;
revoke all on function kairo_private.review_content(uuid,text,text,integer) from public,anon;
grant execute on function kairo_private.review_content(uuid,text,text,integer) to authenticated;
create or replace function public.kairo_review_content(p_content uuid,p_action text,p_note text default '',p_revision integer default null) returns boolean language sql security invoker set search_path='' as $$ select kairo_private.review_content(p_content,p_action,p_note,p_revision); $$;
revoke all on function public.kairo_review_content(uuid,text,text,integer) from public,anon;grant execute on function public.kairo_review_content(uuid,text,text,integer) to authenticated;
create or replace function kairo_private.publication_approval_guard() returns trigger language plpgsql security definer set search_path='' as $$declare c public.contents%rowtype;begin
 if new.status in ('queued','pending','processing') then
  select * into c from public.contents where id=new.content_id for update;
  if c.approval_status<>'approved' then raise exception 'Il titolare deve approvare prima il contenuto';end if;
  if new.asset_id is distinct from c.approved_asset_id then raise exception 'Il media selezionato non è quello approvato. Associalo al contenuto e richiedi una nuova approvazione';end if;
 end if;return new;end $$;
create trigger kairo_publication_approval_guard before insert or update of status,asset_id on public.meta_publish_jobs for each row execute function kairo_private.publication_approval_guard();
alter table public.brand_profiles add column if not exists logo_asset_id uuid references public.media_assets(id) on delete set null;
create or replace function kairo_private.save_brand(p_business uuid,p_brand jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare owner uuid;v_id uuid;v_logo uuid;begin
 select owner_id into owner from public.businesses where id=p_business and owner_id=auth.uid();if owner is null then raise exception 'Solo il titolare può modificare il kit brand';end if;
 if octet_length(p_brand::text)>20000 or length(trim(p_brand->>'name')) not between 1 and 120 or length(coalesce(p_brand->>'notes',''))>3000 or length(coalesce(p_brand->>'tone',''))>500 or length(coalesce(p_brand->>'cta',''))>300 or coalesce(p_brand->>'primary','')!~'^#[a-fA-F0-9]{6}$' or coalesce(p_brand->>'secondary','')!~'^#[a-fA-F0-9]{6}$' or coalesce(p_brand->>'font','') not in ('Arial','Georgia','Verdana','Trebuchet MS') then raise exception 'Dati del kit brand non validi';end if;
 v_logo:=nullif(p_brand->>'logo_asset_id','')::uuid;if v_logo is not null and not exists(select 1 from public.media_assets where id=v_logo and business_id=p_business and kind='image') then raise exception 'Logo non disponibile';end if;
 insert into public.brand_profiles(business_id,owner_id,brand_name,colors,fonts,cta,visual_notes,logo_asset_id) values(p_business,owner,trim(p_brand->>'name'),jsonb_build_object('primary',p_brand->>'primary','secondary',p_brand->>'secondary'),jsonb_build_object('primary',p_brand->>'font'),p_brand->>'cta',p_brand->>'notes',v_logo) on conflict(business_id) do update set brand_name=excluded.brand_name,colors=excluded.colors,fonts=excluded.fonts,cta=excluded.cta,visual_notes=excluded.visual_notes,logo_asset_id=excluded.logo_asset_id,updated_at=now() returning id into v_id;
 update public.businesses set tone_of_voice=p_brand->>'tone',updated_at=now() where id=p_business;return v_id;end $$;
revoke all on function kairo_private.save_brand(uuid,jsonb) from public,anon;grant execute on function kairo_private.save_brand(uuid,jsonb) to authenticated;
create or replace function public.kairo_save_brand(p_business uuid,p_brand jsonb) returns uuid language sql security invoker set search_path='' as $$select kairo_private.save_brand(p_business,p_brand);$$;
revoke all on function public.kairo_save_brand(uuid,jsonb) from public,anon;grant execute on function public.kairo_save_brand(uuid,jsonb) to authenticated;
revoke insert,update,delete on public.brand_profiles from authenticated;
create table public.kairo_campaigns(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,created_by uuid not null references auth.users(id) on delete cascade,client_id uuid not null,brief jsonb not null,created_at timestamptz not null default now(),unique(created_by,client_id));
alter table public.kairo_campaigns enable row level security;revoke all on public.kairo_campaigns from anon,authenticated;grant select on public.kairo_campaigns to authenticated;grant all on public.kairo_campaigns to service_role;
create policy campaigns_team_read on public.kairo_campaigns for select to authenticated using(kairo_private.can_work(business_id));
create index on public.kairo_campaigns(business_id,created_at desc);
create or replace function kairo_private.save_campaign(p_business uuid,p_client uuid,p_brief jsonb,p_plan jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;old public.kairo_campaigns%rowtype;x jsonb;begin
 if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
 if p_client is null or p_brief is null or p_plan is null or octet_length(p_brief::text)>20000 or octet_length(p_plan::text)>60000 or jsonb_typeof(p_plan)<>'array' or jsonb_array_length(p_plan)<>6 or length(trim(coalesce(p_brief->>'name',''))) not between 1 and 150 then raise exception 'Campagna non valida';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client::text,0));select * into old from public.kairo_campaigns where created_by=auth.uid() and client_id=p_client;
 if old.id is not null then if old.business_id<>p_business or old.brief<>p_brief then raise exception 'Richiesta già utilizzata';end if;return old.id;end if;
 if (select count(*) from public.kairo_campaigns where business_id=p_business and created_at>now()-interval '1 day')>=20 then raise exception 'Hai già creato 20 campagne oggi';end if;
 insert into public.kairo_campaigns(business_id,created_by,client_id,brief) values(p_business,auth.uid(),p_client,p_brief) returning id into v_id;
 for x in select value from jsonb_array_elements(p_plan) loop
  if coalesce(x->>'format','') not in ('post','carousel','stories','reel') or length(coalesce(x->>'title','')) not between 1 and 150 or length(coalesce(x->>'caption',''))>10000 or length(coalesce(x->>'hook',''))>500 or length(coalesce(x->>'cta',''))>300 or octet_length(coalesce(x->'metadata','{}')::text)>20000 then raise exception 'Contenuto della campagna non valido';end if;
  insert into public.contents(business_id,created_by,title,format,status,hook,caption,body,cta,hashtags,metadata) values(p_business,auth.uid(),x->>'title',x->>'format','draft',x->>'hook',x->>'caption',x->>'body',x->>'cta',array[]::text[],coalesce(x->'metadata','{}')||jsonb_build_object('campaign_id',v_id,'source','campaign','proposed_date',x->>'date'));
 end loop;return v_id;end $$;
revoke all on function kairo_private.save_campaign(uuid,uuid,jsonb,jsonb) from public,anon;grant execute on function kairo_private.save_campaign(uuid,uuid,jsonb,jsonb) to authenticated;
create or replace function public.kairo_save_campaign(p_business uuid,p_client uuid,p_brief jsonb,p_plan jsonb) returns uuid language sql security invoker set search_path='' as $$select kairo_private.save_campaign(p_business,p_client,p_brief,p_plan);$$;
revoke all on function public.kairo_save_campaign(uuid,uuid,jsonb,jsonb) from public,anon;grant execute on function public.kairo_save_campaign(uuid,uuid,jsonb,jsonb) to authenticated;
create table public.kairo_monthly_reports(id uuid primary key default gen_random_uuid(),business_id uuid not null references public.businesses(id) on delete cascade,month date not null,created_by uuid references auth.users(id) on delete set null,snapshot jsonb not null,updated_at timestamptz not null default now(),unique(business_id,month),check(extract(day from month)=1));
alter table public.kairo_monthly_reports enable row level security;revoke all on public.kairo_monthly_reports from anon,authenticated;grant select on public.kairo_monthly_reports to authenticated;grant all on public.kairo_monthly_reports to service_role;
create policy reports_team_read on public.kairo_monthly_reports for select to authenticated using(kairo_private.can_work(business_id));
create or replace function kairo_private.monthly_report(p_business uuid,p_month date,p_metrics jsonb,p_save boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;start_at timestamptz;end_at timestamptz;v_owner uuid;x record;begin
 if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
 if p_month is null or extract(day from p_month)<>1 or p_month<'2020-01-01' or p_month>date_trunc('month',now() at time zone 'Europe/Rome')::date then raise exception 'Mese non valido';end if;
 select owner_id into v_owner from public.businesses where id=p_business;
 if p_save and auth.uid()<>v_owner then raise exception 'Solo il titolare può salvare il report';end if;
 if p_metrics is null or jsonb_typeof(p_metrics)<>'object' or octet_length(p_metrics::text)>15000 then raise exception 'Statistiche non valide';end if;
 for x in select key,value from jsonb_each(p_metrics) loop
  if x.key not in ('facebook','instagram','notes') then raise exception 'Campo statistiche non valido';end if;
  if x.key='notes' then if jsonb_typeof(x.value)<>'string' or length(x.value#>>'{}')>3000 then raise exception 'Note troppo lunghe';end if;
  else if jsonb_typeof(x.value)<>'object' or exists(select 1 from jsonb_each(x.value) m where m.key not in ('reach','interactions','followers_start','followers_end') or (m.value<>'null'::jsonb and (m.value::text!~'^[0-9]{1,12}$'))) then raise exception 'Inserisci statistiche intere e positive';end if;end if;
 end loop;
 start_at:=p_month::timestamp at time zone 'Europe/Rome';end_at:=(p_month+interval '1 month')::timestamp at time zone 'Europe/Rome';
 result:=jsonb_build_object('month',p_month,'generated_at',now(),'business_name',(select name from public.businesses where id=p_business),'created',(select count(*) from public.contents where business_id=p_business and created_at>=start_at and created_at<end_at),'approved',(select count(distinct content_id) from public.kairo_content_reviews where business_id=p_business and action='approved' and created_at>=start_at and created_at<end_at),'published',(select count(*) from public.contents where business_id=p_business and published_at>=start_at and published_at<end_at),'scheduled',(select count(*) from public.contents where business_id=p_business and scheduled_at>=start_at and scheduled_at<end_at and status='scheduled'),'campaigns',(select count(*) from public.kairo_campaigns where business_id=p_business and created_at>=start_at and created_at<end_at),'formats',(select coalesce(jsonb_object_agg(format,n),'{}') from (select coalesce(format,'post') format,count(*) n from public.contents where business_id=p_business and created_at>=start_at and created_at<end_at group by format) f),'confirmed_social_posts',(select count(*) from public.meta_publish_jobs j join public.contents c on c.id=j.content_id where c.business_id=p_business and j.status='published' and j.updated_at>=start_at and j.updated_at<end_at),'metrics_source','manual','metrics',p_metrics);
 if p_save then insert into public.kairo_monthly_reports(business_id,month,created_by,snapshot) values(p_business,p_month,auth.uid(),result) on conflict(business_id,month) do update set snapshot=excluded.snapshot,updated_at=now();end if;return result;end $$;
revoke all on function kairo_private.monthly_report(uuid,date,jsonb,boolean) from public,anon;grant execute on function kairo_private.monthly_report(uuid,date,jsonb,boolean) to authenticated;
create or replace function public.kairo_monthly_report(p_business uuid,p_month date,p_metrics jsonb default '{}',p_save boolean default false) returns jsonb language sql security invoker set search_path='' as $$select kairo_private.monthly_report(p_business,p_month,p_metrics,p_save);$$;
revoke all on function public.kairo_monthly_report(uuid,date,jsonb,boolean) from public,anon;grant execute on function public.kairo_monthly_report(uuid,date,jsonb,boolean) to authenticated;
revoke all on function kairo_private.content_review_guard(),kairo_private.content_review_audit(),kairo_private.publication_approval_guard() from public,anon,authenticated;
