import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.99.1";
const SITE=Deno.env.get("KAIRO_SITE_URL")||"https://gestionale-social.vercel.app";
const CALLBACK="https://tkjajqizdjaynslvwcfp.supabase.co/functions/v1/meta-oauth-callback";
const GRAPH="https://graph.facebook.com/"+(Deno.env.get("META_GRAPH_VERSION")||"v24.0");
const cors={"Access-Control-Allow-Origin":SITE,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const admin=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
async function authenticated(req:Request){const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("Authorization")||""}},auth:{persistSession:false}});const {data:{user},error}=await sb.auth.getUser();if(error||!user)throw new Error("Sessione non valida. Accedi di nuovo.");return {sb,user};}
class GraphError extends Error{uncertain:boolean;constructor(message:string,uncertain=false){super(message);this.uncertain=uncertain;}}
async function graph(path:string,token:string,params:Record<string,string>={},method="GET"){const url=new URL(GRAPH+"/"+path);let body:URLSearchParams|undefined;if(method==="GET"){for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);}else body=new URLSearchParams(params);const r=await fetch(url,{method,headers:{Authorization:"Bearer "+token},body,signal:AbortSignal.timeout(25000)});const data=await r.json();if(!r.ok||data.error)throw new GraphError(data.error?.message||"Errore Meta",r.status>=500);return data;}

import {executePublication} from "../_shared/meta-publisher.ts";
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json({error:"Metodo non consentito"},405);
 const key=req.headers.get("x-kairo-scheduler-key");
 if(!key||key.length!==64)return json({error:"Non autorizzato"},401);
 const db=admin();const {data:valid,error:authError}=await db.rpc("kairo_validate_scheduler_secret",{p_secret:key});
 if(authError||valid!==true)return json({error:"Non autorizzato"},401);
 try{
 const {data:jobs,error}=await db.rpc("kairo_claim_due_meta_posts");if(error)throw new Error("Impossibile caricare la coda");
 const statuses=await Promise.all((jobs||[]).map(async(job:any)=>{
 try{
 const response=await executePublication(db,job.owner_id,{content_id:job.content_id,connection_id:job.connection_id,asset_id:job.asset_id},job);
 const result=await response.json();
 if(response.status>=400){await db.from("meta_publish_jobs").update({status:"failed",error_message:result.error||"Invio non riuscito",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","processing");}
 return result.status||"failed";
 }catch{await db.from("meta_publish_jobs").update({status:"uncertain",error_message:"Esecuzione interrotta: verifica il profilo.",updated_at:new Date().toISOString()}).eq("id",job.id).eq("status","processing");return "uncertain";}
 }));
 return json({processed:statuses.length,published:statuses.filter((s:string)=>s==="published").length,pending:statuses.filter((s:string)=>s==="pending").length,failed:statuses.filter((s:string)=>["failed","uncertain"].includes(s)).length});
 }catch{return json({error:"Errore esecuzione coda"},500);}
});
