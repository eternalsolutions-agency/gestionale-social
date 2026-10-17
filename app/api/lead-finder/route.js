import {createClient} from '@supabase/supabase-js';
import {leadSectors,distanceKm} from '../../../lib/lead-finder';
export const dynamic='force-dynamic';
export const maxDuration=60;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||'https://tkjajqizdjaynslvwcfp.supabase.co';
const supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_VgyXCuW3mJtHi96I8Lo2gg_hvCEWbgh';
const googleKey=process.env.GOOGLE_MAPS_API_KEY;
const googleTypes={restaurant:'restaurant',cafe:'cafe',hotel:'hotel',hairdresser:'hair_care',beauty:'beauty_salon',dentist:'dentist',fitness:'gym',estate:'real_estate_agency',car_repair:'car_repair',clothes:'clothing_store'};
const textQueries={restaurant:'ristoranti',cafe:'bar caffè',hotel:'hotel B&B',hairdresser:'parrucchieri',beauty:'centri estetici',dentist:'dentisti',fitness:'palestre',estate:'agenzie immobiliari',car_repair:'officine auto',clothes:'negozi abbigliamento'};
const safeUrl=value=>{try{const u=new URL(String(value||''));return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}};
async function googleJson(url,options={}){const r=await fetch(url,{...options,cache:'no-store',signal:AbortSignal.timeout(18000)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data?.error?.message||`Google Places non disponibile (${r.status}).`);return data;}
async function geocodeCity(city){const data=await googleJson('https://maps.googleapis.com/maps/api/geocode/json?components=country:IT&address='+encodeURIComponent(city.trim())+'&key='+encodeURIComponent(googleKey));if(data.status!=='OK'&&data.status!=='ZERO_RESULTS')throw Error(data.error_message||'Il servizio località non è disponibile.');return (data.results||[]).slice(0,5).map(p=>({lat:Number(p.geometry?.location?.lat),lon:Number(p.geometry?.location?.lng),name:p.address_components?.[0]?.long_name||city,description:p.formatted_address||city,place_id:p.place_id})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));}
async function searchPlaces(sector,center,radius,city,category){const payload={textQuery:`${textQueries[sector]||category} vicino a ${city}`,maxResultCount:20,locationBias:{circle:{center:{latitude:center.lat,longitude:center.lon},radius:Math.min(radius*1000,50000)}}};const type=googleTypes[sector];if(type)payload.includedType=type;const data=await googleJson('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':googleKey,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.nationalPhoneNumber,places.googleMapsUri,places.types'},body:JSON.stringify(payload)});return (data.places||[]).map(p=>{const lat=Number(p.location?.latitude),lon=Number(p.location?.longitude);if(!Number.isFinite(lat)||!Number.isFinite(lon))return null;const distance=distanceKm(center.lat,center.lon,lat,lon);if(distance>radius)return null;return {source:'google',source_id:p.id,source_url:safeUrl(p.googleMapsUri),name:p.displayName?.text||'Attività',category,city,address:p.formattedAddress||'',website:safeUrl(p.websiteUri),phone:p.nationalPhoneNumber||'',email:'',social:{},distance_km:Math.round(distance*10)/10};}).filter(Boolean).sort((a,b)=>a.distance_km-b.distance_km).slice(0,50);}
export async function POST(req){
 try{
  if(!googleKey)return json({error:'Google Places non è configurato sul server.'},503);
  const token=req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)return json({error:'Accedi a KAIRO.'},401);
  const db=createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);if(authError||!user)return json({error:'Sessione non valida.'},401);
  const raw=await req.text();if(raw.length>3000)return json({error:'Richiesta troppo grande.'},400);let body;try{body=JSON.parse(raw);}catch{return json({error:'Richiesta non valida.'},400);}
  const {business_id,sector,city,radius}=body,category=leadSectors.find(s=>s[0]===sector)?.[1];if(!category||typeof city!=='string'||city.trim().length<2||city.length>120||![10,25,50].includes(radius)||typeof business_id!=='string')return json({error:'Scegli settore, città/zona e raggio.'},400);
  let center=body.center,location=city;
  if(!center){const places=await geocodeCity(city);if(!places.length)return json({error:'Località non trovata. Prova con città e provincia, ad esempio “Roma RM”.'},422);if(places.length>1)return json({locations:places,notice:'Più località corrispondono alla ricerca. Scegli quella corretta.'});center=places[0];location=center.description;}
  if(!Number.isFinite(Number(center?.lat))||!Number.isFinite(Number(center?.lon)))return json({error:'Località non valida.'},400);center={...center,lat:Number(center.lat),lon:Number(center.lon)};
  const leads=await searchPlaces(sector,center,radius,city,category);
  const {error:reserveError}=await db.rpc('kairo_lead_reserve_search',{p_business_id:business_id,p_sector:sector,p_city:city,p_radius:radius});if(reserveError)return json({error:reserveError.message},/Premium|Workspace/.test(reserveError.message)?403:429);
  return json({leads,location,source:'Google Places',notice:`${leads.length} attività trovate con Google Places. Verifica i dati prima del contatto commerciale.`});
 }catch(e){console.error('lead-finder request failed:',e.name,e.message);return json({error:e.name==='TimeoutError'||e.name==='AbortError'?'Google Places non ha risposto in tempo. Riprova.':e.message||'Ricerca non riuscita.'},502);}
}
