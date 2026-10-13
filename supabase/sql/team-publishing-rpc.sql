CREATE OR REPLACE FUNCTION public.kairo_attach_media_to_content(p_content_id uuid, p_asset_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_business uuid;v_kind text;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO';end if;
 select c.business_id into v_business from public.contents c join public.businesses b on b.id=c.business_id
 where c.id=p_content_id and kairo_private.can_work(b.id) for update of c;
 if v_business is null then raise exception 'Contenuto non disponibile';end if;
 select kind into v_kind from public.media_assets where id=p_asset_id and business_id=v_business ;
 if v_kind is null then raise exception 'Media non disponibile per questo contenuto';end if;
 update public.contents set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('media_asset_id',p_asset_id,'media_kind',v_kind,'media_selected_at',now()),updated_at=now() where id=p_content_id;
 update public.media_assets set content_id=p_content_id where id=p_asset_id and content_id is null;
 return true;
end; $function$;

CREATE OR REPLACE FUNCTION public.kairo_cancel_meta_post(p_job_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_content uuid; v_next timestamptz;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO'; end if;
 update public.meta_publish_jobs j set status='cancelled',updated_at=now()
 where j.id=p_job_id and j.status='queued' and exists(select 1 from public.contents c join public.businesses b on b.id=c.business_id where c.id=j.content_id and kairo_private.can_work(b.id))
 returning j.content_id into v_content;
 if v_content is null then raise exception 'Invio gia avviato o non disponibile'; end if;
 select min(scheduled_for) into v_next from public.meta_publish_jobs where content_id=v_content and status in ('queued','pending','processing');
 update public.contents set status=case when v_next is null then 'ready' else 'scheduled' end,scheduled_at=v_next,updated_at=now() where id=v_content and status='scheduled';
 return true;
end; $function$;

CREATE OR REPLACE FUNCTION public.kairo_schedule_meta_post(p_content_id uuid, p_connection_id uuid, p_asset_id uuid, p_scheduled_for timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.contents%rowtype; a public.media_assets%rowtype; cn public.social_connections%rowtype; job public.meta_publish_jobs%rowtype; v_caption text; v_format text; v_id uuid;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO'; end if;
 if p_scheduled_for is null or p_scheduled_for<now()+interval '2 minutes' or p_scheduled_for>now()+interval '180 days' then raise exception 'Scegli una data tra 2 minuti e 180 giorni nel futuro'; end if;
 select ct.* into c from public.contents ct join public.businesses b on b.id=ct.business_id where ct.id=p_content_id and kairo_private.can_work(b.id) for update of ct;
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
 v_format:=c.format;
 select * into job from public.meta_publish_jobs where content_id=c.id and connection_id=cn.id for update;
 if job.status='queued' then
  if job.asset_id is distinct from p_asset_id then raise exception 'Annulla la programmazione per cambiare il media'; end if;
  v_caption:=job.caption_snapshot; v_format:=job.format_snapshot;
 end if;
 if job.status in ('processing','pending','published','uncertain','failed') then raise exception 'Invio gia avviato o da verificare: non riprogrammare questo post'; end if;
 insert into public.meta_publish_jobs(content_id,connection_id,status,asset_id,scheduled_for,caption_snapshot,format_snapshot,media_required)
 values(c.id,cn.id,'queued',p_asset_id,p_scheduled_for,v_caption,v_format,p_asset_id is not null)
 on conflict(content_id,connection_id) do update set status='queued',asset_id=excluded.asset_id,scheduled_for=excluded.scheduled_for,caption_snapshot=excluded.caption_snapshot,format_snapshot=excluded.format_snapshot,media_required=excluded.media_required,container_id=null,error_message=null,attempt_count=0,updated_at=now()
 returning id into v_id;
 update public.contents set status='scheduled',scheduled_at=(select min(scheduled_for) from public.meta_publish_jobs where content_id=c.id and status='queued'),updated_at=now() where id=c.id;
 return v_id;
end; $function$;

