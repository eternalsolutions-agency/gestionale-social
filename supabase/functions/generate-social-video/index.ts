
function createClient(base:string,key:string,options:any={}){
 const authorization=options.global?.headers?.Authorization||"Bearer "+key;
 async function request(path:string,method="GET",body:any=undefined,extra:any={}){
 try{const raw=body instanceof Uint8Array;const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:authorization,...(!raw&&body!==undefined?{"Content-Type":"application/json"}:{}),...extra},body:body===undefined?undefined:raw?(body as BodyInit):JSON.stringify(body),signal:AbortSignal.timeout(raw?60000:20000)});const text=await r.text();let data:any=null;try{data=text?JSON.parse(text):null;}catch{}return r.ok?{data,error:null}:{data:null,error:{message:data?.message||data?.error||"Richiesta Supabase non riuscita",code:data?.code}};}catch{return {data:null,error:{message:"Connessione Supabase momentaneamente non disponibile"}};}
 }
 function from(table:string){
 const params=new URLSearchParams();let method="GET",body:any=undefined;
 const query:any={select:(columns="*")=>{params.set("select",columns);return query;},eq:(column:string,value:any)=>{params.append(column,"eq."+String(value));return query;},lt:(column:string,value:any)=>{params.append(column,"lt."+String(value));return query;},lte:(column:string,value:any)=>{params.append(column,"lte."+String(value));return query;},in:(column:string,values:any[])=>{params.append(column,"in.("+values.map(v=>JSON.stringify(v)).join(",")+")");return query;},order:(column:string,opts:any={})=>{params.set("order",column+(opts.ascending===false?".desc":".asc"));return query;},limit:(count:number)=>{params.set("limit",String(count));return query;},update:(values:any)=>{method="PATCH";body=values;return query;},insert:(values:any)=>{method="POST";body=values;return query;}};
 async function execute(){return request("/rest/v1/"+encodeURIComponent(table)+"?"+params.toString(),method,body,{"Prefer":"return=representation"});}
 query.single=async()=>{const r=await execute();if(r.error)return r;if(!Array.isArray(r.data)||r.data.length!==1)return {data:null,error:{message:"Record non disponibile"}};return {data:r.data[0],error:null};};
 query.maybeSingle=async()=>{const r=await execute();if(r.error)return r;if(Array.isArray(r.data)&&r.data.length<=1)return {data:r.data[0]||null,error:null};return {data:null,error:{message:"Risultato non univoco"}};};
 query.then=(resolve:any,reject:any)=>execute().then(resolve,reject);return query;
 }
 return {from,rpc:(name:string,body:any={})=>request("/rest/v1/rpc/"+encodeURIComponent(name),"POST",body),auth:{getUser:async()=>{const r=await request("/auth/v1/user");return {data:{user:r.error?null:r.data},error:r.error};}},storage:{from:(bucket:string)=>({
 createSignedUrl:async(path:string,expiresIn:number)=>{const p=encodeURIComponent(bucket)+"/"+path.split("/").map(encodeURIComponent).join("/");const r=await request("/storage/v1/object/sign/"+p,"POST",{expiresIn});if(r.error)return r;const signed=r.data?.signedURL||r.data?.signedUrl;if(!signed)return {data:null,error:{message:"URL media non disponibile"}};return {data:{signedUrl:signed.startsWith("https://")?signed:base+"/storage/v1"+(signed.startsWith("/")?signed:"/"+signed)},error:null};},
 upload:(path:string,bytes:Uint8Array,opts:any={})=>request("/storage/v1/object/"+encodeURIComponent(bucket)+"/"+path.split("/").map(encodeURIComponent).join("/"),"POST",bytes,{"Content-Type":opts.contentType||"application/octet-stream","x-upsert":opts.upsert?"true":"false"})
 })}};
}


const SITE=Deno.env.get("KAIRO_SITE_URL")||"https://gestionale-social.vercel.app";
const cors={"Access-Control-Allow-Origin":SITE,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
const admin=()=>createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
async function auth(req:Request){const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:req.headers.get("Authorization")||""}},auth:{persistSession:false}});const{data:{user},error}=await sb.auth.getUser();if(error||!user)throw new Error("Accedi a KAIRO.");return {sb,user};}
function queueUrl(value:string,id:string){const u=new URL(value);if(u.protocol!=="https:"||u.hostname!=="queue.fal.run"||u.port||u.username||u.password||!u.pathname.startsWith("/fal-ai/pika/")||!u.pathname.includes("/requests/"+id))throw new Error("URL della coda non valido");return u.toString();}



class ProviderFailure extends Error{}
async function requestJson(url:string,key:string){const r=await fetch(url,{headers:{Authorization:"Key "+key},redirect:"error",signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok){if(r.status>=500||r.status===429)throw new Error("Servizio video momentaneamente occupato");throw new ProviderFailure(typeof d.detail==="string"?d.detail:"Risultato video non disponibile");}return d;}
async function payload(db:any,row:any){const result:any={generation_id:row.generation_id,status:row.state,content_id:row.content_id,source_asset_id:row.source_asset_id,error:row.error_message||null};if(row.state==="completed"){const {data:a}=await db.from("media_assets").select("storage_path").eq("id",row.output_asset_id).eq("owner_id",row.owner_id).single();if(a?.storage_path){const {data:s}=await db.storage.from("rp-social-media").createSignedUrl(a.storage_path,3600);result.asset_id=row.output_asset_id;result.video_url=s?.signedUrl||null;}else result.error="Il video salvato e stato eliminato dalla libreria.";}return result;}
async function checkVideo(db:any,row:any){
 if(!["active","checking"].includes(row.state))return payload(db,row);
 const {data:claimed,error}=await db.rpc("kairo_claim_video_result",{p_generation_id:row.generation_id});if(error)throw new Error("Verifica video non disponibile");if(!claimed)return payload(db,row);
 const key=Deno.env.get("FAL_KEY");
 const token=claimed.lease_token;let finished=false;
 try{
 if(!key)throw new Error("FAL_KEY non configurata");
 const status=await requestJson(queueUrl(claimed.status_url,claimed.provider_request_id),key);
 if(status.error||status.status==="FAILED")throw new ProviderFailure(typeof status.error==="string"?status.error:"Generazione video non riuscita");
 if(status.status!=="COMPLETED"){
 await db.from("kairo_video_requests").update({state:"active",lease_until:null,next_check_at:new Date(Date.now()+45000).toISOString(),updated_at:new Date().toISOString()}).eq("generation_id",row.generation_id).eq("lease_token",token);
 return {...await payload(db,{...row,state:"active"}),provider_status:status.status,queue_position:status.queue_position};
 }
 const result=await requestJson(queueUrl(claimed.response_url,claimed.provider_request_id),key);
 if(!result.video?.url)throw new ProviderFailure("Il modello non ha restituito un video");
 let target=new URL(result.video.url);
 for(let attempt=0;;attempt++){
 if(target.protocol!=="https:"||target.port||target.username||target.password||!target.hostname.endsWith(".fal.media"))throw new ProviderFailure("URL del video non valido");
 const response=await fetch(target,{redirect:"manual",signal:AbortSignal.timeout(30000)});
 if(response.status>=300&&response.status<400){if(attempt>=2)throw new ProviderFailure("Troppi redirect del video");const location=response.headers.get("Location");if(!location)throw new ProviderFailure("Redirect video non valido");target=new URL(location,target);continue;}
 if(!response.ok)throw new Error("Download del Reel temporaneamente non disponibile");
 const max=50*1024*1024;if(Number(response.headers.get("Content-Length")||0)>max)throw new ProviderFailure("Il Reel supera il limite di 50 MB");
 const reader=response.body?.getReader();if(!reader)throw new Error("Download video vuoto");const chunks:Uint8Array[]=[];let length=0;
 while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>max){await reader.cancel();throw new ProviderFailure("Il Reel supera il limite di 50 MB");}chunks.push(part.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const path=claimed.owner_id+"/"+claimed.business_id+"/ai-video-"+claimed.generation_id+".mp4";
 const {error:uploadError}=await db.storage.from("rp-social-media").upload(path,bytes,{contentType:"video/mp4",upsert:true});if(uploadError)throw new Error("Salvataggio del Reel temporaneamente non disponibile");
 const {data:assetId,error:finishError}=await db.rpc("kairo_finish_video_result",{p_generation_id:claimed.generation_id,p_lease_token:token,p_storage_path:path});if(finishError)throw new Error("Registrazione del Reel temporaneamente non disponibile");
 finished=true;return payload(db,{...claimed,state:"completed",output_asset_id:assetId,error_message:null});
 }
 }catch(e){
 const permanent=e instanceof ProviderFailure;const message=e instanceof Error?e.message:"Verifica video non riuscita";
 if(!finished){await db.from("kairo_video_requests").update({state:permanent?"failed":"active",error_message:permanent?message:null,lease_until:null,next_check_at:new Date(Date.now()+60000).toISOString(),updated_at:new Date().toISOString()}).eq("generation_id",claimed.generation_id).eq("lease_token",token);if(permanent)await db.from("ai_generations").update({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",claimed.generation_id);}
 return {...await payload(db,{...row,state:permanent?"failed":"active",error_message:permanent?message:null}),message:permanent?message:"Verifica momentaneamente non disponibile. Il Reel resta in elaborazione."};
 }
}

async function submitVideo(req:Request){
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Metodo non consentito"},405);
 let id:string|null=null;let submitted=false;
 const db=admin();
 try{
 const {sb,user}=await auth(req);const body=await req.json();const prompt=String(body.prompt||"").trim();const clientId=body.client_request_id||crypto.randomUUID();
 const {data:reservation,error}=await sb.rpc("kairo_reserve_video_generation",{p_asset_id:body.asset_id,p_content_id:body.content_id||null,p_prompt:prompt,p_client_request_id:clientId});
 if(error||!reservation)throw new Error(error?.message||"Impossibile creare la richiesta");
 id=reservation.generation_id;
 if(!reservation.is_new)return json({ok:true,generation_id:id,status:reservation.status},202);
 const key=Deno.env.get("FAL_KEY");if(!key)throw new Error("FAL_KEY non configurata");
 const {data:a,error:ae}=await db.from("media_assets").select("storage_path").eq("id",body.asset_id).eq("owner_id",user.id).single();if(ae||!a?.storage_path)throw new Error("Immagine non disponibile");
 const {data:s,error:se}=await db.storage.from("rp-social-media").createSignedUrl(a.storage_path,86400);if(se||!s?.signedUrl)throw new Error("Impossibile preparare l'immagine");
 submitted=true;
 const r=await fetch("https://queue.fal.run/fal-ai/pika/v2.1/image-to-video",{method:"POST",headers:{Authorization:"Key "+key,"Content-Type":"application/json"},body:JSON.stringify({image_url:s.signedUrl,prompt}),signal:AbortSignal.timeout(25000)});
 const d=await r.json();
 if(!r.ok){submitted=r.status>=500;throw new Error(typeof d.detail==="string"?d.detail:"La richiesta video non e stata accettata da fal.ai");}
 if(!d.request_id||!d.status_url||!d.response_url)throw new Error("Risposta della coda non completa. Non reinviare la richiesta.");
 const statusUrl=queueUrl(d.status_url,d.request_id),responseUrl=queueUrl(d.response_url,d.request_id);
 const {error:saveError}=await db.from("kairo_video_requests").update({state:"active",provider_request_id:d.request_id,status_url:statusUrl,response_url:responseUrl,updated_at:new Date().toISOString()}).eq("generation_id",id).eq("state","submitting");
 if(saveError)throw new Error("Richiesta inviata, ma registrazione non riuscita. Verifica lo stato prima di creare un altro Reel.");
 await db.from("ai_generations").update({status:"processing",updated_at:new Date().toISOString()}).eq("id",id);
 return json({ok:true,generation_id:id,status:"active",message:"Reel in elaborazione. Puoi chiudere lo Studio: lo ritroverai nella libreria."},202);
 }catch(e){
 const message=e instanceof Error?e.message:"Errore generazione video";
 if(id){await db.from("kairo_video_requests").update({state:submitted?"uncertain":"failed",error_message:message,updated_at:new Date().toISOString()}).eq("generation_id",id).eq("state","submitting");await db.from("ai_generations").update({status:"failed",error_message:message,updated_at:new Date().toISOString()}).eq("id",id);}
 return json({error:message,generation_id:id,status:submitted?"uncertain":"failed"},400);
 }
}
async function readVideo(req:Request){
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"Metodo non consentito"},405);
 const db=admin();const schedulerKey=req.headers.get("x-kairo-scheduler-key");
 try{
 if(schedulerKey){
 if(schedulerKey.length!==64)return json({error:"Non autorizzato"},401);
 const {data:valid}=await db.rpc("kairo_validate_scheduler_secret",{p_secret:schedulerKey});if(valid!==true)return json({error:"Non autorizzato"},401);
 await db.from("kairo_video_requests").update({state:"uncertain",error_message:"Invio interrotto. Verifica la richiesta prima di generare un altro Reel.",updated_at:new Date().toISOString()}).eq("state","submitting").lt("created_at",new Date(Date.now()-120000).toISOString());
 const {data:rows,error}=await db.from("kairo_video_requests").select("*").in("state",["active","checking"]).lte("next_check_at",new Date().toISOString()).order("next_check_at").limit(2);if(error)throw new Error("Coda video non disponibile");
 const results=await Promise.all((rows||[]).map((r:any)=>checkVideo(db,r)));return json({checked:results.length,completed:results.filter((r:any)=>r.status==="completed").length});
 }
 const {user}=await auth(req);const body=await req.json();
 if(body.action==="recent"){
 const {data:rows,error}=await db.from("kairo_video_requests").select("generation_id,state,content_id,source_asset_id,client_request_id,error_message,created_at").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(10);if(error)throw new Error("Storico Reel non disponibile");return json({jobs:(rows||[]).map((r:any)=>({...r,status:r.state,error:r.error_message}))});
 }
 if(!body.generation_id)return json({error:"Seleziona una generazione video"},400);
 const {data:row,error}=await db.from("kairo_video_requests").select("*").eq("generation_id",body.generation_id).eq("owner_id",user.id).maybeSingle();if(error||!row)return json({error:"Generazione non disponibile"},404);
 return json(await checkVideo(db,row));
 }catch(e){return json({error:e instanceof Error?e.message:"Errore stato video"},400);}
}
Deno.serve(async(req:Request)=>{
 if(req.headers.has("x-kairo-scheduler-key"))return readVideo(req);
 const body=await req.clone().json().catch(()=>({}));
 return ["status","recent"].includes(body.action)?readVideo(req):submitVideo(req);
});
