create schema if not exists kairo_private;
create table public.kairo_team_members (
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(business_id,user_id)
);
create table kairo_private.team_invites (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 email text not null, token text not null unique, expires_at timestamptz not null default now()+interval '7 days',
 accepted_by uuid references auth.users(id), revoked boolean not null default false, created_at timestamptz not null default now()
);
alter table public.kairo_team_members enable row level security;
alter table kairo_private.team_invites enable row level security;
revoke all on public.kairo_team_members from anon,authenticated;
grant select on public.kairo_team_members to authenticated;
revoke all on kairo_private.team_invites from public,anon,authenticated;
create or replace function kairo_private.team_limit(p_business uuid) returns int language sql stable security definer set search_path='' as $$
 select case coalesce((select s.plan from public.subscriptions s join public.businesses b on b.owner_id=s.user_id where b.id=p_business and s.status in ('active','trialing') and (s.current_period_end is null or s.current_period_end>now()) order by s.created_at desc limit 1),'start') when 'premium' then 4 when 'pro' then 2 else 1 end;
$$;
create or replace function kairo_private.can_work(p_business uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.businesses b where b.id=p_business and b.owner_id=auth.uid()) or exists(select 1 from (select user_id,row_number() over(order by joined_at,user_id) as seat from public.kairo_team_members where business_id=p_business) m where m.user_id=auth.uid() and m.seat<=kairo_private.team_limit(p_business)));
$$;
revoke all on function kairo_private.team_limit(uuid),kairo_private.can_work(uuid) from public,anon;
grant usage on schema kairo_private to authenticated;
grant execute on function kairo_private.can_work(uuid) to authenticated;
create policy team_members_read on public.kairo_team_members for select to authenticated using(kairo_private.can_work(business_id));
create policy businesses_team_read on public.businesses for select to authenticated using(kairo_private.can_work(id));
create policy contents_team_read on public.contents for select to authenticated using(kairo_private.can_work(business_id));
create policy contents_team_insert on public.contents for insert to authenticated with check(created_by=auth.uid() and kairo_private.can_work(business_id));
create policy contents_team_update on public.contents for update to authenticated using(kairo_private.can_work(business_id)) with check(kairo_private.can_work(business_id));
create policy contents_team_delete on public.contents for delete to authenticated using(kairo_private.can_work(business_id));
create policy media_team_read on public.media_assets for select to authenticated using(kairo_private.can_work(business_id));
create policy media_team_insert on public.media_assets for insert to authenticated with check(owner_id=auth.uid() and kairo_private.can_work(business_id) and split_part(storage_path,'/',1)=auth.uid()::text and split_part(storage_path,'/',2)=business_id::text);
create policy media_team_update on public.media_assets for update to authenticated using(kairo_private.can_work(business_id)) with check(kairo_private.can_work(business_id));
create policy media_team_delete on public.media_assets for delete to authenticated using(kairo_private.can_work(business_id));
create policy sets_team_read on public.kairo_media_sets for select to authenticated using(kairo_private.can_work(business_id));
create policy analyses_team_read on public.analyses for select to authenticated using(kairo_private.can_work(business_id));
create policy findings_team_read on public.analysis_findings for select to authenticated using(exists(select 1 from public.analyses a where a.id=analysis_id and kairo_private.can_work(a.business_id)));
create policy strategy_team_read on public.strategies for select to authenticated using(kairo_private.can_work(business_id));
create policy jobs_team_read on public.meta_publish_jobs for select to authenticated using(exists(select 1 from public.contents c where c.id=content_id and kairo_private.can_work(c.business_id)));
create or replace function kairo_private.lock_workspace_identity() returns trigger language plpgsql set search_path='' as $$ begin
 if new.business_id is distinct from old.business_id then raise exception 'Il workspace non può essere cambiato';end if;
 if tg_table_name='contents' then if new.created_by is distinct from old.created_by then raise exception 'Autore non modificabile';end if;end if;
 if tg_table_name='media_assets' then if new.owner_id is distinct from old.owner_id or new.storage_path is distinct from old.storage_path then raise exception 'Proprietario e percorso non modificabili';end if;end if;
 return new;end $$;
create trigger contents_workspace_identity before update on public.contents for each row execute function kairo_private.lock_workspace_identity();
create trigger media_workspace_identity before update on public.media_assets for each row execute function kairo_private.lock_workspace_identity();
create policy media_team_storage_read on storage.objects for select to authenticated using(bucket_id='rp-social-media' and exists(select 1 from public.media_assets a where a.storage_path=name and kairo_private.can_work(a.business_id)));
create policy media_team_storage_delete on storage.objects for delete to authenticated using(bucket_id='rp-social-media' and exists(select 1 from public.media_assets a where a.storage_path=name and kairo_private.can_work(a.business_id)));
create or replace function public.kairo_team_workspaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'owner_id',b.owner_id,'role',case when b.owner_id=auth.uid() then 'owner' else 'collaborator' end,'collaborator_limit',kairo_private.team_limit(b.id)) order by b.created_at desc),'[]'::jsonb) from public.businesses b where kairo_private.can_work(b.id);
$$;
create or replace function public.kairo_team_list(p_business uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare v_owner boolean;begin
 if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
 v_owner:=exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid());
 return jsonb_build_object('limit',kairo_private.team_limit(p_business),'owner',v_owner,'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'email',u.email,'joined_at',m.joined_at) order by m.joined_at) from public.kairo_team_members m join auth.users u on u.id=m.user_id where m.business_id=p_business),'[]'::jsonb),'invites',case when v_owner then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'email',i.email,'expires_at',i.expires_at)) from kairo_private.team_invites i where i.business_id=p_business and not revoked and accepted_by is null and expires_at>now()),'[]'::jsonb) else '[]'::jsonb end);
 end $$;
create or replace function public.kairo_team_invite(p_business uuid,p_email text) returns text language plpgsql security definer set search_path='' as $$ declare v_token text;v_email text:=lower(trim(p_email));v_owner uuid;begin
 select owner_id into v_owner from public.businesses where id=p_business and owner_id=auth.uid() for update;
 if v_owner is null then raise exception 'Solo il titolare può gestire il team';end if;
 if length(v_email)>254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Email non valida';end if;
 if exists(select 1 from auth.users where id=v_owner and lower(email)=v_email) or exists(select 1 from public.kairo_team_members m join auth.users u on u.id=m.user_id where m.business_id=p_business and lower(u.email)=v_email) then raise exception 'Account già presente nel team';end if;
 update kairo_private.team_invites set revoked=true where business_id=p_business and email=v_email and accepted_by is null;
 if (select count(*) from public.kairo_team_members where business_id=p_business)+(select count(*) from kairo_private.team_invites where business_id=p_business and not revoked and accepted_by is null and expires_at>now())>=kairo_private.team_limit(p_business) then raise exception 'Tutti i posti del piano sono occupati o riservati';end if;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into kairo_private.team_invites(business_id,email,token) values(p_business,v_email,v_token);return v_token;end $$;
create or replace function public.kairo_team_accept(p_token text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_inv kairo_private.team_invites%rowtype;v_email text;v_owner uuid;begin
 if auth.uid() is null then raise exception 'Accedi con l’email invitata';end if;
 select email into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 select * into v_inv from kairo_private.team_invites where token=p_token;
 if v_inv.id is null or v_inv.revoked or v_inv.expires_at<=now() or lower(v_email) is distinct from v_inv.email then raise exception 'Invito scaduto, non valido o destinato a un’altra email verificata';end if;
 select owner_id into v_owner from public.businesses where id=v_inv.business_id for update;
 select * into v_inv from kairo_private.team_invites where token=p_token for update;
 if v_inv.revoked or v_inv.expires_at<=now() then raise exception 'Invito non disponibile';end if;
 if v_inv.accepted_by=auth.uid() then return v_inv.business_id;end if;
 if v_inv.accepted_by is not null or auth.uid()=v_owner then raise exception 'Invito non disponibile';end if;
 if (select count(*) from public.kairo_team_members where business_id=v_inv.business_id)>=kairo_private.team_limit(v_inv.business_id) then raise exception 'Limite collaboratori raggiunto';end if;
 insert into public.kairo_team_members(business_id,user_id) values(v_inv.business_id,auth.uid()) on conflict do nothing;
 update kairo_private.team_invites set accepted_by=auth.uid() where id=v_inv.id;return v_inv.business_id;end $$;
create or replace function public.kairo_team_remove(p_business uuid,p_user uuid default null,p_invite uuid default null) returns boolean language plpgsql security definer set search_path='' as $$ begin
 perform 1 from public.businesses where id=p_business and owner_id=auth.uid() for update;
 if not found then raise exception 'Solo il titolare può gestire il team';end if;
 if p_user is not null then delete from public.kairo_team_members where business_id=p_business and user_id=p_user;end if;
 if p_invite is not null then update kairo_private.team_invites set revoked=true where business_id=p_business and id=p_invite;end if;return true;end $$;
create or replace function public.kairo_team_channels(p_business uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'platform',platform,'account_name',account_name,'status',status)),'[]'::jsonb) from public.social_connections where business_id=p_business and kairo_private.can_work(p_business);
$$;
create or replace function public.kairo_external_content(p_business uuid,p_asset uuid,p_title text,p_caption text,p_format text) returns uuid language plpgsql security definer set search_path='' as $$ declare v_id uuid;v_kind text;begin
 if not kairo_private.can_work(p_business) then raise exception 'Workspace non disponibile';end if;
 if p_format not in ('post','reel') or length(trim(p_title)) not between 1 and 150 or length(coalesce(p_caption,''))>10000 then raise exception 'Titolo, testo o formato non valido';end if;
 select kind into v_kind from public.media_assets where id=p_asset and business_id=p_business and ((kind='image' and mime_type='image/jpeg') or (kind='video' and mime_type='video/mp4'));
 if v_kind is null or (v_kind='video' and p_format<>'reel') or (v_kind='image' and p_format<>'post') then raise exception 'Media o formato non valido';end if;
 insert into public.contents(business_id,created_by,title,format,status,caption,metadata) values(p_business,auth.uid(),trim(p_title),p_format,'ready',coalesce(p_caption,''),jsonb_build_object('source','external_upload','media_asset_id',p_asset,'media_kind',v_kind)) returning id into v_id;
 return v_id;end $$;
revoke all on function public.kairo_team_workspaces(),public.kairo_team_list(uuid),public.kairo_team_invite(uuid,text),public.kairo_team_accept(text),public.kairo_team_remove(uuid,uuid,uuid),public.kairo_team_channels(uuid),public.kairo_external_content(uuid,uuid,text,text,text) from public,anon;
grant execute on function public.kairo_team_workspaces(),public.kairo_team_list(uuid),public.kairo_team_invite(uuid,text),public.kairo_team_accept(text),public.kairo_team_remove(uuid,uuid,uuid),public.kairo_team_channels(uuid),public.kairo_external_content(uuid,uuid,text,text,text) to authenticated;
drop policy media_assets_select_own on public.media_assets;
drop policy media_assets_insert_own on public.media_assets;
drop policy media_assets_update_own on public.media_assets;
drop policy media_assets_delete_own on public.media_assets;
drop policy rp_social_media_select_own on storage.objects;
drop policy rp_social_media_insert_own on storage.objects;
drop policy rp_social_media_update_own on storage.objects;
drop policy rp_social_media_delete_own on storage.objects;
create policy media_member_storage_insert on storage.objects for insert to authenticated with check(bucket_id='rp-social-media' and split_part(name,'/',1)=auth.uid()::text and kairo_private.can_work(case when split_part(name,'/',2) ~ '^[a-f0-9-]{36}$' then split_part(name,'/',2)::uuid else null end));
create policy media_member_storage_own_read on storage.objects for select to authenticated using(bucket_id='rp-social-media' and split_part(name,'/',1)=auth.uid()::text and kairo_private.can_work(case when split_part(name,'/',2) ~ '^[a-f0-9-]{36}$' then split_part(name,'/',2)::uuid else null end));
create policy media_member_storage_own_delete on storage.objects for delete to authenticated using(bucket_id='rp-social-media' and split_part(name,'/',1)=auth.uid()::text and kairo_private.can_work(case when split_part(name,'/',2) ~ '^[a-f0-9-]{36}$' then split_part(name,'/',2)::uuid else null end));
