alter table kairo_private.ai_quota_ledger drop constraint if exists ai_quota_ledger_category_check;
alter table kairo_private.ai_quota_ledger add constraint ai_quota_ledger_category_check check(category in ('texts','images','edits','videos'));

create or replace function kairo_private.ai_cap(p_plan text,p_category text) returns int language sql immutable set search_path='' as $$
 select case p_category
  when 'texts' then case p_plan when 'premium' then 800 when 'pro' then 300 else 100 end
  when 'images' then case p_plan when 'premium' then 300 when 'pro' then 150 else 50 end
  when 'edits' then case p_plan when 'premium' then 60 when 'pro' then 30 else 10 end
  when 'videos' then case p_plan when 'premium' then 25 when 'pro' then 10 else 0 end
  else 0 end;
$$;

create or replace function kairo_private.reserve_copy_quota(p_business uuid) returns uuid language plpgsql security definer set search_path='' as $$
 declare v_owner uuid;v_period date:=date_trunc('month',now() at time zone 'Europe/Rome')::date;v_plan text;v_cap int;v_count int;v_id uuid;
 begin
  if auth.uid() is null or not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
  select owner_id into v_owner from public.businesses where id=p_business;
  if v_owner is null then raise exception 'Workspace non disponibile';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_owner::text||v_period::text||'texts',0));
  v_plan:=kairo_private.ai_plan(v_owner);v_cap:=kairo_private.ai_cap(v_plan,'texts');
  select count(*) into v_count from kairo_private.ai_quota_ledger where account_id=v_owner and period=v_period and category='texts' and state in ('reserved','used');
  if v_count>=v_cap then raise exception 'Quota testi AI esaurita per il piano %. Disponibili % al mese.',v_plan,v_cap;end if;
  insert into kairo_private.ai_quota_ledger(account_id,business_id,category,period,state) values(v_owner,p_business,'texts',v_period,'reserved') returning id into v_id;
  return v_id;
 end $$;

create or replace function kairo_private.settle_copy_quota(p_reservation uuid,p_success boolean) returns void language plpgsql security definer set search_path='' as $$
 begin
  if auth.uid() is null then raise exception 'Sessione richiesta';end if;
  update kairo_private.ai_quota_ledger q set state=case when p_success then 'used' else 'released' end
  where q.id=p_reservation and q.category='texts' and q.state='reserved' and q.account_id=(select b.owner_id from public.businesses b where b.id=q.business_id and kairo_private.can_work(b.id));
 end $$;

create or replace function public.kairo_reserve_copy_quota(p_business uuid) returns uuid language sql security invoker set search_path='' as $$ select kairo_private.reserve_copy_quota(p_business); $$;
create or replace function public.kairo_settle_copy_quota(p_reservation uuid,p_success boolean) returns void language sql security invoker set search_path='' as $$ select kairo_private.settle_copy_quota(p_reservation,p_success); $$;

create or replace function kairo_private.quota_summary(p_business uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare v_owner uuid;v_plan text;v_period date:=date_trunc('month',now() at time zone 'Europe/Rome')::date;v_category text;v_used int;v_reserved int;v_cap int;v_result jsonb:='{}';
 begin
  if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
  select owner_id into v_owner from public.businesses where id=p_business;v_plan:=kairo_private.ai_plan(v_owner);
  foreach v_category in array array['texts','images','edits','videos'] loop
   select count(*) filter(where state='used'),count(*) filter(where state='reserved') into v_used,v_reserved from kairo_private.ai_quota_ledger where account_id=v_owner and period=v_period and category=v_category;
   v_cap:=kairo_private.ai_cap(v_plan,v_category);v_result:=v_result||jsonb_build_object(v_category,jsonb_build_object('limit',v_cap,'used',v_used,'reserved',v_reserved,'remaining',greatest(0,v_cap-v_used-v_reserved)));
  end loop;
  return jsonb_build_object('plan',v_plan,'period_start',v_period,'resets_at',(v_period+interval '1 month') at time zone 'Europe/Rome','shared',true,'quotas',v_result);
 end $$;

revoke all on function kairo_private.reserve_copy_quota(uuid),kairo_private.settle_copy_quota(uuid,boolean),public.kairo_reserve_copy_quota(uuid),public.kairo_settle_copy_quota(uuid,boolean) from public,anon;
grant execute on function kairo_private.reserve_copy_quota(uuid),kairo_private.settle_copy_quota(uuid,boolean),public.kairo_reserve_copy_quota(uuid),public.kairo_settle_copy_quota(uuid,boolean) to authenticated;