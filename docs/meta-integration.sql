
create table if not exists public.meta_publish_jobs(
 id uuid primary key default gen_random_uuid(),
 content_id uuid not null references public.contents(id) on delete cascade,
 connection_id uuid not null references public.social_connections(id) on delete cascade,
 status text not null default 'processing' check(status in ('processing','pending','published','failed','uncertain')),
 asset_id uuid references public.media_assets(id) on delete set null,
 container_id text, external_post_id text, error_message text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(content_id,connection_id)
);
alter table public.meta_publish_jobs enable row level security;
revoke all on public.meta_publish_jobs from anon,authenticated;
grant all on public.meta_publish_jobs to service_role;
create policy meta_jobs_owner_read on public.meta_publish_jobs for select to authenticated using(
 exists(select 1 from public.contents c join public.businesses b on b.id=c.business_id where c.id=content_id and b.owner_id=auth.uid())
);
grant select on public.meta_publish_jobs to authenticated;
create index if not exists meta_publish_jobs_connection_idx on public.meta_publish_jobs(connection_id);

create or replace function public.kairo_claim_meta_state(p_state text)
returns table(business_id uuid,exchange_token text)
language plpgsql security definer set search_path = '' as $$
declare v_exchange text:=gen_random_uuid()::text;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required'; end if;
 return query update public.meta_oauth_states s set exchange_token=v_exchange
 where s.state=p_state and s.used_at is null and s.exchange_token is null and s.expires_at>now()
 returning s.business_id,s.exchange_token;
end; $$;
revoke all on function public.kairo_claim_meta_state(text) from public,anon,authenticated;
grant execute on function public.kairo_claim_meta_state(text) to service_role;

create or replace function public.kairo_complete_meta_oauth(p_exchange_token text,p_pages jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_state public.meta_oauth_states%rowtype; v_item jsonb; v_secret uuid; v_id text; v_name text; v_platform text; v_count int:=0;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'service role required'; end if;
 select * into v_state from public.meta_oauth_states where exchange_token=p_exchange_token and used_at is null and expires_at>now() for update;
 if v_state.id is null then raise exception 'OAuth scaduto o gia utilizzato'; end if;
 for v_item in select value from jsonb_array_elements(p_pages) loop
  if nullif(v_item->>'page_token','') is null then continue; end if;
  foreach v_platform in array array['facebook','instagram'] loop
   v_id:=case when v_platform='facebook' then v_item->>'page_id' else v_item->>'ig_id' end;
   v_name:=case when v_platform='facebook' then v_item->>'page_name' else v_item->>'ig_name' end;
   if nullif(v_id,'') is null then continue; end if;
   select token_secret_id into v_secret from public.social_connections where business_id=v_state.business_id and platform=v_platform and external_account_id=v_id;
   if v_secret is null then
    v_secret:=vault.create_secret(v_item->>'page_token',null,'KAIRO Meta token');
   else
    perform vault.update_secret(v_secret,v_item->>'page_token');
   end if;
   insert into public.social_connections(business_id,platform,external_account_id,account_name,status,metadata,token_secret_id,updated_at)
   values(v_state.business_id,v_platform,v_id,coalesce(v_name,v_platform),'connected',jsonb_build_object('source','meta_oauth','facebook_page_id',v_item->>'page_id'),v_secret,now())
   on conflict (business_id,platform,external_account_id) where external_account_id is not null do update
   set account_name=excluded.account_name,status='connected',metadata=excluded.metadata,token_secret_id=excluded.token_secret_id,updated_at=now();
   v_count:=v_count+1;
  end loop;
 end loop;
 update public.meta_oauth_states set used_at=now() where id=v_state.id;
 return v_count;
end; $$;
revoke all on function public.kairo_complete_meta_oauth(text,jsonb) from public,anon,authenticated;
grant execute on function public.kairo_complete_meta_oauth(text,jsonb) to service_role;

do $$
declare f record;
begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in ('kairo_callback_lookup','kairo_callback_mark2','kairo_callback_store3','kairo_claim_meta_oauth','kairo_create_meta_oauth_bundle','kairo_prepare_meta_oauth','kairo_start_meta_oauth')
 loop execute format('revoke all on function %s from public,anon,authenticated',f.signature); execute format('grant execute on function %s to service_role',f.signature); end loop;
end; $$;
revoke insert,update,delete on public.social_connections from anon,authenticated;
create or replace function public.kairo_create_meta_state()
returns text language plpgsql security definer set search_path='' as $$
declare v_business uuid; v_state text;
begin
 if auth.uid() is null then raise exception 'Sessione richiesta'; end if;
 select id into v_business from public.businesses where owner_id=auth.uid() order by created_at desc limit 1;
 if v_business is null then raise exception 'Attivita non trovata'; end if;
 v_state:=gen_random_uuid()::text;
 insert into public.meta_oauth_states(user_id,business_id,state,callback_token) values(auth.uid(),v_business,v_state,gen_random_uuid()::text);
 return v_state;
end; $$;
revoke all on function public.kairo_create_meta_state() from public,anon;
grant execute on function public.kairo_create_meta_state() to authenticated;
