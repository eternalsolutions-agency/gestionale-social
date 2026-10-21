'use client';
import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
import Shell from '../../components/BusinessToolsShell';
export default function Integrations(){const[data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);setError('');try{const{data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Accedi a KAIRO per verificare i servizi.');const r=await fetch('/api/integration-status',{headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error);setData(result)}catch(e){setError(e.message)}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 return <Shell title="I servizi del tuo workspace." eyebrow="COLLEGAMENTI E DISPONIBILITÀ"><p>Controlla la configurazione dei servizi prima di iniziare. Un servizio configurato richiede comunque il test del relativo flusso.</p><div className="actions"><button onClick={load} disabled={loading}>{loading?'Verifico…':'Aggiorna stato'}</button><a href="/workspace">Apri il workspace →</a><a href="/pubblicazione">Collega Meta →</a><a href="/abbonamento">Abbonamento e Stripe →</a></div>{error&&<p role="alert" className="notice">{error}</p>}<div className="grid">{data?.services.map(s=><article key={s.id}><span className="badge" style={{color:s.configured===true?'#176b44':'#805b15',background:s.configured===true?'#eaf8f0':'#fff6df'}}>{s.configured===true?'Configurato':s.configured===null?'Da verificare':'Da attivare'}</span><h2>{s.name}</h2><p>{s.note}</p></article>)}</div></Shell>
}
