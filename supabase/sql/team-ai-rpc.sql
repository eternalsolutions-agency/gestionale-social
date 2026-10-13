CREATE OR REPLACE FUNCTION public.create_ai_generation(p_business_id uuid, p_content_id uuid, p_generation_type text, p_prompt text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS ai_generations
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_row public.ai_generations;
begin
  if (select auth.uid()) is null then raise exception 'authentication required'; end if;
  if not exists (select 1 from public.businesses b where b.id=p_business_id and kairo_private.can_work(b.id)) then raise exception 'business not found'; end if;
  if p_content_id is not null and not exists (select 1 from public.contents c where c.id=p_content_id and c.business_id=p_business_id ) then raise exception 'content not found'; end if;
  insert into public.ai_generations(business_id,owner_id,content_id,generation_type,prompt,status,metadata)
  values(p_business_id,(select auth.uid()),p_content_id,coalesce(nullif(p_generation_type,''),'image'),p_prompt,'queued',coalesce(p_metadata,'{}'::jsonb))
  returning * into v_row;
  return v_row;
end;
$function$;

CREATE OR REPLACE FUNCTION public.kairo_reserve_video_generation(p_asset_id uuid, p_content_id uuid, p_prompt text, p_client_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a public.media_assets%rowtype;g public.ai_generations%rowtype;r public.kairo_video_requests%rowtype;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO';end if;
 if p_client_request_id is null or length(trim(p_prompt))<5 or length(p_prompt)>3000 then raise exception 'Richiesta video non valida';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client_request_id::text,0));
 select * into r from public.kairo_video_requests where owner_id=auth.uid() and client_request_id=p_client_request_id;
 if r.generation_id is not null then
  select * into g from public.ai_generations where id=r.generation_id;
  if r.source_asset_id is distinct from p_asset_id or r.content_id is distinct from p_content_id or g.prompt is distinct from p_prompt then raise exception 'Questa richiesta video e gia associata a un altro contenuto';end if;
  return jsonb_build_object('generation_id',r.generation_id,'is_new',false,'status',r.state);
 end if;
 select * into a from public.media_assets where id=p_asset_id and kairo_private.can_work(business_id) and kind='image';
 if a.id is null or a.storage_path is null or not kairo_private.can_work(a.business_id) then raise exception 'Immagine non disponibile';end if;
 if p_content_id is not null and not exists(select 1 from public.contents where id=p_content_id and business_id=a.business_id ) then raise exception 'Contenuto non disponibile';end if;
 insert into public.ai_generations(business_id,owner_id,content_id,generation_type,prompt,model,status,metadata)
 values(a.business_id,auth.uid(),p_content_id,'image_to_video',p_prompt,'fal-ai/pika/v2.1/image-to-video','queued',jsonb_build_object('source_asset_id',a.id,'duration',5,'async',true))
 returning * into g;
 insert into public.kairo_video_requests(generation_id,owner_id,business_id,content_id,source_asset_id,client_request_id)
 values(g.id,auth.uid(),a.business_id,p_content_id,a.id,p_client_request_id);
 return jsonb_build_object('generation_id',g.id,'is_new',true,'status','submitting');
end; $function$;

CREATE OR REPLACE FUNCTION public.kairo_save_media_set(p_business_id uuid, p_content_id uuid, p_kind text, p_title text, p_asset_ids uuid[], p_design jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;v_count int;v_content uuid;
begin
 if auth.uid() is null or not kairo_private.can_work(p_business_id) then raise exception 'Workspace non disponibile';end if;
 v_count:=coalesce(array_length(p_asset_ids,1),0);
 if p_kind not in ('carousel','stories') or v_count<(case when p_kind='carousel' then 2 else 1 end) or v_count>(case when p_kind='carousel' then 10 else 5 end) then raise exception 'Numero di slide non valido';end if;
 if (select count(distinct x) from unnest(p_asset_ids) x)<>v_count or (select count(*) from public.media_assets where id=any(p_asset_ids) and business_id=p_business_id and owner_id=auth.uid() and kind='image' and mime_type='image/jpeg')<>v_count then raise exception 'Slide non disponibili';end if;
 if length(p_title)>150 or octet_length(coalesce(p_design,'{}'::jsonb)::text)>200000 then raise exception 'Design troppo grande';end if;
 if p_content_id is not null then
 select c.id into v_content from public.contents c where c.id=p_content_id and c.business_id=p_business_id and exists(select 1 from public.businesses b where b.id=c.business_id and kairo_private.can_work(b.id)) and c.status<>'published' for update;
 if v_content is null then raise exception 'Seleziona una bozza disponibile';end if;
 if exists(select 1 from public.meta_publish_jobs where content_id=v_content and status in ('queued','pending','processing')) then raise exception 'Annulla gli invii programmati prima di cambiare formato';end if;
 end if;
 insert into public.kairo_media_sets(business_id,owner_id,content_id,kind,title,asset_ids,design)
 values(p_business_id,auth.uid(),p_content_id,p_kind,coalesce(nullif(p_title,''),'Creativita KAIRO'),p_asset_ids,coalesce(p_design,'{}'::jsonb)) returning id into v_id;
 update public.media_assets set content_id=coalesce(content_id,p_content_id),metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('media_set_id',v_id,'set_kind',p_kind) where id=any(p_asset_ids);
 if v_content is not null then
 update public.contents set format=p_kind,metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('media_set_id',v_id,'media_asset_ids',to_jsonb(p_asset_ids),'media_asset_id',p_asset_ids[1],'media_kind','image'),updated_at=now() where id=v_content;
 end if;
 return v_id;
end; $function$;


create policy brand_team_read on public.brand_profiles for select to authenticated using(kairo_private.can_work(business_id));
