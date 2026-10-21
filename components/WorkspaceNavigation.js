'use client';
import {useEffect} from 'react';
import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {ArrowLeft,ChevronRight} from 'lucide-react';
const pages=[['Crea','/studio-ai','Immagini e caroselli'],['Crea','/reel-builder','Reel'],['Crea','/contenuti-esterni','Carica foto e video'],['Organizza','/libreria','Libreria foto e video'],['Organizza','/calendario','Calendario'],['Organizza','/campagne','Campagne'],['Pubblica','/approvazioni','Controllo e approvazioni'],['Pubblica','/pubblicazione','Pubblicazione sui social'],['Gestisci','/kit-brand','Identità del brand'],['Gestisci','/report','Report mensili'],['Gestisci','/team','Attività e collaboratori'],['Gestisci','/abbonamento','Abbonamento'],['Gestisci','/quote','Quote AI'],['Gestisci','/integrazioni','Stato dei servizi'],['Gestisci','/lead-finder','Potenziali clienti']];
export default function WorkspaceNavigation(){
 const path=usePathname(),router=useRouter();const current=pages.find(x=>x[1]===path);
 useEffect(()=>{if(!current)return;const priority=['/workspace','/studio-ai','/calendario','/libreria','/pubblicazione'];const timer=setTimeout(()=>{priority.filter(x=>x!==path).forEach(x=>router.prefetch(x))},250);return()=>clearTimeout(timer)},[path,router,!!current]);
 if(!current)return null;
 return <nav className="workspaceRouteNav" aria-label="Navigazione degli strumenti"><div><Link className="backWorkspace" href="/workspace" prefetch><ArrowLeft size={18}/><span>Area di lavoro</span></Link><ChevronRight className="routeDivider" size={16}/><span className="currentRoute" aria-current="page">{current[2]}</span></div><label><span className="visuallyHidden">Vai a un altro strumento</span><select value={path} onFocus={()=>pages.forEach(([,url])=>router.prefetch(url))} onChange={e=>router.push(e.target.value)} aria-label="Vai a un altro strumento">{['Crea','Organizza','Pubblica','Gestisci'].map(group=><optgroup key={group} label={group}>{pages.filter(x=>x[0]===group).map(([,url,label])=><option value={url} key={url}>{label}</option>)}</optgroup>)}</select></label></nav>
}
