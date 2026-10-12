-- RP Social · AI Studio Phase 1
-- REVIEW BEFORE RUNNING IN SUPABASE.
-- This file is intentionally not executed automatically.

create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  brand_name text,
  industry text,
  target_audience text,
  tone_of_voice text,
  website text,
  social_links jsonb not null default '{}'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  fonts jsonb not null default '[]'::jsonb,
  cta text,
  visual_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  content_id uuid,
  kind text not null default 'image',
  source text not null default 'upload',
  title text,
  storage_path text,
  public_url text,
  mime_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  owner_id uuid not null,
  content_id uuid,
  generation_type text not null,
  prompt text not null,
  provider text,
  model text,
  status text not null default 'queued',
  output_asset_id uuid,
  estimated_cost numeric(10,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.brand_profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.ai_generations enable row level security;

create policy "brand_profiles_owner_all" on public.brand_profiles for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "media_assets_owner_all" on public.media_assets for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "ai_generations_owner_all" on public.ai_generations for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Suggested Storage bucket: rp-social-media
-- Suggested path convention: {owner_id}/{business_id}/{asset_id-or-filename}
