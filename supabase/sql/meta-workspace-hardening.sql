create or replace function public.kairo_create_meta_state_for_business(p_business uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v_state text;
begin
 if auth.uid() is null then raise exception 'Sessione richiesta'; end if;
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid()) then raise exception 'Solo il titolare può collegare i canali di questa attività'; end if;
 v_state:=gen_random_uuid()::text;
 insert into public.meta_oauth_states(user_id,business_id,state,callback_token) values(auth.uid(),p_business,v_state,gen_random_uuid()::text);
 return v_state;
end; $$;
revoke all on function public.kairo_create_meta_state_for_business(uuid) from public,anon;
grant execute on function public.kairo_create_meta_state_for_business(uuid) to authenticated;

revoke execute on function public.kairo_admin_client_detail(uuid), public.kairo_admin_clients(), public.kairo_admin_overview(), public.kairo_is_admin() from public,anon;
grant execute on function public.kairo_admin_client_detail(uuid), public.kairo_admin_clients(), public.kairo_admin_overview(), public.kairo_is_admin() to authenticated,service_role;
