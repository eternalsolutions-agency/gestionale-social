export const dynamic='force-dynamic';
export async function GET(req){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://tkjajqizdjaynslvwcfp.supabase.co';
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||'sb_publishable_VgyXCuW3mJtHi96I8Lo2gg_hvCEWbgh';
 const authorization=req.headers.get('authorization')||'';
 if(!authorization.startsWith('Bearer '))return Response.json({error:'Accedi a KAIRO.'},{status:401});
 try{
 const auth=await fetch(url+'/auth/v1/user',{headers:{Authorization:authorization,apikey:key},cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!auth.ok)return Response.json({error:'Sessione scaduta. Accedi di nuovo.'},{status:401});
 const response=await fetch(url+'/functions/v1/meta-social-connect',{method:'POST',headers:{Authorization:authorization,apikey:key,'Content-Type':'application/json'},body:JSON.stringify({action:'status'}),cache:'no-store',signal:AbortSignal.timeout(10000)});
 const meta=await response.json().catch(()=>({}));
 return Response.json({services:[{id:'workspace',name:'Workspace e database',configured:true,note:'Sessione verificata. I dati sono protetti dai permessi del workspace.'},{id:'media',name:'Immagini, clip e Reel Builder',configured:response.ok?!!meta.media_configured:null,note:response.ok?'Configurazione del servizio creativo. Generazioni ed esportazioni richiedono un test.':'Verifica del servizio non riuscita. Riprova tra poco.'},{id:'copy',name:'Copy con AI',configured:!!process.env.OPENAI_API_KEY,note:process.env.OPENAI_API_KEY?'Motore testi configurato.':'Il motore testi deve essere attivato dall’amministratore.'},{id:'meta',name:'Facebook e Instagram',configured:response.ok?!!meta.configured:null,note:'Dopo la configurazione, il titolare deve autorizzare gli account nella sezione Social collegati.'},{id:'leads',name:'Lead Finder',configured:!!process.env.GOOGLE_MAPS_API_KEY,note:'Disponibile con un piano Premium attivo.'},{id:'billing',name:'Abbonamenti e pagamenti',configured:null,note:'Integrazione Stripe predisposta in modalità test. Apri Abbonamento per verificare la configurazione. Incassi reali disattivati.'}]},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Non riesco a verificare i servizi. Riprova.'},{status:503})}
}
