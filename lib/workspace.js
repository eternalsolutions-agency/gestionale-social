import {supabase} from './supabase';
export function workspaceQuery(fields='*'){
 let q=supabase.from('businesses').select(fields);
 try{const id=localStorage.getItem('kairo_workspace_id');if(/^[a-f0-9-]{36}$/i.test(id||''))q=q.eq('id',id)}catch{}
 return q;
}
export async function workspaceContext(){
 const{data:{user},error}=await supabase.auth.getUser();if(error||!user)throw new Error('Accedi a KAIRO.');
 const{data:business,error:e}=await workspaceQuery().order('created_at',{ascending:false}).limit(1).maybeSingle();
 if(e)throw e;if(!business)throw new Error('Seleziona un’attività dal Team o completa il profilo.');return{user,business};
}
export function selectWorkspace(id){localStorage.setItem('kairo_workspace_id',id);for(const k of ['kairo_active_content_id','rps_selected_idea','rps_calendar_content_id','kairo_pending_asset_id','kairo_studio_source_asset'])localStorage.removeItem(k);}
