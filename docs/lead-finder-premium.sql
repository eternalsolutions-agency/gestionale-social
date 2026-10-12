
create schema if not exists kairo_private;
revoke all on schema kairo_private from public,anon,authenticated;
create table kairo_private.lead_limits(id boolean primary key default true check(id),searches integer not null default 30 check(searches>0),saves integer not null default 100 check(saves>0));
insert into kairo_private.lead_limits(id) values(true);
create table kairo_private.lead_provider_gate(id boolean primary key default true check(id),last_at timestamptz not null default '-infinity');
insert into kairo_private.lead_provider_gate(id) values(true);
create table public.kairo_lead_searches(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null references public.businesses(id) on delete cascade,sector text not null,city text not null,radius integer not null check(radius in(10,25,50)),created_at timestamptz not null default now());
create index kairo_lead_searches_owner_date on public.kairo_lead_searches(owner_id,created_at);
create table public.kairo_leads(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,business_id uuid not null references public.businesses(id) on delete cascade,source text not null check(source in('osm','manual')),source_id text not null,name text not null check(length(name) between 1 and 200),category text,city text,address text,website text,phone text,email text,social jsonb not null default '{}',source_url text,stage text not null default 'found' check(stage in('found','to_contact','contacted','interested','proposal','customer')),notes text not null default '',follow_up date,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(business_id,source,source_id));
create index kairo_leads_owner_business on public.kairo_leads(owner_id,business_id,created_at);
create table kairo_private.lead_saves(owner_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create index lead_saves_owner_date on kairo_private.lead_saves(owner_id,created_at);
alter table public.kairo_leads enable row level security;
alter table public.kairo_lead_searches enable row level security;
alter table kairo_private.lead_limits enable row level security;
alter table kairo_private.lead_provider_gate enable row level security;
alter table kairo_private.lead_saves enable row level security;
create or replace function public.kairo_lead_is_premium() returns boolean language sql stable security definer set search_path='' as $$
select auth.uid() is not null and exists(select 1 from public.subscriptions s where s.user_id=auth.uid() and lower(s.plan)='premium' and s.status in('active','trialing') and(s.current_period_end is null or s.current_period_end>now()));
$$;
revoke all on function public.kairo_lead_is_premium() from public,anon;
grant execute on function public.kairo_lead_is_premium() to authenticated;
create policy kairo_leads_read on public.kairo_leads for select to authenticated using(owner_id=(select auth.uid()) and (select public.kairo_lead_is_premium()));
create policy kairo_lead_searches_read on public.kairo_lead_searches for select to authenticated using(owner_id=(select auth.uid()) and (select public.kairo_lead_is_premium()));
grant select on public.kairo_leads,public.kairo_lead_searches to authenticated;
revoke insert,update,delete on public.kairo_leads,public.kairo_lead_searches from authenticated,anon;
grant all on public.kairo_leads,public.kairo_lead_searches to service_role;

create or replace function public.kairo_lead_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare lim kairo_private.lead_limits%rowtype; m timestamptz:=date_trunc('month',now() at time zone 'Europe/Rome') at time zone 'Europe/Rome';
begin
if auth.uid() is null then raise exception 'Accedi a KAIRO.';end if;
select * into lim from kairo_private.lead_limits where id=true;
return jsonb_build_object('premium',public.kairo_lead_is_premium(),'search_limit',lim.searches,'save_limit',lim.saves,'searches_used',(select count(*) from public.kairo_lead_searches where owner_id=auth.uid() and created_at>=m),'saves_used',(select count(*) from kairo_private.lead_saves where owner_id=auth.uid() and created_at>=m),'resets_at',((m at time zone 'Europe/Rome')+interval '1 month') at time zone 'Europe/Rome');
end;$$;
create or replace function public.kairo_lead_reserve_search(p_business_id uuid,p_sector text,p_city text,p_radius integer) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; lim integer; used integer; prev timestamptz; m timestamptz:=date_trunc('month',now() at time zone 'Europe/Rome') at time zone 'Europe/Rome';
begin
if not public.kairo_lead_is_premium() then raise exception 'Lead Finder richiede un piano Premium attivo.';end if;
if not exists(select 1 from public.businesses where id=p_business_id and owner_id=auth.uid()) then raise exception 'Workspace non valido.';end if;
if length(trim(p_sector)) not between 2 and 80 or length(trim(p_city)) not between 2 and 120 or p_radius not in(10,25,50) or p_sector is null or p_city is null or p_radius is null then raise exception 'Settore, zona o raggio non validi.';end if;
perform pg_advisory_xact_lock(hashtextextended('kairo-lead-'||auth.uid()::text,0));
select searches into lim from kairo_private.lead_limits where id=true;
select count(*),max(created_at) into used,prev from public.kairo_lead_searches where owner_id=auth.uid() and created_at>=m;
if used>=lim then raise exception 'Limite mensile di ricerche raggiunto.';end if;
if prev>now()-interval '10 seconds' then raise exception 'Attendi 10 secondi tra le ricerche.';end if;
select last_at into prev from kairo_private.lead_provider_gate where id=true for update;
if prev>clock_timestamp()-interval '2 seconds' then raise exception 'Ricerca occupata. Riprova tra qualche secondo.';end if;
update kairo_private.lead_provider_gate set last_at=clock_timestamp() where id=true;
insert into public.kairo_lead_searches(owner_id,business_id,sector,city,radius) values(auth.uid(),p_business_id,trim(p_sector),trim(p_city),p_radius) returning id into rid;
return rid;
end;$$;
create or replace function public.kairo_lead_save(p_business_id uuid,p_lead jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare rid uuid; src text:=coalesce(p_lead->>'source','manual'); sid text; lim integer; m timestamptz:=date_trunc('month',now() at time zone 'Europe/Rome') at time zone 'Europe/Rome';
begin
if not public.kairo_lead_is_premium() then raise exception 'Lead Finder richiede un piano Premium attivo.';end if;
if not exists(select 1 from public.businesses where id=p_business_id and owner_id=auth.uid()) then raise exception 'Workspace non valido.';end if;
if p_lead is null or octet_length(p_lead::text)>32000 or length(trim(coalesce(p_lead->>'name',''))) not between 1 and 200 or src not in('osm','manual') then raise exception 'Contatto non valido.';end if;
if coalesce(p_lead->>'website','')<>'' and(p_lead->>'website')!~* '^https?://' then raise exception 'Sito non valido.';end if;
if coalesce(p_lead->>'source_url','')<>'' and(p_lead->>'source_url')!~* '^https?://' then raise exception 'Fonte non valida.';end if;
if length(coalesce(p_lead->>'notes',''))>10000 then raise exception 'Note troppo lunghe.';end if;
sid:=case when src='osm' then p_lead->>'source_id' else md5(lower(trim(p_lead->>'name'))||'|'||lower(trim(coalesce(p_lead->>'city','')))||'|'||lower(trim(coalesce(p_lead->>'website','')))||'|'||trim(coalesce(p_lead->>'phone',''))) end;
if sid is null or length(sid)>250 or (src='osm' and sid!~'^(node|way|relation)/[0-9]+$') then raise exception 'Identificativo fonte non valido.';end if;
perform pg_advisory_xact_lock(hashtextextended('kairo-lead-'||auth.uid()::text,0));
select id into rid from public.kairo_leads where business_id=p_business_id and source=src and source_id=sid;
if rid is not null then return rid;end if;
select saves into lim from kairo_private.lead_limits where id=true;
if (select count(*) from kairo_private.lead_saves where owner_id=auth.uid() and created_at>=m)>=lim then raise exception 'Limite mensile di nuovi contatti raggiunto.';end if;
insert into public.kairo_leads(owner_id,business_id,source,source_id,name,category,city,address,website,phone,email,social,source_url)
values(auth.uid(),p_business_id,src,sid,trim(p_lead->>'name'),left(p_lead->>'category',100),left(p_lead->>'city',200),left(p_lead->>'address',500),left(p_lead->>'website',2000),left(p_lead->>'phone',100),left(p_lead->>'email',250),coalesce(p_lead->'social','{}'),left(p_lead->>'source_url',2000)) returning id into rid;
insert into kairo_private.lead_saves(owner_id) values(auth.uid());return rid;
end;$$;
create or replace function public.kairo_lead_update(p_id uuid,p_stage text,p_notes text,p_follow_up date) returns void language plpgsql security definer set search_path='' as $$
begin
if not public.kairo_lead_is_premium() then raise exception 'Lead Finder richiede un piano Premium attivo.';end if;
if p_stage not in('found','to_contact','contacted','interested','proposal','customer') or p_stage is null or length(coalesce(p_notes,''))>10000 then raise exception 'Stato o note non validi.';end if;
update public.kairo_leads set stage=p_stage,notes=coalesce(p_notes,''),follow_up=p_follow_up,updated_at=now() where id=p_id and owner_id=auth.uid();
if not found then raise exception 'Contatto non trovato.';end if;
end;$$;
create or replace function public.kairo_lead_delete(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
if not public.kairo_lead_is_premium() then raise exception 'Lead Finder richiede un piano Premium attivo.';end if;
delete from public.kairo_leads where id=p_id and owner_id=auth.uid();
if not found then raise exception 'Contatto non trovato.';end if;
end;$$;
revoke all on function public.kairo_lead_access(),public.kairo_lead_reserve_search(uuid,text,text,integer),public.kairo_lead_save(uuid,jsonb),public.kairo_lead_update(uuid,text,text,date),public.kairo_lead_delete(uuid) from public,anon;
grant execute on function public.kairo_lead_access(),public.kairo_lead_reserve_search(uuid,text,text,integer),public.kairo_lead_save(uuid,jsonb),public.kairo_lead_update(uuid,text,text,date),public.kairo_lead_delete(uuid) to authenticated;
