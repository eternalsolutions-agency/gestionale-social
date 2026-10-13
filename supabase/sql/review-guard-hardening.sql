create or replace function kairo_private.content_review_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare owner uuid;changed boolean:=false;locked boolean:=false;removed_asset boolean:=false;removed_actor boolean:=false;begin
 select owner_id into owner from public.businesses where id=new.business_id;
 if tg_op='INSERT' then
  new.revision:=1;new.approved_by:=null;new.approved_at:=null;new.approved_asset_id:=null;
  if auth.uid()=owner and new.status='ready' then new.approval_status:='approved';else new.approval_status:='draft';if new.status in ('ready','scheduled','published') then new.status:='draft';end if;end if;
 else
  removed_asset:=pg_trigger_depth()>1 and old.approved_asset_id is not null and new.approved_asset_id is null;removed_actor:=pg_trigger_depth()>1 and old.approved_by is not null and new.approved_by is null;
  changed:=row(new.title,new.hook,new.body,new.caption,new.cta,new.hashtags,new.format,new.media_urls,new.metadata->'media_asset_id',new.metadata->'media_asset_ids',new.metadata->'media_set_id') is distinct from row(old.title,old.hook,old.body,old.caption,old.cta,old.hashtags,old.format,old.media_urls,old.metadata->'media_asset_id',old.metadata->'media_asset_ids',old.metadata->'media_set_id');
  new.revision:=old.revision;new.approved_by:=old.approved_by;new.approved_at:=old.approved_at;new.approved_asset_id:=old.approved_asset_id;
  if removed_asset and old.status<>'published' then changed:=true;end if;
  if removed_actor then new.approved_by:=null;end if;if removed_asset then new.approved_asset_id:=null;end if;
  if changed or new.approval_status is distinct from old.approval_status then
   select exists(select 1 from public.meta_publish_jobs where content_id=old.id and status in ('queued','pending','processing','uncertain')) into locked;
   if locked then raise exception 'Annulla gli invii programmati o verifica quelli avviati prima di modificare il contenuto';end if;
   if old.status='published' then raise exception 'Il contenuto è pubblicato: crea una nuova bozza';end if;
  end if;
  if changed then new.revision:=old.revision+1;new.approval_status:='draft';new.status:='draft';new.approved_by:=null;new.approved_at:=null;new.approved_asset_id:=null;
  elsif new.status='ready' and old.status not in ('ready','scheduled','published') and new.approval_status=old.approval_status then
   if auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare il contenuto';end if;new.approval_status:='approved';
  end if;
  if new.status in ('scheduled','published') and new.status is distinct from old.status and new.approval_status<>'approved' then raise exception 'Il titolare deve approvare prima il contenuto';end if;
  if new.approval_status is distinct from old.approval_status and new.approval_status in ('approved','changes_requested') and auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare o richiedere modifiche';end if;
 end if;
 if new.approval_status='approved' and (tg_op='INSERT' or old.approval_status is distinct from 'approved') then
  if auth.uid() is distinct from owner then raise exception 'Solo il titolare può approvare il contenuto';end if;
  new.approved_by:=owner;new.approved_at:=now();select id into new.approved_asset_id from public.media_assets where id::text=new.metadata->>'media_asset_id' and business_id=new.business_id;
 elsif new.approval_status<>'approved' then new.approved_by:=null;new.approved_at:=null;new.approved_asset_id:=null;if new.status in ('ready','scheduled','published') then new.status:='draft';end if;end if;
 if new.status in ('scheduled','published') and new.approval_status<>'approved' then raise exception 'Approva prima il contenuto';end if;
 return new;end $$;
