-- Sandbox only. No writes to public.subscriptions or production quota functions.
begin;
create table if not exists public.kairo_test_billing_accounts (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 customer_id text unique,
 subscription_id text unique,
 plan text check(plan in ('start','pro','premium')),
 billing_interval text check(billing_interval in ('month','year')),
 status text not null default 'none',
 cancel_at_period_end boolean not null default false,
 paid_until timestamptz,
 last_event_created bigint not null default 0,
 checkout_attempt uuid,
 checkout_plan text,
 checkout_interval text,
 checkout_session_id text,
 checkout_expires_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists public.kairo_test_billing_events (
 event_id text primary key,
 event_type text not null,
 event_created bigint not null,
 processed_at timestamptz not null default now()
);
alter table public.kairo_test_billing_accounts enable row level security;
alter table public.kairo_test_billing_events enable row level security;
revoke all on public.kairo_test_billing_accounts,public.kairo_test_billing_events from public,anon,authenticated;
grant all on public.kairo_test_billing_accounts,public.kairo_test_billing_events to service_role;
create or replace function public.kairo_test_checkout_claim(p_owner uuid,p_plan text,p_interval text)
returns jsonb language plpgsql set search_path='' as $$
declare r public.kairo_test_billing_accounts;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Accesso negato';end if;
 if p_plan not in ('start','pro','premium') or p_interval not in ('month','year') then raise exception 'Piano non valido';end if;
 insert into public.kairo_test_billing_accounts(owner_id) values(p_owner) on conflict do nothing;
 select * into r from public.kairo_test_billing_accounts where owner_id=p_owner for update;
 if r.subscription_id is not null and r.status not in ('canceled','incomplete_expired') then raise exception 'Hai già un abbonamento test. Usa Gestisci abbonamento.';end if;
 if r.checkout_attempt is not null and r.checkout_expires_at>now() then
  if r.checkout_plan<>p_plan or r.checkout_interval<>p_interval then raise exception 'Hai un checkout aperto per un altro piano. Annullalo prima di cambiarlo.';end if;
 else
  update public.kairo_test_billing_accounts set checkout_attempt=gen_random_uuid(),checkout_plan=p_plan,checkout_interval=p_interval,checkout_session_id=null,checkout_expires_at=now()+interval '24 hours',updated_at=now() where owner_id=p_owner returning * into r;
 end if;
 return to_jsonb(r);
end $$;
revoke all on function public.kairo_test_checkout_claim(uuid,text,text) from public,anon,authenticated;
grant execute on function public.kairo_test_checkout_claim(uuid,text,text) to service_role;
create or replace function public.kairo_test_billing_event(p_event_id text,p_type text,p_created bigint,p_snapshot jsonb)
returns text language plpgsql set search_path='' as $$
declare r public.kairo_test_billing_accounts; n integer;v_sub text:=p_snapshot->>'subscription_id';
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Accesso negato';end if;
 select * into r from public.kairo_test_billing_accounts where customer_id=p_snapshot->>'customer_id' for update;
 if not found or r.owner_id::text is distinct from p_snapshot->>'owner_id' then raise exception 'Cliente non associato';end if;
 insert into public.kairo_test_billing_events(event_id,event_type,event_created) values(p_event_id,p_type,p_created) on conflict do nothing;
 get diagnostics n=row_count;if n=0 then return 'duplicate';end if;
 if p_created<r.last_event_created then return 'stale';end if;
 if r.subscription_id is not null and r.subscription_id<>v_sub and r.status not in ('canceled','incomplete_expired') then return 'other_subscription';end if;
 if p_snapshot->>'plan' not in ('start','pro','premium') or p_snapshot->>'interval' not in ('month','year') then raise exception 'Piano non valido';end if;
 update public.kairo_test_billing_accounts set subscription_id=v_sub,plan=p_snapshot->>'plan',billing_interval=p_snapshot->>'interval',status=p_snapshot->>'status',cancel_at_period_end=coalesce((p_snapshot->>'cancel_at_period_end')::boolean,false),paid_until=case when r.subscription_id is distinct from v_sub then case when (p_snapshot->>'paid')::boolean then (p_snapshot->>'paid_until')::timestamptz else null end when (p_snapshot->>'paid')::boolean then greatest(paid_until,(p_snapshot->>'paid_until')::timestamptz) else paid_until end,last_event_created=p_created,checkout_attempt=null,checkout_session_id=null,checkout_expires_at=null,updated_at=now() where owner_id=r.owner_id;
 return 'processed';
end $$;
revoke all on function public.kairo_test_billing_event(text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.kairo_test_billing_event(text,text,bigint,jsonb) to service_role;
commit;
