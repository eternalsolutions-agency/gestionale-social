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

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Metodo non consentito"},405);
 try{
 const {sb}=await authenticated(req);const body=await req.json().catch(()=>({}));const action=body.action||"status";
 const appId=Deno.env.get("META_APP_ID"),secret=Deno.env.get("META_APP_SECRET");
 const configured=Boolean(appId&&secret);
 if(action==="status")return json({configured,redirect_uri:CALLBACK});
 if(action!=="authorize")return json({error:"Azione non supportata"},400);
 if(!configured)return json({configured:false,error:"Configura META_APP_ID e META_APP_SECRET nei Secrets di Supabase."},409);
 const {data:state,error}=await sb.rpc("kairo_create_meta_state");if(error||!state)throw new Error(error?.message||"Impossibile iniziare il collegamento");
 const url=new URL("https://www.facebook.com/"+(Deno.env.get("META_GRAPH_VERSION")||"v24.0")+"/dialog/oauth");
 url.searchParams.set("client_id",appId!);url.searchParams.set("redirect_uri",CALLBACK);url.searchParams.set("state",state);
 const config=Deno.env.get("META_LOGIN_CONFIG_ID");
 if(config){url.searchParams.set("config_id",config);url.searchParams.set("response_type","code");url.searchParams.set("override_default_response_type","true");}
 else url.searchParams.set("scope","pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management");
 return json({configured:true,url:url.toString()});
 }catch(e){return json({error:e instanceof Error?e.message:"Errore collegamento"},400);}
});
