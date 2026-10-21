begin;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data) values
('a2000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tools-owner-test@example.invalid','',now(),'{}','{}'),
('a2000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tools-member-test@example.invalid','',now(),'{}','{}'),
('a2000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','tools-other-test@example.invalid','',now(),'{}','{}');
insert into public.businesses(id,owner_id,name,onboarding_completed) values('b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Tools test',true),('b2000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000003','Other test',true);
insert into public.kairo_team_members(business_id,user_id) values('b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000002');
insert into public.media_assets(id,business_id,owner_id,kind,source,title,storage_path,mime_type) values('c2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','image','upload','Photo','a2000000-0000-4000-8000-000000000001/b2000000-0000-4000-8000-000000000001/photo.jpg','image/jpeg'),('c2000000-0000-4000-8000-000000000002','b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','image','upload','Other photo','a2000000-0000-4000-8000-000000000001/b2000000-0000-4000-8000-000000000001/other.jpg','image/jpeg');
insert into public.social_connections(id,business_id,platform,external_account_id,account_name,status) values('d2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','facebook','test-never-post','Test channel','connected');
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select set_config('kairo.test.content',public.kairo_external_content('b2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','Member draft','Caption','post')::text,true);
do $$declare c public.contents%rowtype;ok boolean:=false;begin
 select * into c from public.contents where id=current_setting('kairo.test.content')::uuid;
 if c.status<>'draft' or c.approval_status<>'draft' then raise exception 'Member bypassed approval on insert';end if;
 begin update public.contents set status='ready' where id=c.id;exception when others then ok:=true;end;if not ok then raise exception 'Direct approval bypass';end if;
 ok:=false;begin perform public.kairo_review_content(c.id,'approved','',c.revision);exception when others then ok:=true;end;if not ok then raise exception 'Member approved';end if;
 perform public.kairo_review_content(c.id,'pending','Please review',c.revision);
 ok:=false;begin perform public.kairo_save_brand(c.business_id,'{"name":"Test","primary":"#123456","secondary":"#123456","font":"Arial"}');exception when others then ok:=true;end;if not ok then raise exception 'Member wrote kit';end if;
end $$;
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000001',true);
select public.kairo_save_brand('b2000000-0000-4000-8000-000000000001','{"name":"Brand test","primary":"#123456","secondary":"#abcdef","font":"Georgia","tone":"cordiale","cta":"Scrivici","logo_asset_id":"c2000000-0000-4000-8000-000000000001"}');
do $$declare c public.contents%rowtype;ok boolean:=false;begin
 select * into c from public.contents where id=current_setting('kairo.test.content')::uuid;
 begin perform public.kairo_review_content(c.id,'approved','',999);exception when others then ok:=true;end;if not ok then raise exception 'Stale revision approved';end if;
 perform public.kairo_review_content(c.id,'changes_requested','Correggi il testo',c.revision);
 perform public.kairo_review_content(c.id,'approved','Va bene',c.revision);
 if not exists(select 1 from public.contents where id=c.id and approved_by=auth.uid() and approved_asset_id='c2000000-0000-4000-8000-000000000001' and approval_status='approved') then raise exception 'Approval missing';end if;
end $$;
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000002',true);
do $$declare c public.contents%rowtype;ok boolean:=false;begin
 select * into c from public.contents where id=current_setting('kairo.test.content')::uuid;
 begin perform public.kairo_schedule_meta_post(c.id,'d2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002',now()+interval '1 day');exception when others then ok:=true;end;if not ok then raise exception 'Unapproved media scheduled';end if;
 update public.contents set caption='Changed caption',approved_by=auth.uid(),revision=99 where id=c.id;
 if not exists(select 1 from public.contents where id=c.id and revision=2 and approved_by is null and approval_status='draft') then raise exception 'Edit did not invalidate';end if;
 ok:=false;begin perform public.kairo_schedule_meta_post(c.id,'d2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',now()+interval '1 day');exception when others then ok:=true;end;if not ok then raise exception 'Changed caption scheduled';end if;
end $$;
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000001',true);
select public.kairo_review_content(current_setting('kairo.test.content')::uuid,'approved','',2);
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000002',true);
select public.kairo_schedule_meta_post(current_setting('kairo.test.content')::uuid,'d2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',now()+interval '1 day');
do $$declare ok boolean:=false;begin
 begin update public.contents set caption='Changed after queued' where id=current_setting('kairo.test.content')::uuid;exception when others then ok:=true;end;if not ok then raise exception 'Queued snapshot mutated';end if;
 if not exists(select 1 from public.brand_profiles where business_id='b2000000-0000-4000-8000-000000000001' and brand_name='Brand test') then raise exception 'Member cannot read kit';end if;
end $$;
select set_config('kairo.test.plan',(select jsonb_agg(jsonb_build_object('format',f,'title','Campaign '||f,'caption','Campaign caption','hook','Hook','cta','Contact','date','2026-10-14','metadata','{}'::jsonb))::text from unnest(array['post','carousel','stories','reel','post','stories']) f),true);
select set_config('kairo.test.campaign',public.kairo_save_campaign('b2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','{"name":"Test campaign"}',current_setting('kairo.test.plan')::jsonb)::text,true);
do $$declare result jsonb;ok boolean:=false;begin
 if public.kairo_save_campaign('b2000000-0000-4000-8000-000000000001','e2000000-0000-4000-8000-000000000001','{"name":"Test campaign"}',current_setting('kairo.test.plan')::jsonb)::text<>current_setting('kairo.test.campaign') then raise exception 'Idempotency failed';end if;
 if (select count(*) from public.contents where metadata->>'campaign_id'=current_setting('kairo.test.campaign') and status='draft')<>6 then raise exception 'Campaign content mismatch';end if;
 result:=public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Europe/Rome')::date,'{"instagram":{"reach":123,"followers_end":99}}',false);
 if (result->>'created')::int<>7 or result->'metrics'->'instagram'->>'reach'<>'123' or result->'metrics'->'facebook' is not null then raise exception 'Report mismatch or fabricated metrics';end if;
 begin perform public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Europe/Rome')::date,'{}',true);exception when others then ok:=true;end;if not ok then raise exception 'Member saved report';end if;
end $$;
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000001',true);
select public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Europe/Rome')::date,'{"notes":"Test report"}',true);
select public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Europe/Rome')::date,'{"notes":"Updated"}',true);
do $$declare ok boolean:=false;begin
 if (select count(*) from public.kairo_monthly_reports where business_id='b2000000-0000-4000-8000-000000000001')<>1 then raise exception 'Duplicate reports';end if;
 begin perform public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Europe/Rome')::date,'{"instagram":{"reach":-1}}',false);exception when others then ok:=true;end;if not ok then raise exception 'Invalid metric accepted';end if;
end $$;
insert into public.contents(id,business_id,created_by,title,status,metadata) values('f2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','Asset deletion test','ready','{"media_asset_id":"c2000000-0000-4000-8000-000000000002"}');
delete from public.media_assets where id='c2000000-0000-4000-8000-000000000002';
do $$begin if not exists(select 1 from public.contents where id='f2000000-0000-4000-8000-000000000001' and approved_asset_id is null and approval_status='draft') then raise exception 'Deleted media retained approval';end if;end $$;
select set_config('request.jwt.claim.sub','a2000000-0000-4000-8000-000000000003',true);
do $$declare ok boolean:=false;begin
 if exists(select 1 from public.kairo_monthly_reports where business_id='b2000000-0000-4000-8000-000000000001') or exists(select 1 from public.kairo_content_reviews where business_id='b2000000-0000-4000-8000-000000000001') or exists(select 1 from public.kairo_campaigns where business_id='b2000000-0000-4000-8000-000000000001') then raise exception 'Cross-workspace leak';end if;
 begin perform public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001',date_trunc('month',now() at time zone 'Europe/Rome')::date,'{}',false);exception when others then ok:=true;end;if not ok then raise exception 'Cross-workspace report';end if;
end $$;
reset role;set local role anon;
do $$declare ok boolean:=false;begin
 begin perform public.kairo_monthly_report('b2000000-0000-4000-8000-000000000001','2026-10-01','{}',false);exception when others then ok:=true;end;if not ok then raise exception 'Anonymous report';end if;
end $$;
reset role;
select 'PASS: approval permissions, versions, selected media, queued snapshot, brand, campaigns, report totals, isolation and anonymous denial' as result;
rollback;
