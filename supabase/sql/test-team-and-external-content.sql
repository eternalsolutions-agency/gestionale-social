begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','team-owner-test@example.invalid','',now(),'{}','{}'),
('a1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','team-member-test@example.invalid','',now(),'{}','{}'),
('a1000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','team-other-test@example.invalid','',now(),'{}','{}');
insert into public.businesses(id,owner_id,name,onboarding_completed) values('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Team test',true),('b1000000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000003','Other test',true);
insert into public.media_assets(id,business_id,owner_id,kind,source,title,storage_path,mime_type) values('c1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','image','upload','Photo','a1000000-0000-4000-8000-000000000001/b1000000-0000-4000-8000-000000000001/photo.jpg','image/jpeg');
insert into public.social_connections(id,business_id,platform,external_account_id,account_name,status) values('d1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','facebook','test-never-post','Test channel','connected');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('kairo.test.invite',public.kairo_team_invite('b1000000-0000-4000-8000-000000000001','team-member-test@example.invalid'),true);
do $$declare ok boolean:=false;begin
 begin perform public.kairo_team_invite('b1000000-0000-4000-8000-000000000001','second@example.invalid');exception when others then ok:=true;end;
 if not ok then raise exception 'Start seat limit failed';end if;
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000003',true);
do $$declare ok boolean:=false;begin
 begin perform public.kairo_team_accept(current_setting('kairo.test.invite'));exception when others then ok:=true;end;
 if not ok then raise exception 'Wrong-email invite accepted';end if;
 if exists(select 1 from public.media_assets where id='c1000000-0000-4000-8000-000000000001') then raise exception 'Cross-workspace media leak';end if;
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.kairo_team_accept(current_setting('kairo.test.invite'));
do $$begin
 if not exists(select 1 from public.businesses where id='b1000000-0000-4000-8000-000000000001') then raise exception 'Member cannot read business';end if;
 if exists(select 1 from public.businesses where id='b1000000-0000-4000-8000-000000000002') then raise exception 'Member can read other business';end if;
 if not exists(select 1 from public.media_assets where id='c1000000-0000-4000-8000-000000000001') then raise exception 'Member cannot read shared media';end if;
end $$;
select set_config('kairo.test.content',public.kairo_external_content('b1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','External photo test','Caption test','post')::text,true);
select public.create_ai_generation('b1000000-0000-4000-8000-000000000001',current_setting('kairo.test.content')::uuid,'image','Team test prompt','{}');
reset role;
insert into public.subscriptions(user_id,plan,status,current_period_end) values('a1000000-0000-4000-8000-000000000001','pro','active',now()+interval '30 days');
set local role authenticated;
select public.kairo_reserve_video_generation('c1000000-0000-4000-8000-000000000001',current_setting('kairo.test.content')::uuid,'Team test prompt','e1000000-0000-4000-8000-000000000001');
select public.kairo_attach_media_to_content(current_setting('kairo.test.content')::uuid,'c1000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select public.kairo_review_content(current_setting('kairo.test.content')::uuid,'approved','',1);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.kairo_schedule_meta_post(current_setting('kairo.test.content')::uuid,'d1000000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001',now()+interval '1 day');
do $$declare ok boolean:=false;begin
 begin perform public.kairo_team_invite('b1000000-0000-4000-8000-000000000001','bad@example.invalid');exception when others then ok:=true;end;
 if not ok then raise exception 'Collaborator managed invites';end if;
 if (select count(*) from public.meta_publish_jobs where content_id=current_setting('kairo.test.content')::uuid and status='queued')<>1 then raise exception 'Scheduling failed';end if;
end $$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
select public.kairo_team_remove('b1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002',null);
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.contents where id=current_setting('kairo.test.content')::uuid) then raise exception 'Removed member can read content';end if;
 if exists(select 1 from public.media_assets where id='c1000000-0000-4000-8000-000000000001') then raise exception 'Removed member can read media';end if;
end $$;
reset role;
insert into public.subscriptions(user_id,plan,status,current_period_end) values('a1000000-0000-4000-8000-000000000001','pro','active',now()+interval '30 days');
do $$begin if kairo_private.team_limit('b1000000-0000-4000-8000-000000000001')<>2 then raise exception 'Pro limit';end if;end $$;
update public.subscriptions set plan='premium' where user_id='a1000000-0000-4000-8000-000000000001';
do $$begin if kairo_private.team_limit('b1000000-0000-4000-8000-000000000001')<>4 then raise exception 'Premium limit';end if;end $$;
update public.subscriptions set current_period_end=now()-interval '1 day' where user_id='a1000000-0000-4000-8000-000000000001';
do $$begin if kairo_private.team_limit('b1000000-0000-4000-8000-000000000001')<>1 then raise exception 'Expiry limit';end if;if has_function_privilege('anon','public.kairo_team_invite(uuid,text)','execute') then raise exception 'Anonymous invite permission';end if;end $$;
select 'PASS: seats 1/2/4, wrong email, membership, isolation, upload composer, scheduling, revocation, expiry, anonymous denial' as verification;
rollback;
