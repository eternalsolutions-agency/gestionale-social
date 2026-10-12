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

async function saveJob(db:any,id:string,values:Record<string,unknown>){const {error}=await db.from("meta_publish_jobs").update({...values,updated_at:new Date().toISOString()}).eq("id",id);if(error)throw new Error("Impossibile registrare lo stato dell'invio.");}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Metodo non consentito"},405);
 try{
 const {sb,user}=await authenticated(req);const {content_id,connection_id,asset_id}=await req.json();
 if(!content_id||!connection_id)return json({error:"Seleziona contenuto e account."},400);
 const {data:c,error:ce}=await sb.from("contents").select("id,business_id,caption,body,cta,hashtags,status,format").eq("id",content_id).single();
 if(ce||!c)throw new Error("Contenuto non disponibile.");
 if(!["ready","scheduled","published"].includes(c.status))throw new Error("Approva prima il contenuto nel calendario.");
 const {data:b}=await sb.from("businesses").select("id").eq("id",c.business_id).eq("owner_id",user.id).single();if(!b)throw new Error("Contenuto non autorizzato.");
 const db=admin();const {data:connection}=await db.from("social_connections").select("id,platform,status,external_account_id,token_secret_id").eq("id",connection_id).eq("business_id",c.business_id).eq("status","connected").single();
 if(!connection||!["facebook","instagram"].includes(connection.platform))throw new Error("Account non collegato.");
 const {data:previous,error:pe}=await db.from("meta_publish_jobs").select("*").eq("content_id",c.id).eq("connection_id",connection.id).maybeSingle();if(pe)throw new Error("Registro pubblicazioni non disponibile.");
 if(previous?.status==="published")return json({status:"published",post_id:previous.external_post_id,message:"Contenuto gia pubblicato su questo account."});
 if(previous&&["processing","uncertain"].includes(previous.status))return json({error:"Invio gia avviato o esito da verificare. Controlla il profilo prima di riprovare.",status:previous.status},409);
 if(c.status==="published"&&!previous)throw new Error("Il contenuto risulta gia pubblicato. Crea una nuova bozza per un altro invio.");
 const selectedAsset=previous?.status==="pending"?previous.asset_id:asset_id;
 let mediaUrl="",video=false;
 if(selectedAsset){
 const {data:a}=await sb.from("media_assets").select("id,kind,mime_type,storage_path").eq("id",selectedAsset).eq("business_id",c.business_id).single();if(!a?.storage_path)throw new Error("Media non disponibile.");
 video=a.kind==="video";if(connection.platform==="facebook"&&video)throw new Error("Per Facebook seleziona una foto o pubblica solo testo. Video Facebook non ancora supportati.");
 if(!video&&a.mime_type!=="image/jpeg")throw new Error("Seleziona una foto JPEG. Converti prima PNG o altri formati.");
 const {data:s,error:se}=await db.storage.from("rp-social-media").createSignedUrl(a.storage_path,86400);if(se||!s?.signedUrl)throw new Error("Impossibile preparare il media.");mediaUrl=s.signedUrl;
 }
 if(connection.platform==="instagram"&&!mediaUrl)throw new Error("Instagram richiede una foto JPEG o un Reel dalla libreria.");
 if(/stor|carousel|carosell/i.test(c.format||""))throw new Error("Stories e caroselli non ancora supportati. Usa un post singolo o Reel.");
 const caption=[c.caption||c.body||"",c.cta||"",Array.isArray(c.hashtags)?c.hashtags.join(" "):""].filter(Boolean).join("\n\n");
 if(!caption&&!mediaUrl)throw new Error("Il contenuto e vuoto.");
 if(connection.platform==="instagram"&&caption.length>2200)throw new Error("La caption Instagram supera 2200 caratteri.");
 const {data:token,error:te}=await db.rpc("kairo_get_meta_token",{p_secret_id:connection.token_secret_id});if(te||!token)throw new Error("Token non disponibile. Ricollega Meta.");
 let job:any;
 if(previous){const {data,error}=await db.from("meta_publish_jobs").update({status:"processing",error_message:null,asset_id:selectedAsset||null,container_id:previous.asset_id===selectedAsset?previous.container_id:null,updated_at:new Date().toISOString()}).eq("id",previous.id).eq("status",previous.status).select("*").maybeSingle();if(error||!data)return json({error:"Invio gia in corso."},409);job=data;}
 else{const {data,error}=await db.from("meta_publish_jobs").insert({content_id:c.id,connection_id:connection.id,asset_id:selectedAsset||null}).select("*").single();if(error||!data)return json({error:"Invio gia presente. Aggiorna la pagina."},409);job=data;}
 let publishing=false;
 try{
 let postId:string;
 if(connection.platform==="facebook"){publishing=true;const data=await graph(connection.external_account_id+(mediaUrl?"/photos":"/feed"),token,mediaUrl?{url:mediaUrl,caption,published:"true"}:{message:caption},"POST");postId=data.post_id||data.id;if(!postId)throw new Error("Esito Meta non verificabile.");}
 else{
 let container=job.container_id;
 if(!container){const data=await graph(connection.external_account_id+"/media",token,video?{video_url:mediaUrl,media_type:"REELS",caption,share_to_feed:"true"}:{image_url:mediaUrl,caption},"POST");if(!data.id)throw new Error("Creazione media non riuscita.");container=data.id;await saveJob(db,job.id,{container_id:container});}
 const status=await graph(container,token,{fields:"status_code"});
 if(status.status_code==="ERROR"||status.status_code==="EXPIRED"){await saveJob(db,job.id,{container_id:null});throw new GraphError("Elaborazione media fallita. Verifica formato e dimensioni.");}
 if(status.status_code==="PUBLISHED"){await saveJob(db,job.id,{status:"uncertain",error_message:"Container gia pubblicato. Verifica il profilo."});return json({status:"uncertain",message:"Controlla il profilo: Meta indica un media gia pubblicato."},409);}
 if(status.status_code!=="FINISHED"){await saveJob(db,job.id,{status:"pending"});return json({status:"pending",message:"Meta sta elaborando il media. Tra poco premi Verifica e pubblica."},202);}
 publishing=true;const data=await graph(connection.external_account_id+"/media_publish",token,{creation_id:container},"POST");postId=data.id;if(!postId)throw new Error("Esito Meta non verificabile.");
 }
 await saveJob(db,job.id,{status:"published",external_post_id:postId,error_message:null});
 const {data:connections,error:connectionsError}=await db.from("social_connections").select("id").eq("business_id",c.business_id).eq("status","connected").in("platform",["facebook","instagram"]);
 const {data:done,error:doneError}=await db.from("meta_publish_jobs").select("connection_id").eq("content_id",c.id).eq("status","published");
 if(!connectionsError&&!doneError&&connections?.length&&connections.every((x:any)=>done?.some((y:any)=>y.connection_id===x.id))){await db.from("contents").update({status:"published",published_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",c.id);}
 return json({status:"published",post_id:postId,message:"Pubblicato su "+connection.platform+"."});
 }catch(e){const uncertain=publishing&&(!(e instanceof GraphError)||e.uncertain);await saveJob(db,job.id,{status:uncertain?"uncertain":"failed",error_message:uncertain?"Esito invio da verificare sul profilo.":e instanceof Error?e.message:"Errore Meta"});return json({status:uncertain?"uncertain":"failed",error:uncertain?"Esito invio da verificare sul profilo. Non ripetere il post.":e instanceof Error?e.message:"Errore Meta"},uncertain?409:400);}
 }catch(e){return json({error:e instanceof Error?e.message:"Errore pubblicazione"},400);}
});
