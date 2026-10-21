import {editorialSchemas,validEditorialOutput,editorialInstructions} from '../../../lib/editorial-ai-schema.mjs';
export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX=14000;
function json(data,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}})}
function sb(){return{url:process.env.NEXT_PUBLIC_SUPABASE_URL||"https://tkjajqizdjaynslvwcfp.supabase.co",key:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_VgyXCuW3mJtHi96I8Lo2gg_hvCEWbgh"}}
async function userFromToken(token){const{url,key}=sb();if(!url||!key)return null;const r=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:key},cache:"no-store",signal:AbortSignal.timeout(10000)});return r.ok?await r.json():null}
async function rpc(token,name,args){const{url,key}=sb();if(!url||!key)throw new Error("Supabase non configurato.");const r=await fetch(`${url}/rest/v1/rpc/${name}`,{method:"POST",headers:{Authorization:`Bearer ${token}`,apikey:key,"Content-Type":"application/json"},body:JSON.stringify(args),cache:"no-store",signal:AbortSignal.timeout(10000)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const e=new Error(data?.message||data?.error||"Operazione quota non riuscita.");e.status=r.status;throw e}return data}
function outputText(data){if(data?.output_text)return data.output_text;return (data?.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text||"").join("")}

export async function POST(req){
 let reservation=null,token='';
 async function release(){if(reservation){await rpc(token,'kairo_settle_copy_quota',{p_reservation:reservation,p_success:false});reservation=null}}
 try{
  const auth=req.headers.get('authorization')||'';token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token)return json({error:'Sessione richiesta.'},401);
  const user=await userFromToken(token);if(!user?.id)return json({error:'Sessione non valida.'},401);
  const body=await req.json(),task=body?.task||'copy';
  if(!Object.hasOwn(editorialSchemas,task))return json({error:'Operazione AI non disponibile.'},400);
  const key=process.env.OPENAI_API_KEY;
  if(!key)return json({error:'Il servizio testi AI deve essere attivato dal titolare della piattaforma. Puoi continuare con le proposte guidate.',code:'AI_NOT_CONFIGURED'},503);
  const businessId=String(body?.business_id||''),context=String(body?.context||'').slice(0,MAX),platform=String(body?.platform||'instagram').slice(0,30),format=String(body?.format||'post').slice(0,30);
  if(!businessId)return json({error:'Workspace non disponibile.'},400);
  if(context.length<20)return json({error:'Contesto insufficiente.'},400);
  try{reservation=await rpc(token,'kairo_reserve_copy_quota',{p_business:businessId})}
  catch(e){const msg=String(e?.message||'');return json({error:msg.includes('Quota testi AI esaurita')?msg:'Non è stato possibile verificare la quota AI.'},msg.includes('Quota testi AI esaurita')?429:403)}
  const response=await fetch('https://api.openai.com/v1/responses',{
   method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),
   body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||'gpt-5-mini',store:false,max_output_tokens:4500,instructions:editorialInstructions(task,platform,format),input:context,reasoning:{effort:'low'},text:{format:{type:'json_schema',name:`kairo_${task}`,strict:true,schema:editorialSchemas[task]}}})
  });
  const data=await response.json();
  if(!response.ok){await release();return json({error:response.status===429?'Il servizio AI è momentaneamente occupato. Riprova tra poco.':'Generazione AI non riuscita. Riprova tra poco.'},response.status===429?429:502)}
  let content;try{content=JSON.parse(outputText(data))}catch{}
  if(data.status==='incomplete'||!validEditorialOutput(content,editorialSchemas[task])){await release();return json({error:'La risposta AI non è completa o valida. Riprova: la quota è stata restituita.'},502)}
  await rpc(token,'kairo_settle_copy_quota',{p_reservation:reservation,p_success:true});reservation=null;
  return json({content,task,model:data.model||process.env.OPENAI_TEXT_MODEL||'gpt-5-mini',response_id:data.id||null});
 }catch(e){if(reservation&&token)await release().catch(()=>{});return json({error:e?.name==='AbortError'||e?.name==='TimeoutError'?'Il servizio AI non ha risposto in tempo. Riprova.':'Generazione non riuscita. Riprova tra poco.'},500)}
}
