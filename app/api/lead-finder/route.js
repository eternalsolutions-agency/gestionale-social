import {createClient} from '@supabase/supabase-js';
import {leadSectors,mapLeadResults,overpassQuery,locationQuery} from '../../../lib/lead-finder';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function POST(req){
 try{
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)return json({error:'Accedi a KAIRO.'},401);
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);if(authError||!user)return json({error:'Sessione non valida.'},401);
  const raw=await req.text();if(raw.length>3000)return json({error:'Richiesta troppo grande.'},400);let body;try{body=JSON.parse(raw);}catch{return json({error:'Richiesta non valida.'},400);}
  const {business_id,sector,city,radius}=body,category=leadSectors.find(s=>s[0]===sector)?.[1];if(!category||typeof city!=='string'||city.trim().length<2||city.length>120||![10,25,50].includes(radius)||typeof business_id!=='string')return json({error:'Scegli settore, città/zona e raggio.'},400);
  const {error:reserveError}=await db.rpc('kairo_lead_reserve_search',{p_business_id:business_id,p_sector:sector,p_city:city,p_radius:radius});if(reserveError)return json({error:reserveError.message},/Premium|Workspace/.test(reserveError.message)?403:429);
  const headers={'User-Agent':'KAIRO-LeadFinder/1.0 (https://gestionale-social.vercel.app)','Referer':'https://gestionale-social.vercel.app/lead-finder'};
  let center=body.center,location=city;
  if(!center){const gr=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:locationQuery(city)}),redirect:'error',signal:AbortSignal.timeout(18000),cache:'no-store'});if(!gr.ok)throw Error('Il servizio località è momentaneamente occupato. Riprova più tardi.');const geo=await gr.json();if(geo.remark)throw Error('Località non disponibile. Riprova più tardi.');const places=(geo.elements||[]).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>({lat:p.lat,lon:p.lon,name:p.tags?.name||city,description:[p.tags?.name,p.tags?.['is_in:province'],p.tags?.['is_in:region'],p.tags?.is_in].filter(Boolean).join(' · '),source_url:'https://www.openstreetmap.org/node/'+p.id}));if(!places.length)return json({error:'Località non trovata nella fonte. Usa il nome preciso di una città o quartiere italiano.'},422);if(places.length>1)return json({locations:places,notice:'Più località hanno questo nome. Scegli il centro della ricerca.'});center=places[0];location=center.description;}
  const query=overpassQuery(sector,center.lat,center.lon,radius);
  const response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}),redirect:'error',signal:AbortSignal.timeout(28000),cache:'no-store'});if(!response.ok)throw Error('La fonte attività è momentaneamente occupata. Riprova più tardi.');const data=await response.json();if(data.remark)throw Error('La fonte ha restituito una ricerca incompleta. Riduci il raggio e riprova.');
  return json({leads:mapLeadResults(data.elements,center,radius,category,city),location,source:'OpenStreetMap',notice:'Fino a 50 risultati tra le attività presenti nella fonte. I dati possono essere incompleti: verifica contatti e presenza digitale.'});
 }catch(e){console.error('lead-finder request failed:',e.name);return json({error:e.name==='TimeoutError'||e.name==='AbortError'?'La fonte non ha risposto in tempo. Riprova più tardi.':e.message||'Ricerca non riuscita.'},502);}
}
