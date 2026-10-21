
create table public.kairo_media_sets(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 content_id uuid references public.contents(id) on delete set null,
 kind text not null check(kind in ('carousel','stories')),
 title text not null,asset_ids uuid[] not null,design jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.kairo_media_sets enable row level security;
revoke all on public.kairo_media_sets from public,anon,authenticated;
grant select on public.kairo_media_sets to authenticated;
grant all on public.kairo_media_sets to service_role;
create policy kairo_sets_owner_read on public.kairo_media_sets for select to authenticated using(owner_id=auth.uid());
create index kairo_media_sets_business_idx on public.kairo_media_sets(business_id,created_at desc);
create index kairo_media_sets_content_idx on public.kairo_media_sets(content_id);

create or replace function public.kairo_save_media_set(p_business_id uuid,p_content_id uuid,p_kind text,p_title text,p_asset_ids uuid[],p_design jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;v_count int;v_content uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.businesses where id=p_business_id and owner_id=auth.uid()) then raise exception 'Workspace non disponibile';end if;
 v_count:=coalesce(array_length(p_asset_ids,1),0);
 if p_kind not in ('carousel','stories') or v_count<(case when p_kind='carousel' then 2 else 1 end) or v_count>(case when p_kind='carousel' then 10 else 5 end) then raise exception 'Numero di slide non valido';end if;
 if (select count(distinct x) from unnest(p_asset_ids) x)<>v_count or (select count(*) from public.media_assets where id=any(p_asset_ids) and business_id=p_business_id and owner_id=auth.uid() and kind='image' and mime_type='image/jpeg')<>v_count then raise exception 'Slide non disponibili';end if;
 if length(p_title)>150 or octet_length(coalesce(p_design,'{}'::jsonb)::text)>200000 then raise exception 'Design troppo grande';end if;
 if p_content_id is not null then
 select c.id into v_content from public.contents c where c.id=p_content_id and c.business_id=p_business_id and exists(select 1 from public.businesses b where b.id=c.business_id and b.owner_id=auth.uid()) and c.status<>'published' for update;
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
end; $$;
revoke all on function public.kairo_save_media_set(uuid,uuid,text,text,uuid[],jsonb) from public,anon;
grant execute on function public.kairo_save_media_set(uuid,uuid,text,text,uuid[],jsonb) to authenticated;
