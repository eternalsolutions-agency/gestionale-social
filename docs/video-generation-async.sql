
create table public.kairo_video_requests(
 generation_id uuid primary key references public.ai_generations(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 content_id uuid references public.contents(id) on delete set null,
 source_asset_id uuid references public.media_assets(id) on delete set null,
 client_request_id uuid not null,
 state text not null default 'submitting' check(state in ('submitting','active','checking','completed','failed','uncertain')),
 provider_request_id text,status_url text,response_url text,
 lease_token uuid,lease_until timestamptz,next_check_at timestamptz not null default now(),
 output_asset_id uuid references public.media_assets(id) on delete set null,
 error_message text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(owner_id,client_request_id)
);
alter table public.kairo_video_requests enable row level security;
revoke all on public.kairo_video_requests from public,anon,authenticated;
grant all on public.kairo_video_requests to service_role;
create index kairo_video_due_idx on public.kairo_video_requests(next_check_at) where state in ('active','checking','submitting');

create or replace function public.kairo_reserve_video_generation(p_asset_id uuid,p_content_id uuid,p_prompt text,p_client_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
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
 select * into a from public.media_assets where id=p_asset_id and owner_id=auth.uid() and kind='image';
 if a.id is null or a.storage_path is null or not exists(select 1 from public.businesses where id=a.business_id and owner_id=auth.uid()) then raise exception 'Immagine non disponibile';end if;
 if p_content_id is not null and not exists(select 1 from public.contents where id=p_content_id and business_id=a.business_id and created_by=auth.uid()) then raise exception 'Contenuto non disponibile';end if;
 insert into public.ai_generations(business_id,owner_id,content_id,generation_type,prompt,model,status,metadata)
 values(a.business_id,auth.uid(),p_content_id,'image_to_video',p_prompt,'fal-ai/pika/v2.1/image-to-video','queued',jsonb_build_object('source_asset_id',a.id,'duration',5,'async',true))
 returning * into g;
 insert into public.kairo_video_requests(generation_id,owner_id,business_id,content_id,source_asset_id,client_request_id)
 values(g.id,auth.uid(),a.business_id,p_content_id,a.id,p_client_request_id);
 return jsonb_build_object('generation_id',g.id,'is_new',true,'status','submitting');
end; $$;
revoke all on function public.kairo_reserve_video_generation(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.kairo_reserve_video_generation(uuid,uuid,text,uuid) to authenticated;

create or replace function public.kairo_claim_video_result(p_generation_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.kairo_video_requests%rowtype;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required';end if;
 update public.kairo_video_requests set state='checking',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',updated_at=now()
 where generation_id=p_generation_id and (state='active' or (state='checking' and lease_until<now())) returning * into r;
 if r.generation_id is null then return null;end if;
 return to_jsonb(r);
end; $$;
revoke all on function public.kairo_claim_video_result(uuid) from public,anon,authenticated;
grant execute on function public.kairo_claim_video_result(uuid) to service_role;

create or replace function public.kairo_finish_video_result(p_generation_id uuid,p_lease_token uuid,p_storage_path text)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.kairo_video_requests%rowtype;v_asset uuid;v_title text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required';end if;
 select * into r from public.kairo_video_requests where generation_id=p_generation_id for update;
 if r.state='completed' then return r.output_asset_id;end if;
 if r.state is distinct from 'checking' or r.lease_token is distinct from p_lease_token then raise exception 'Un altro processo sta salvando il Reel';end if;
 if p_storage_path<>(r.owner_id::text||'/'||r.business_id::text||'/ai-video-'||r.generation_id::text||'.mp4') then raise exception 'Percorso video non valido';end if;
 select title into v_title from public.media_assets where id=r.source_asset_id;
 insert into public.media_assets(business_id,owner_id,content_id,kind,source,title,storage_path,mime_type,metadata)
 values(r.business_id,r.owner_id,r.content_id,'video','ai','Reel AI - '||coalesce(v_title,'KAIRO'),p_storage_path,'video/mp4',jsonb_build_object('provider','fal','model','fal-ai/pika/v2.1/image-to-video','generation_id',r.generation_id,'source_asset_id',r.source_asset_id,'duration',5))
 returning id into v_asset;
 update public.kairo_video_requests set state='completed',output_asset_id=v_asset,error_message=null,lease_until=null,updated_at=now() where generation_id=r.generation_id;
 update public.ai_generations set status='completed',output_asset_id=v_asset,error_message=null,completed_at=now(),updated_at=now() where id=r.generation_id;
 return v_asset;
end; $$;
revoke all on function public.kairo_finish_video_result(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.kairo_finish_video_result(uuid,uuid,text) to service_role;
create or replace function public.kairo_finish_video_result(p_generation_id uuid,p_lease_token uuid,p_storage_path text)
returns uuid language plpgsql security definer set search_path='' as $$
declare r public.kairo_video_requests%rowtype;v_asset uuid;v_title text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required';end if;
 select * into r from public.kairo_video_requests where generation_id=p_generation_id for update;
 if r.state='completed' then return r.output_asset_id;end if;
 if r.state is distinct from 'checking' or r.lease_token is distinct from p_lease_token then raise exception 'Un altro processo sta salvando il Reel';end if;
 if p_storage_path<>(r.owner_id::text||'/'||r.business_id::text||'/ai-video-'||r.generation_id::text||'.mp4') then raise exception 'Percorso video non valido';end if;
 select title into v_title from public.media_assets where id=r.source_asset_id;
 insert into public.media_assets(business_id,owner_id,content_id,kind,source,title,storage_path,mime_type,metadata)
 values(r.business_id,r.owner_id,r.content_id,'video','ai','Reel AI - '||coalesce(v_title,'KAIRO'),p_storage_path,'video/mp4',jsonb_build_object('provider','fal','model','fal-ai/pika/v2.1/image-to-video','generation_id',r.generation_id,'source_asset_id',r.source_asset_id,'duration',5))
 returning id into v_asset;
 if r.content_id is not null then
 update public.contents set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('media_asset_id',v_asset,'media_kind','video','media_selected_at',now()),updated_at=now()
 where id=r.content_id and business_id=r.business_id and (metadata->>'media_asset_id' is null or metadata->>'media_asset_id'=r.source_asset_id::text);
 end if;
 update public.kairo_video_requests set state='completed',output_asset_id=v_asset,error_message=null,lease_until=null,updated_at=now() where generation_id=r.generation_id;
 update public.ai_generations set status='completed',output_asset_id=v_asset,error_message=null,completed_at=now(),updated_at=now() where id=r.generation_id;
 return v_asset;
end; $$;
revoke all on function public.kairo_finish_video_result(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.kairo_finish_video_result(uuid,uuid,text) to service_role;

create or replace function kairo_internal.dispatch_video_results()
returns bigint language plpgsql security definer set search_path='' as $$
declare request_id bigint;
begin
 if not exists(select 1 from public.kairo_video_requests where (state in ('active','checking') and next_check_at<=now()) or (state='submitting' and created_at<now()-interval '2 minutes')) then return null;end if;
 select net.http_post(url:='https://tkjajqizdjaynslvwcfp.supabase.co/functions/v1/generate-social-video',headers:=jsonb_build_object('Content-Type','application/json','x-kairo-scheduler-key',(select decrypted_secret from vault.decrypted_secrets where name='kairo_meta_scheduler_key')),body:='{}'::jsonb,timeout_milliseconds:=150000) into request_id;
 return request_id;
end; $$;
revoke all on function kairo_internal.dispatch_video_results() from public,anon,authenticated;

select cron.schedule('kairo-video-results-minute','* * * * *','select kairo_internal.dispatch_video_results();');