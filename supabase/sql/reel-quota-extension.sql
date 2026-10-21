CREATE OR REPLACE FUNCTION kairo_private.quota_summary(p_business uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare v_owner uuid;v_plan text;v_period date:=date_trunc('month',now() at time zone 'Europe/Rome')::date;v_category text;v_used int;v_reserved int;v_cap int;v_result jsonb:='{}';
 begin
 if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
 select owner_id into v_owner from public.businesses where id=p_business;v_plan:=kairo_private.ai_plan(v_owner);
 foreach v_category in array array['images','edits','videos','reels'] loop
 select count(*) filter(where state='used'),count(*) filter(where state='reserved') into v_used,v_reserved from kairo_private.ai_quota_ledger where account_id=v_owner and period=v_period and category=v_category;
 v_cap:=kairo_private.ai_cap(v_plan,v_category);v_result:=v_result||jsonb_build_object(v_category,jsonb_build_object('limit',v_cap,'used',v_used,'reserved',v_reserved,'remaining',greatest(0,v_cap-v_used-v_reserved)));
 end loop;
 return jsonb_build_object('plan',v_plan,'period_start',v_period,'resets_at',(v_period+interval '1 month') at time zone 'Europe/Rome','shared',true,'quotas',v_result);
 end $function$;

CREATE OR REPLACE FUNCTION kairo_private.reserve_ai_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 declare v_owner uuid;v_category text;v_period date:=date_trunc('month',now() at time zone 'Europe/Rome')::date;v_plan text;v_cap int;v_count int;
 begin
 select owner_id into v_owner from public.businesses where id=new.business_id;
 if v_owner is null then raise exception 'Workspace non disponibile';end if;
 if new.generation_type not in ('image','social_image','post','adv','edit','product','background','image_to_video','reel_montage') then raise exception 'Tipo di generazione non supportato';end if;
 v_category:=case when new.generation_type='reel_montage' then 'reels' when new.generation_type='image_to_video' then 'videos' when new.generation_type in ('edit','product','background') then 'edits' else 'images' end;
 perform pg_advisory_xact_lock(hashtextextended(v_owner::text||v_period::text,0));
 v_plan:=kairo_private.ai_plan(v_owner);v_cap:=kairo_private.ai_cap(v_plan,v_category);
 select count(*) into v_count from kairo_private.ai_quota_ledger where account_id=v_owner and period=v_period and category=v_category and state in ('reserved','used');
 if v_count>=v_cap then raise exception 'Quota % esaurita per il piano %. Disponibili % al mese.',v_category,v_plan,v_cap;end if;
 insert into kairo_private.ai_quota_ledger(generation_id,account_id,business_id,category,period,state) values(new.id,v_owner,new.business_id,v_category,v_period,'reserved');return new;
 end $function$;

CREATE OR REPLACE FUNCTION kairo_private.settle_ai_quota()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
 if new.status='completed' then update kairo_private.ai_quota_ledger set state='used' where generation_id=new.id and state='reserved';
 elsif new.status='failed' and not exists(select 1 from public.kairo_video_requests r where r.generation_id=new.id and r.state='uncertain') and not exists(select 1 from public.kairo_reel_renders r where r.generation_id=new.id and r.state='uncertain') then update kairo_private.ai_quota_ledger set state='released' where generation_id=new.id and state='reserved';end if;return new;end $function$;

