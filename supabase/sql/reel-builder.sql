alter table kairo_private.ai_quota_ledger drop constraint ai_quota_ledger_category_check;
alter table kairo_private.ai_quota_ledger add constraint ai_quota_ledger_category_check check(category in ('images','edits','videos','reels'));
create or replace function kairo_private.ai_cap(p_plan text,p_category text) returns int language sql immutable set search_path='' as $$ select case p_category when 'images' then case p_plan when 'premium' then 300 when 'pro' then 150 else 50 end when 'edits' then case p_plan when 'premium' then 60 when 'pro' then 30 else 10 end when 'videos' then case p_plan when 'premium' then 25 when 'pro' then 10 else 0 end when 'reels' then case p_plan when 'premium' then 20 when 'pro' then 10 else 4 end else 0 end; $$;
create table public.kairo_reel_renders (
 generation_id uuid primary key references public.ai_generations(id) on delete cascade,owner_id uuid not null references auth.users(id),business_id uuid not null references public.businesses(id),source_asset_id uuid not null references public.media_assets(id),content_id uuid references public.contents(id) on delete set null,
 client_request_id uuid not null,title text not null,design jsonb not null,state text not null default 'submitting' check(state in ('submitting','active','checking','completed','failed','uncertain')),
 provider_request_id text,status_url text,response_url text,error_message text,output_asset_id uuid references public.media_assets(id) on delete set null,
 lease_token uuid,lease_until timestamptz,next_check_at timestamptz not null default now(),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(owner_id,client_request_id)
);
alter table public.kairo_reel_renders enable row level security;
revoke all on public.kairo_reel_renders from public,anon,authenticated;
grant select on public.kairo_reel_renders to authenticated;
grant all on public.kairo_reel_renders to service_role;
create policy reel_team_read on public.kairo_reel_renders for select to authenticated using(kairo_private.can_work(business_id));
create or replace function public.kairo_reserve_reel_render(p_business uuid,p_source uuid,p_title text,p_design jsonb,p_client_id uuid,p_content uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$ declare v_existing public.kairo_reel_renders;v_gen uuid;v_scene jsonb;v_count int;begin
 if not kairo_private.can_work(p_business) or p_client_id is null then raise exception 'Workspace non disponibile';end if;
 if length(trim(p_title)) not between 1 and 150 or octet_length(p_design::text)>20000 or p_design->>'template' not in ('vetrina','promo','consiglio') or p_design->>'duration' is distinct from '30' or jsonb_typeof(p_design->'scenes') is distinct from 'array' then raise exception 'Montaggio non valido';end if;
 v_count:=jsonb_array_length(p_design->'scenes');if v_count<>6 then raise exception 'Il reel richiede 6 scene da 5 secondi';end if;
 foreach v_scene in array array(select value from jsonb_array_elements(p_design->'scenes')) loop
 if length(coalesce(v_scene->>'heading',''))>80 or length(coalesce(v_scene->>'body',''))>140 or not exists(select 1 from public.media_assets where id=(v_scene->>'assetId')::uuid and business_id=p_business and kind in ('image','video') and coalesce(metadata->>'internal_reel_source','false')<>'true') then raise exception 'Scena non disponibile';end if;end loop;
 if not exists(select 1 from public.media_assets where id=p_source and business_id=p_business and owner_id=auth.uid() and kind='video' and mime_type in ('video/webm','video/mp4') and metadata->>'internal_reel_source'='true') then raise exception 'Video sorgente non disponibile';end if;
 if p_content is not null and not exists(select 1 from public.contents where id=p_content and business_id=p_business and status<>'published') then raise exception 'Bozza non disponibile';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client_id::text,0));
 select * into v_existing from public.kairo_reel_renders where owner_id=auth.uid() and client_request_id=p_client_id;
 if v_existing.generation_id is not null then
 if v_existing.source_asset_id<>p_source or v_existing.design<>p_design or v_existing.business_id<>p_business then raise exception 'Richiesta già associata a un altro montaggio';end if;
 return jsonb_build_object('generation_id',v_existing.generation_id,'state',v_existing.state,'is_new',false);end if;
 insert into public.ai_generations(business_id,owner_id,content_id,generation_type,prompt,status,metadata) values(p_business,auth.uid(),p_content,'reel_montage',p_title,'queued',jsonb_build_object('duration',30,'source_asset_id',p_source)) returning id into v_gen;
 insert into public.kairo_reel_renders(generation_id,owner_id,business_id,source_asset_id,content_id,client_request_id,title,design) values(v_gen,auth.uid(),p_business,p_source,p_content,p_client_id,p_title,p_design);
 return jsonb_build_object('generation_id',v_gen,'state','submitting','is_new',true);end $$;
create or replace function public.kairo_claim_reel_result(p_generation uuid) returns public.kairo_reel_renders language plpgsql security definer set search_path='' as $$ declare r public.kairo_reel_renders;begin
 update public.kairo_reel_renders set state='checking',lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes',updated_at=now() where generation_id=p_generation and state in ('active','checking') and (lease_until is null or lease_until<now()) returning * into r;return r;end $$;
create or replace function public.kairo_finish_reel_result(p_generation uuid,p_lease uuid,p_storage_path text) returns uuid language plpgsql security definer set search_path='' as $$ declare r public.kairo_reel_renders;v_asset uuid;begin
 select * into r from public.kairo_reel_renders where generation_id=p_generation for update;if r.state='completed' then return r.output_asset_id;end if;
 if r.lease_token is distinct from p_lease or r.state<>'checking' or p_storage_path<>r.owner_id::text||'/'||r.business_id::text||'/reel-'||r.generation_id::text||'.mp4' then raise exception 'Lease o percorso non valido';end if;
 insert into public.media_assets(business_id,owner_id,content_id,kind,source,title,storage_path,mime_type,metadata) values(r.business_id,r.owner_id,r.content_id,'video','render',r.title,p_storage_path,'video/mp4',jsonb_build_object('duration',30,'width',720,'height',1280,'reel_design',r.design,'generation_id',r.generation_id)) returning id into v_asset;
 if r.content_id is not null then update public.contents set format='reel',metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('media_asset_id',v_asset,'media_kind','video','reel_duration',30),updated_at=now() where id=r.content_id and status<>'published';end if;
 update public.kairo_reel_renders set state='completed',output_asset_id=v_asset,lease_until=null,updated_at=now() where generation_id=r.generation_id;
 update public.ai_generations set status='completed',output_asset_id=v_asset,completed_at=now(),updated_at=now() where id=r.generation_id;return v_asset;end $$;
revoke all on function public.kairo_reserve_reel_render(uuid,uuid,text,jsonb,uuid,uuid),public.kairo_claim_reel_result(uuid),public.kairo_finish_reel_result(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.kairo_reserve_reel_render(uuid,uuid,text,jsonb,uuid,uuid) to authenticated;
grant execute on function public.kairo_claim_reel_result(uuid),public.kairo_finish_reel_result(uuid,uuid,text) to service_role;

select cron.schedule('kairo-reel-results-minute','* * * * *',replace((select command from cron.job where jobname='kairo-video-results-minute'),'generate-social-video','render-social-reel'));
