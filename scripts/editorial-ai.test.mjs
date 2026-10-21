import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/generate-copy/route.js';
import {editorialSchemas,validEditorialOutput} from '../lib/editorial-ai-schema.mjs';
const idea={format:'Reel',pillar:'Valore',title:'Come scegliere',hook:'Parti da qui',body:'Confronta le caratteristiche reali del prodotto.',cta:'Chiedici i dettagli',scenes:['Il problema','Il metodo']};
const strategy={title:'Strategia per il brand',objective:'Richieste di informazioni',pillars:Array.from({length:3},(_,i)=>({name:'Tema '+i,purpose:'Aiutare il pubblico',formats:['Post']})),weekly_plan:[{day:'Lunedì',format:'Reel',pillar:'Valore',topic:'Una domanda concreta',cta:'Scrivici'}],notes:'Basata sui dati disponibili'};
const copy={hook:'Una domanda',caption:'Un testo concreto',cta:'Scrivici',hashtags:['#brand'],visual:'Foto reale',scenes:[]};
async function scenario({task='copy',token='test-session',configured=true,quotaError=false,providerError=false,output,body={}}={}){
 const previousFetch=globalThis.fetch,previousKey=process.env.OPENAI_API_KEY;
 if(configured)process.env.OPENAI_API_KEY='test-key-never-used-externally';else delete process.env.OPENAI_API_KEY;
 const calls=[];
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),body:options.body?JSON.parse(options.body):null});
  if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'test-user'});
  if(String(url).includes('/rpc/kairo_reserve_copy_quota'))return quotaError?Response.json({message:'Quota testi AI esaurita'},{status:400}):Response.json('reservation-id');
  if(String(url).includes('/rpc/kairo_settle_copy_quota'))return Response.json(null);
  if(url==='https://api.openai.com/v1/responses')return providerError?Response.json({error:{message:'private provider error'}},{status:500}):Response.json({id:'response-id',model:'test-model',status:'completed',output_text:JSON.stringify(output??(task==='strategy'?strategy:task==='ideas'?{ideas:Array.from({length:6},()=>({...idea}))}:copy))});
  throw Error('Unexpected external request');
 };
 try{
  const req=new Request('http://localhost/api/generate-copy',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({task,business_id:'workspace-id',context:'Brand reale, settore e pubblico verificati',...body})});
  const response=await POST(req);return {status:response.status,data:await response.json(),calls};
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey}
}
test('anonymous requests never reach auth, quota or provider',async()=>{const r=await scenario({token:null});assert.equal(r.status,401);assert.equal(r.calls.length,0)});
test('missing configuration returns an actionable error without reserving quota',async()=>{const r=await scenario({configured:false});assert.equal(r.status,503);assert.equal(r.data.code,'AI_NOT_CONFIGURED');assert.equal(r.calls.length,1)});
test('reject unsupported tasks',async()=>{const r=await scenario({task:'__proto__'});assert.equal(r.status,400);assert.equal(r.calls.length,1)});
test('deny exhausted quota before calling the provider',async()=>{const r=await scenario({quotaError:true});assert.equal(r.status,429);assert.ok(!r.calls.some(x=>x.url.includes('api.openai.com')))});
for(const task of ['copy','strategy','ideas'])test(task+' returns validated structured output and consumes exactly one text quota',async()=>{const r=await scenario({task});assert.equal(r.status,200);assert.ok(validEditorialOutput(r.data.content,editorialSchemas[task]));const settlements=r.calls.filter(x=>x.url.includes('settle_copy'));assert.equal(settlements.length,1);assert.equal(settlements[0].body.p_success,true);const provider=r.calls.find(x=>x.url.includes('api.openai.com'));assert.equal(provider.body.text.format.name,'kairo_'+task);assert.equal(provider.body.store,false)});
test('provider failure releases quota and hides provider details',async()=>{const r=await scenario({providerError:true});assert.equal(r.status,502);assert.equal(r.calls.at(-1).body.p_success,false);assert.ok(!r.data.error.includes('private provider error'))});
test('malformed or incomplete output releases quota instead of reaching the editor',async()=>{const r=await scenario({task:'ideas',output:{ideas:[idea]}});assert.equal(r.status,502);assert.equal(r.calls.at(-1).body.p_success,false)});
