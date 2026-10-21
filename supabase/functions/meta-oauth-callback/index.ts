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

const redirect=(params:Record<string,string>)=>new Response(null,{status:302,headers:{Location:SITE+"/pubblicazione?"+new URLSearchParams(params),"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
Deno.serve(async(req)=>{
 const url=new URL(req.url);
 if(!url.search)return json({service:"meta-oauth-callback",configured:Boolean(Deno.env.get("META_APP_ID")&&Deno.env.get("META_APP_SECRET")),redirect_uri:CALLBACK});
 try{
 const state=url.searchParams.get("state");if(!state)return redirect({meta:"error",message:"Callback Meta non valido."});
 const db=admin();const {data:claims,error:claimError}=await db.rpc("kairo_claim_meta_state",{p_state:state});
 if(claimError||!claims?.length)return redirect({meta:"error",message:"Collegamento scaduto o gia utilizzato. Riprova da Collega Meta."});
 const exchange=claims[0].exchange_token;
 if(url.searchParams.has("error")){await db.rpc("kairo_finalize_meta_oauth",{p_exchange_token:exchange});return redirect({meta:"error",message:"Collegamento annullato o permessi non concessi."});}
 const code=url.searchParams.get("code");if(!code)throw new Error("Codice Meta mancante.");
 const appId=Deno.env.get("META_APP_ID"),secret=Deno.env.get("META_APP_SECRET");if(!appId||!secret)throw new Error("Credenziali Meta da configurare in Supabase.");
 const tokenUrl=new URL(GRAPH+"/oauth/access_token");
 for(const [k,v] of Object.entries({client_id:appId,client_secret:secret,redirect_uri:CALLBACK,code}))tokenUrl.searchParams.set(k,v);
 const tokenResponse=await fetch(tokenUrl,{signal:AbortSignal.timeout(25000)});const tokenData=await tokenResponse.json();if(!tokenResponse.ok||!tokenData.access_token)throw new Error(tokenData.error?.message||"Autorizzazione Meta non riuscita.");
 let token=tokenData.access_token;
 const longUrl=new URL(GRAPH+"/oauth/access_token");for(const [k,v] of Object.entries({grant_type:"fb_exchange_token",client_id:appId,client_secret:secret,fb_exchange_token:token}))longUrl.searchParams.set(k,v as string);
 const longResponse=await fetch(longUrl,{signal:AbortSignal.timeout(25000)});const longData=await longResponse.json();if(!longResponse.ok||!longData.access_token)throw new Error("Impossibile ottenere il token Meta duraturo.");token=longData.access_token;
 const pages:any[]=[];let after:string|undefined;
 for(let i=0;i<20;i++){const data=await graph("me/accounts",token,{fields:"id,name,access_token,instagram_business_account{id,username}",limit:"100",...(after?{after}:{})});
 for(const p of data.data||[]){if(p.access_token)pages.push({page_id:p.id,page_name:p.name,page_token:p.access_token,ig_id:p.instagram_business_account?.id||null,ig_name:p.instagram_business_account?.username||null});}
 if(!data.paging?.next)break;after=data.paging?.cursors?.after;if(!after)break;if(i===19)throw new Error("Troppe Pagine Meta. Riduci la selezione e riprova.");}
 if(!pages.length){await db.rpc("kairo_finalize_meta_oauth",{p_exchange_token:exchange});return redirect({meta:"error",message:"Nessuna Pagina disponibile. Verifica i permessi e la selezione delle Pagine su Meta."});}
 const {data:count,error}=await db.rpc("kairo_complete_meta_oauth",{p_exchange_token:exchange,p_pages:pages});if(error)throw new Error("Salvataggio degli account non riuscito. Riprova il collegamento.");
 return redirect({meta:"connected",accounts:String(count)});
 }catch(e){return redirect({meta:"error",message:e instanceof Error?e.message:"Errore collegamento Meta"});}
});
