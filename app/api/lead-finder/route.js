import {createClient} from '@supabase/supabase-js';
import {leadSectors,mapLeadResults,overpassQuery} from '../../../lib/lead-finder';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://tkjajqizdjaynslvwcfp.supabase.co';
const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_VgyXCuW3mJtHi96I8Lo2gg_hvCEWbgh';
export async function POST(req){
 try{
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)return json({error:'Accedi a KAIRO.'},401);
  const db=createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);if(authError||!user)return json({error:'Sessione non valida.'},401);
  const raw=await req.text();if(raw.length>3000)return json({error:'Richiesta troppo grande.'},400);let body;try{body=JSON.parse(raw);}catch{return json({error:'Richiesta non valida.'},400);}
  const {business_id,sector,city,radius}=body,category=leadSectors.find(s=>s[0]===sector)?.[1];if(!category||typeof city!=='string'||city.trim().length<2||city.length>120||![10,25,50].includes(radius)||typeof business_id!=='string')return json({error:'Scegli settore, città/zona e raggio.'},400);
  const {error:reserveError}=await db.rpc('kairo_lead_reserve_search',{p_business_id:business_id,p_sector:sector,p_city:city,p_radius:radius});if(reserveError)return json({error:reserveError.message},/Premium|Workspace/.test(reserveError.message)?403:429);
  const headers={'User-Agent':'KAIRO-LeadFinder/1.0 (contact: https://gestionale-social.vercel.app)','Accept':'application/json'};
  let center=body.center,location=city;
  if(!center){const url='https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=it&limit=5&addressdetails=1&q='+encodeURIComponent(city.trim());const gr=await fetch(url,{headers,signal:AbortSignal.timeout(15000),cache:'no-store'});if(!gr.ok)throw Error('Il servizio località è momentaneamente occupato. Riprova più tardi.');const geo=await gr.json();const places=(geo||[]).map(p=>({lat:Number(p.lat),lon:Number(p.lon),name:p.name||p.display_name?.split(',')[0]||city,description:p.display_name||city,source_url:'https://www.openstreetmap.org/'+p.osm_type+'/'+p.osm_id})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));if(!places.length)return json({error:'Località non trovata. Prova con città e provincia, ad esempio “Roma RM”.'},422);if(places.length>1)return json({locations:places,notice:'Più località corrispondono alla ricerca. Scegli quella corretta.'});center=places[0];location=center.description;}
  const query=overpassQuery(sector,center.lat,center.lon,radius);
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];let data=null,lastError=null;for(const endpoint of endpoints){try{const response=await fetch(endpoint,{method:'POST',headers:{...headers,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(28000),cache:'no-store'});if(!response.ok){lastError=Error('Fonte attività occupata');continue}const candidate=await response.json();if(candidate.remark){lastError=Error('Ricerca incompleta');continue}data=candidate;break}catch(e){lastError=e}}if(!data)throw lastError||Error('La fonte attività è momentaneamente occupata. Riprova più tardi.');
  return json({leads:mapLeadResults(data.elements,center,radius,category,city),location,source:'OpenStreetMap',notice:'Fino a 50 risultati tra le attività presenti nella fonte. I dati possono essere incompleti: verifica contatti e presenza digitale.'});
 }catch(e){console.error('lead-finder request failed:',e.name,e.message);return json({error:e.name==='TimeoutError'||e.name==='AbortError'?'La fonte non ha risposto in tempo. Riprova più tardi.':e.message||'Ricerca non riuscita.'},502);}
}
