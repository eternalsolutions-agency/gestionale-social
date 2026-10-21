'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
export function useAITextStatus(){
 const [state,setState]=useState({available:null,message:'Verifico il servizio testi AI…'});
 useEffect(()=>{const controller=new AbortController();let active=true;
  (async()=>{try{
   const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Accedi per verificare il servizio AI.');
   const r=await fetch('/api/integration-status',{headers:{Authorization:`Bearer ${session.access_token}`},signal:controller.signal,cache:'no-store'});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Stato del servizio AI non disponibile.');
   const copy=data.services?.find(x=>x.id==='copy');if(!copy)throw Error('Stato del servizio AI non disponibile.');
   if(active)setState({available:copy.configured===true,message:copy.configured?'Ogni generazione riuscita usa 1 quota testi AI. Le proposte guidate non consumano quote.':'Testi AI da attivare. Puoi continuare con le proposte guidate, senza consumo AI.'});
  }catch(e){if(active)setState({available:null,message:e.message||'Verifica lo stato del servizio AI nella pagina Integrazioni.'})}})();
  return()=>{active=false;controller.abort()};
 },[]);return state;
}
export default function AITextStatus({state}){return <p className="aiTextStatus" role="status">{state.message} {state.available!==true&&<a href="/integrazioni">Stato dei servizi →</a>}</p>}
