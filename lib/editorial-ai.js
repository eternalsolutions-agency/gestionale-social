import {supabase} from './supabase';
import {editorialSchemas,validEditorialOutput} from './editorial-ai-schema.mjs';
export async function generateEditorialAI({task,business,brand,analysis,strategy,findings,ideas}){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw Error('Accedi a KAIRO per usare la generazione AI.');
 const website=analysis?.raw_data?.website||analysis?.raw_data?.analysis?.website;
 const context=JSON.stringify({brand:{name:brand?.name||business.name,industry:business.industry,target:business.target_audience,goal:business.primary_goal,posting_frequency:business.posting_frequency,tone:brand?.tone||business.tone_of_voice,cta:brand?.cta,notes:brand?.notes},findings:findings?.slice(0,6),strategy:strategy?{objective:strategy.objective,pillars:strategy.pillars,weekly_plan:strategy.weekly_plan}:undefined,previous_ideas:ideas?.map(x=>({title:x.title,format:x.format})),website:website?{title:website.title,description:website.description,signals:website.signals,pages:website.crawl?.pages?.slice(0,8)}:undefined});
 const response=await fetch('/api/generate-copy',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({task,business_id:business.id,context}),signal:AbortSignal.timeout(60000)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(result.error||'Generazione AI non riuscita.');
 if(!validEditorialOutput(result.content,editorialSchemas[task]))throw Error('Risposta AI non valida. Le proposte precedenti restano disponibili.');
 return result;
}
