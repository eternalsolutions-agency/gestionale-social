"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '../lib/supabase';
import {workspaceContext} from '../lib/workspace';

const planName=p=>({start:'Start',pro:'Pro',premium:'Premium'}[p]||p||'—');

export default function QuotaPanel(){
 const[data,setData]=useState(null),[entitlements,setEntitlements]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 async function load(){
  setLoading(true);
  try{
   const{business}=await workspaceContext();
   const[q,e]=await Promise.all([
    supabase.rpc('kairo_ai_quotas',{p_business:business.id}),
    supabase.rpc('kairo_my_entitlements',{p_business:business.id})
   ]);
   if(q.error)throw q.error;if(e.error)throw e.error;
   setData(q.data);setEntitlements(e.data);setError('');
  }catch(e){setError(e.message||'Quote non disponibili.')}finally{setLoading(false)}
 }
 useEffect(()=>{load();const refresh=()=>load();window.addEventListener('kairo-quota-changed',refresh);return()=>window.removeEventListener('kairo-quota-changed',refresh)},[]);
 const text=data?.quotas?.texts;
 const limit=entitlements?.copy_monthly_limit??text?.limit??0;
 const used=text?.used??0,reserved=text?.reserved??0,remaining=Math.max(0,limit-used-reserved);
 return <section className="quotaPanel" aria-label="Quote AI condivise"><style>{css}</style><header><div><b>Piano {planName(entitlements?.plan||data?.plan)}</b><p>Generazioni testo condivise tra titolare e collaboratori.</p></div><button disabled={loading} onClick={load}>{loading?'Aggiorno…':'Aggiorna'}</button></header>{error&&<p className="quotaError" role="status">{error}</p>}{data&&entitlements&&<><div className="quotaCard"><div><span>Testi AI mensili</span><strong>{remaining}<small> / {limit} disponibili</small></strong><p>{used} completate{reserved?` · ${reserved} in elaborazione o verifica`:''}</p></div><progress aria-label="Generazioni testo utilizzate o riservate" value={used+reserved} max={Math.max(1,limit)}/></div><div className="quotaMeta"><span>Collaboratori inclusi: <b>{entitlements.collaborator_limit}</b></span>{data.resets_at&&<span>Rinnovo quote: <b>{new Date(data.resets_at).toLocaleDateString('it-IT',{timeZone:'Europe/Rome'})}</b></span>}</div><p className="explanation">Una strategia AI, un gruppo di idee AI o un copy generato usa una quota testo. Gli errori tecnici restituiscono la quota. Le quote per immagini, modifiche foto, clip AI e reel non vengono mostrate finché i relativi limiti commerciali non saranno definiti.</p><Link className="upgrade" href="/abbonamento">Gestisci piano e abbonamento →</Link></>}</section>
}
const css=`.quotaPanel{max-width:1180px;margin:25px auto;padding:22px;border:1px solid #d9e5f3;border-radius:18px;background:#f5f8fe;color:#17283f}.quotaPanel header{display:flex;justify-content:space-between;gap:15px;align-items:center;margin:0!important}.quotaPanel header b{font-size:17px;color:#1763d1}.quotaPanel p{font-size:14px;line-height:1.65;color:#526478}.quotaPanel button{background:white;color:#1763d1;border:1px solid #d9e5f3;padding:10px 14px;border-radius:10px;cursor:pointer}.quotaCard{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,1fr);gap:24px;align-items:center;background:white;padding:20px;border:1px solid #d9e5f3;border-radius:14px;margin:16px 0}.quotaCard span{font-size:14px}.quotaCard strong{display:block;margin-top:8px;font-size:30px}.quotaCard strong small{font-size:14px;font-weight:400}.quotaCard progress{width:100%;height:12px;accent-color:#1763d1}.quotaMeta{display:flex;gap:22px;flex-wrap:wrap;font-size:14px;color:#526478}.quotaError{color:#9a3412!important}.upgrade{display:inline-block;margin-top:4px;color:#1763d1;font-weight:700;text-decoration:none}@media(max-width:750px){.quotaCard{grid-template-columns:1fr}.quotaPanel header{align-items:flex-start;flex-direction:column}.quotaPanel header button{width:100%}}`;