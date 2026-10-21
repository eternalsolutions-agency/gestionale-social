create table kairo_private.ai_quota_ledger (
 id uuid primary key default gen_random_uuid(), generation_id uuid unique references public.ai_generations(id) on delete set null,
 account_id uuid not null references auth.users(id) on delete cascade, business_id uuid references public.businesses(id) on delete set null,
 category text not null check(category in ('images','edits','videos')), period date not null,
 state text not null check(state in ('reserved','used','released')), created_at timestamptz not null default now()
);
create index ai_quota_account_period on kairo_private.ai_quota_ledger(account_id,period,category,state);
alter table kairo_private.ai_quota_ledger enable row level security;
revoke all on kairo_private.ai_quota_ledger from public,anon,authenticated;
create or replace function kairo_private.ai_plan(p_account uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select lower(plan) from public.subscriptions where user_id=p_account and status in ('active','trialing') and (current_period_end is null or current_period_end>now()) and lower(plan) in ('start','pro','premium') order by created_at desc limit 1),'start');
$$;
create or replace function kairo_private.ai_cap(p_plan text,p_category text) returns int language sql immutable set search_path='' as $$
 select case p_category when 'images' then case p_plan when 'premium' then 300 when 'pro' then 150 else 50 end when 'edits' then case p_plan when 'premium' then 60 when 'pro' then 30 else 10 end when 'videos' then case p_plan when 'premium' then 25 when 'pro' then 10 else 0 end else 0 end;
$$;
insert into kairo_private.ai_quota_ledger(generation_id,account_id,business_id,category,period,state,created_at)
 select g.id,b.owner_id,g.business_id,case when g.generation_type='image_to_video' then 'videos' when g.generation_type in ('edit','product','background') then 'edits' else 'images' end,date_trunc('month',g.created_at at time zone 'Europe/Rome')::date,case when g.status='completed' then 'used' when g.status='failed' and not exists(select 1 from public.kairo_video_requests r where r.generation_id=g.id and r.state='uncertain') then 'released' else 'reserved' end,g.created_at from public.ai_generations g join public.businesses b on b.id=g.business_id;
create or replace function kairo_private.reserve_ai_quota() returns trigger language plpgsql security definer set search_path='' as $$
 declare v_owner uuid;v_category text;v_period date:=date_trunc('month',now() at time zone 'Europe/Rome')::date;v_plan text;v_cap int;v_count int;
 begin
 select owner_id into v_owner from public.businesses where id=new.business_id;
 if v_owner is null then raise exception 'Workspace non disponibile';end if;
 if new.generation_type not in ('image','social_image','post','adv','edit','product','background','image_to_video') then raise exception 'Tipo di generazione non supportato';end if;
 v_category:=case when new.generation_type='image_to_video' then 'videos' when new.generation_type in ('edit','product','background') then 'edits' else 'images' end;
 perform pg_advisory_xact_lock(hashtextextended(v_owner::text||v_period::text,0));
 v_plan:=kairo_private.ai_plan(v_owner);v_cap:=kairo_private.ai_cap(v_plan,v_category);
 select count(*) into v_count from kairo_private.ai_quota_ledger where account_id=v_owner and period=v_period and category=v_category and state in ('reserved','used');
 if v_count>=v_cap then raise exception 'Quota % esaurita per il piano %. Disponibili % al mese.',v_category,v_plan,v_cap;end if;
 insert into kairo_private.ai_quota_ledger(generation_id,account_id,business_id,category,period,state) values(new.id,v_owner,new.business_id,v_category,v_period,'reserved');return new;
 end $$;
create trigger ai_quota_reserve after insert on public.ai_generations for each row execute function kairo_private.reserve_ai_quota();
create or replace function kairo_private.settle_ai_quota() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.status='completed' then update kairo_private.ai_quota_ledger set state='used' where generation_id=new.id and state='reserved';
 elsif new.status='failed' and not exists(select 1 from public.kairo_video_requests r where r.generation_id=new.id and r.state='uncertain') then update kairo_private.ai_quota_ledger set state='released' where generation_id=new.id and state='reserved';end if;return new;end $$;
create trigger ai_quota_settle after update of status on public.ai_generations for each row execute function kairo_private.settle_ai_quota();
create or replace function kairo_private.release_failed_video_quota() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.state='failed' then update kairo_private.ai_quota_ledger set state='released' where generation_id=new.generation_id and state='reserved';end if;return new;end $$;
create trigger video_quota_settle after update of state on public.kairo_video_requests for each row execute function kairo_private.release_failed_video_quota();
revoke insert,update,delete on public.ai_generations from authenticated,anon;
drop policy ai_generations_insert_own on public.ai_generations;
drop policy ai_generations_update_own on public.ai_generations;
drop policy ai_generations_delete_own on public.ai_generations;
create or replace function kairo_private.create_ai_generation(p_business_id uuid,p_content_id uuid,p_generation_type text,p_prompt text,p_metadata jsonb default '{}'::jsonb) returns public.ai_generations language plpgsql security definer set search_path='' as $$ declare v_row public.ai_generations;begin
 if auth.uid() is null or not kairo_private.can_work(p_business_id) then raise exception 'Workspace non disponibile';end if;
 if p_generation_type not in ('image','social_image','post','adv','edit','product','background') then raise exception 'Tipo di generazione non supportato';end if;
 if length(trim(p_prompt))<3 or length(p_prompt)>10000 or octet_length(coalesce(p_metadata,'{}'::jsonb)::text)>20000 then raise exception 'Richiesta non valida';end if;
 if p_content_id is not null and not exists(select 1 from public.contents where id=p_content_id and business_id=p_business_id) then raise exception 'Contenuto non disponibile';end if;
 insert into public.ai_generations(business_id,owner_id,content_id,generation_type,prompt,status,metadata) values(p_business_id,auth.uid(),p_content_id,p_generation_type,p_prompt,'queued',coalesce(p_metadata,'{}'::jsonb)) returning * into v_row;return v_row;end $$;
create or replace function public.create_ai_generation(p_business_id uuid,p_content_id uuid,p_generation_type text,p_prompt text,p_metadata jsonb default '{}'::jsonb) returns public.ai_generations language sql security invoker set search_path='' as $$ select kairo_private.create_ai_generation(p_business_id,p_content_id,p_generation_type,p_prompt,p_metadata); $$;
create or replace function kairo_private.quota_summary(p_business uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare v_owner uuid;v_plan text;v_period date:=date_trunc('month',now() at time zone 'Europe/Rome')::date;v_category text;v_used int;v_reserved int;v_cap int;v_result jsonb:='{}';
 begin
 if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
 select owner_id into v_owner from public.businesses where id=p_business;v_plan:=kairo_private.ai_plan(v_owner);
 foreach v_category in array array['images','edits','videos'] loop
 select count(*) filter(where state='used'),count(*) filter(where state='reserved') into v_used,v_reserved from kairo_private.ai_quota_ledger where account_id=v_owner and period=v_period and category=v_category;
 v_cap:=kairo_private.ai_cap(v_plan,v_category);v_result:=v_result||jsonb_build_object(v_category,jsonb_build_object('limit',v_cap,'used',v_used,'reserved',v_reserved,'remaining',greatest(0,v_cap-v_used-v_reserved)));
 end loop;
 return jsonb_build_object('plan',v_plan,'period_start',v_period,'resets_at',(v_period+interval '1 month') at time zone 'Europe/Rome','shared',true,'quotas',v_result);
 end $$;
create or replace function public.kairo_ai_quotas(p_business uuid) returns jsonb language sql security invoker set search_path='' as $$ select kairo_private.quota_summary(p_business); $$;
revoke all on function kairo_private.ai_plan(uuid),kairo_private.ai_cap(text,text),kairo_private.create_ai_generation(uuid,uuid,text,text,jsonb),kairo_private.quota_summary(uuid),public.kairo_ai_quotas(uuid),public.create_ai_generation(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function kairo_private.create_ai_generation(uuid,uuid,text,text,jsonb),kairo_private.quota_summary(uuid),public.kairo_ai_quotas(uuid),public.create_ai_generation(uuid,uuid,text,text,jsonb) to authenticated;
