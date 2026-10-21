-- KAIRO media sets: versioned carousel/stories exports linked to contents.
-- Safe to apply after the core media_assets/contents/workspace schema.

create table if not exists public.kairo_media_sets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  content_id uuid references public.contents(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('carousel','stories')),
  title text not null,
  asset_ids uuid[] not null,
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (cardinality(asset_ids) between 1 and 10),
  check (length(title) between 1 and 150),
  check (octet_length(design::text) <= 100000)
);

create index if not exists kairo_media_sets_business_created_idx
  on public.kairo_media_sets(business_id, created_at desc);
create index if not exists kairo_media_sets_content_created_idx
  on public.kairo_media_sets(content_id, created_at desc)
  where content_id is not null;

alter table public.kairo_media_sets enable row level security;
revoke all on public.kairo_media_sets from anon, authenticated;
grant select on public.kairo_media_sets to authenticated;
grant all on public.kairo_media_sets to service_role;

drop policy if exists kairo_media_sets_team_read on public.kairo_media_sets;
create policy kairo_media_sets_team_read
  on public.kairo_media_sets
  for select to authenticated
  using (kairo_private.can_work(business_id));

create or replace function kairo_private.save_media_set(
  p_business_id uuid,
  p_content_id uuid,
  p_kind text,
  p_title text,
  p_asset_ids uuid[],
  p_design jsonb
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid;
  v_content public.contents%rowtype;
  v_asset_count integer;
begin
  if not kairo_private.can_work(p_business_id) then
    raise exception 'Workspace non disponibile';
  end if;

  if p_kind not in ('carousel','stories')
     or length(trim(coalesce(p_title,''))) not between 1 and 150
     or p_asset_ids is null
     or cardinality(p_asset_ids) not between 1 and 10
     or p_design is null
     or octet_length(p_design::text) > 100000 then
    raise exception 'Media set non valido';
  end if;

  select count(*) into v_asset_count
  from public.media_assets a
  where a.id = any(p_asset_ids)
    and a.business_id = p_business_id
    and a.kind = 'image';

  if v_asset_count <> cardinality(p_asset_ids) then
    raise exception 'Uno o piu media non sono disponibili';
  end if;

  if p_content_id is not null then
    select * into v_content
    from public.contents
    where id = p_content_id and business_id = p_business_id
    for update;

    if v_content.id is null then
      raise exception 'Contenuto non disponibile';
    end if;

    if v_content.status = 'published' then
      raise exception 'Il contenuto e pubblicato: crea una nuova bozza';
    end if;
  end if;

  insert into public.kairo_media_sets(
    business_id, content_id, created_by, kind, title, asset_ids, design
  ) values (
    p_business_id, p_content_id, auth.uid(), p_kind, trim(p_title), p_asset_ids, p_design
  ) returning id into v_id;

  if p_content_id is not null then
    update public.contents
    set format = case when p_kind='carousel' then 'carousel' else 'stories' end,
        metadata = coalesce(metadata,'{}'::jsonb)
          || jsonb_build_object(
               'media_set_id', v_id,
               'media_asset_ids', to_jsonb(p_asset_ids),
               'media_asset_id', p_asset_ids[1],
               'media_kind', 'image'
             ),
        updated_at = now()
    where id = p_content_id and business_id = p_business_id;
  end if;

  return v_id;
end $$;

revoke all on function kairo_private.save_media_set(uuid,uuid,text,text,uuid[],jsonb) from public,anon;
grant execute on function kairo_private.save_media_set(uuid,uuid,text,text,uuid[],jsonb) to authenticated;

create or replace function public.kairo_save_media_set(
  p_business_id uuid,
  p_content_id uuid,
  p_kind text,
  p_title text,
  p_asset_ids uuid[],
  p_design jsonb
) returns uuid
language sql
security invoker
set search_path=''
as $$
  select kairo_private.save_media_set(p_business_id,p_content_id,p_kind,p_title,p_asset_ids,p_design);
$$;

revoke all on function public.kairo_save_media_set(uuid,uuid,text,text,uuid[],jsonb) from public,anon;
grant execute on function public.kairo_save_media_set(uuid,uuid,text,text,uuid[],jsonb) to authenticated;
