
create or replace function public.kairo_attach_media_to_content(p_content_id uuid,p_asset_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_business uuid;v_kind text;
begin
 if auth.uid() is null then raise exception 'Accedi a KAIRO';end if;
 select c.business_id into v_business from public.contents c join public.businesses b on b.id=c.business_id
 where c.id=p_content_id and b.owner_id=auth.uid() for update of c;
 if v_business is null then raise exception 'Contenuto non disponibile';end if;
 select kind into v_kind from public.media_assets where id=p_asset_id and business_id=v_business and owner_id=auth.uid();
 if v_kind is null then raise exception 'Media non disponibile per questo contenuto';end if;
 update public.contents set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('media_asset_id',p_asset_id,'media_kind',v_kind,'media_selected_at',now()),updated_at=now() where id=p_content_id;
 update public.media_assets set content_id=p_content_id where id=p_asset_id and content_id is null;
 return true;
end; $$;
revoke all on function public.kairo_attach_media_to_content(uuid,uuid) from public,anon;
grant execute on function public.kairo_attach_media_to_content(uuid,uuid) to authenticated;
