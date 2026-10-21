begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('91000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reel-owner-test@example.invalid','',now(),'{}','{}'),
('91000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','reel-member-test@example.invalid','',now(),'{}','{}');
insert into public.businesses(id,owner_id,name,onboarding_completed) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Reel test',true);
insert into public.kairo_team_members(business_id,user_id) values('92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002');
insert into public.media_assets(id,business_id,owner_id,kind,source,title,storage_path,mime_type,metadata) values
('93000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','image','upload','Photo','91000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000001/photo.jpg','image/jpeg','{}'),
('93000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','video','upload','Source','91000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000001/source.webm','video/webm','{"internal_reel_source":true}'),
('93000000-0000-4000-8000-000000000003','92000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','video','upload','Source member','91000000-0000-4000-8000-000000000002/92000000-0000-4000-8000-000000000001/source.webm','video/webm','{"internal_reel_source":true}');
select set_config('reel.test.design',jsonb_build_object('template','vetrina','duration',30,'scenes',(select jsonb_agg(jsonb_build_object('assetId','93000000-0000-4000-8000-000000000001','heading','Scene','body','Test')) from generate_series(1,6)))::text,true);
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);set local role authenticated;
select set_config('reel.test.gen',(public.kairo_reserve_reel_render('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','Test reel',current_setting('reel.test.design')::jsonb,'94000000-0000-4000-8000-000000000001')->>'generation_id'),true);
select public.kairo_reserve_reel_render('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','Test reel',current_setting('reel.test.design')::jsonb,'94000000-0000-4000-8000-000000000001');
do $$declare q jsonb;denied boolean:=false;begin q:=public.kairo_ai_quotas('92000000-0000-4000-8000-000000000001');if (q#>>'{quotas,reels,remaining}')::int<>3 or (q#>>'{quotas,images,remaining}')::int<>50 then raise exception 'Montage quota mixed or duplicated';end if;begin perform public.kairo_finish_reel_result(current_setting('reel.test.gen')::uuid,gen_random_uuid(),'bad');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Client can finish render';end if;end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select set_config('reel.test.member_gen',(public.kairo_reserve_reel_render('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000003','Member reel',current_setting('reel.test.design')::jsonb,'94000000-0000-4000-8000-000000000002')->>'generation_id'),true);
reset role;
update public.kairo_reel_renders set state='uncertain' where generation_id=current_setting('reel.test.member_gen')::uuid;
update public.ai_generations set status='failed' where id=current_setting('reel.test.member_gen')::uuid;
do $$begin if (kairo_private.quota_summary('92000000-0000-4000-8000-000000000001')#>>'{quotas,reels,reserved}')::int<>2 then raise exception 'Uncertain render wrongly refunded';end if;end $$;
update public.kairo_reel_renders set state='failed' where generation_id=current_setting('reel.test.member_gen')::uuid;
update public.ai_generations set status='failed' where id=current_setting('reel.test.member_gen')::uuid;
update public.kairo_reel_renders set state='active' where generation_id=current_setting('reel.test.gen')::uuid;
select set_config('reel.test.lease',(public.kairo_claim_reel_result(current_setting('reel.test.gen')::uuid)).lease_token::text,true);
do $$begin if (public.kairo_claim_reel_result(current_setting('reel.test.gen')::uuid)).generation_id is not null then raise exception 'Concurrent result claim';end if;end $$;
select set_config('reel.test.asset',public.kairo_finish_reel_result(current_setting('reel.test.gen')::uuid,current_setting('reel.test.lease')::uuid,'91000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000001/reel-'||current_setting('reel.test.gen')||'.mp4')::text,true);
select public.kairo_finish_reel_result(current_setting('reel.test.gen')::uuid,current_setting('reel.test.lease')::uuid,'91000000-0000-4000-8000-000000000001/92000000-0000-4000-8000-000000000001/reel-'||current_setting('reel.test.gen')||'.mp4');
do $$begin if (select count(*) from public.media_assets where metadata->>'generation_id'=current_setting('reel.test.gen'))<>1 then raise exception 'Duplicate output asset';end if;end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);set local role authenticated;
select public.kairo_external_content('92000000-0000-4000-8000-000000000001',current_setting('reel.test.asset')::uuid,'Publish reel','Caption','reel');
do $$declare i int;denied boolean:=false;begin for i in 1..3 loop perform public.kairo_reserve_reel_render('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','Extra',current_setting('reel.test.design')::jsonb,gen_random_uuid());end loop;begin perform public.kairo_reserve_reel_render('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000002','Over limit',current_setting('reel.test.design')::jsonb,gen_random_uuid());exception when others then denied:=true;end;if not denied then raise exception 'Montage limit bypass';end if;end $$;
reset role;
do $$begin if kairo_private.ai_cap('pro','reels')<>10 or kairo_private.ai_cap('premium','reels')<>20 then raise exception 'Plan montage caps';end if;if has_function_privilege('anon','public.kairo_reserve_reel_render(uuid,uuid,text,jsonb,uuid,uuid)','execute') then raise exception 'Anonymous render';end if;end $$;
select 'PASS: montage caps 4/10/20, separate clip quotas, shared team, reservation idempotency, uncertain hold, error refund, result lease, output idempotency, external publishing draft, limit and anonymous denial' as verification;
rollback;
