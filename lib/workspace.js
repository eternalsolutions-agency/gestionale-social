import {supabase} from './supabase';

const CACHE_TTL=45000;
let memoryContext=null;
let memoryAt=0;
let pendingContext=null;

function selectedWorkspaceId(){
 try{const id=localStorage.getItem('kairo_workspace_id');return /^[a-f0-9-]{36}$/i.test(id||'')?id:null}catch{return null}
}

export function workspaceQuery(fields='*'){
 let q=supabase.from('businesses').select(fields);
 const id=selectedWorkspaceId();
 if(id)q=q.eq('id',id);
 return q;
}

export async function workspaceContext({force=false}={}){
 const selectedId=selectedWorkspaceId();
 const fresh=memoryContext&&Date.now()-memoryAt<CACHE_TTL&&(!selectedId||memoryContext.business?.id===selectedId);
 if(!force&&fresh)return memoryContext;
 if(!force&&pendingContext)return pendingContext;
 pendingContext=(async()=>{
  const{data:{user},error}=await supabase.auth.getUser();
  if(error||!user)throw new Error('Accedi a KAIRO.');
  const{data:business,error:e}=await workspaceQuery().order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(e)throw e;
  if(!business)throw new Error('Seleziona un’attività dal Team o completa il profilo.');
  memoryContext={user,business};memoryAt=Date.now();return memoryContext;
 })();
 try{return await pendingContext}finally{pendingContext=null}
}

export function clearWorkspaceContextCache(){memoryContext=null;memoryAt=0;pendingContext=null}

export function selectWorkspace(id){
 localStorage.setItem('kairo_workspace_id',id);clearWorkspaceContextCache();
 for(const k of ['kairo_active_content_id','rps_selected_idea','rps_calendar_content_id','kairo_pending_asset_id','kairo_studio_source_asset'])localStorage.removeItem(k);
}
