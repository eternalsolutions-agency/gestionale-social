"use client";

import { useState } from "react";
import {
  LayoutDashboard, Sparkles, CalendarDays, Library, Share2, Settings, Bell, Search,
  Plus, Instagram, Facebook, Linkedin, Video, Clock3, TrendingUp, WandSparkles,
  ChevronRight, Image as ImageIcon, Film, Layers3, Menu, X, ArrowRight, ArrowLeft,
  Building2, Laptop, BriefcaseBusiness, Globe2, Check, KeyRound, UserRound, LogOut
} from "lucide-react";

const nav = [
  ["Dashboard", LayoutDashboard], ["Content Studio", Sparkles], ["Calendario", CalendarDays],
  ["Libreria", Library], ["Social", Share2], ["Impostazioni", Settings],
];

const socials = [
  {name:"Instagram",icon:Instagram,cls:"ig"},{name:"Facebook",icon:Facebook,cls:"fb"},
  {name:"LinkedIn",icon:Linkedin,cls:"li"},{name:"TikTok",icon:Video,cls:"tk"}
];

export default function Home(){
  const [mode,setMode]=useState("welcome");
  const [step,setStep]=useState(1);
  const [active,setActive]=useState("Dashboard");
  const [mobile,setMobile]=useState(false);
  const [form,setForm]=useState({name:"",surname:"",email:"",password:"",type:"",business:"",sector:"",description:"",website:"",socialUrl:"",api:"",socials:[]});

  const update=(k,v)=>setForm({...form,[k]:v});
  const toggleSocial=(n)=>update("socials",form.socials.includes(n)?form.socials.filter(x=>x!==n):[...form.socials,n]);

  if(mode==="welcome") return <Welcome onStart={()=>setMode("onboarding")} onDemo={()=>setMode("app")}/>;
  if(mode==="onboarding") return <Onboarding step={step} setStep={setStep} form={form} update={update} toggleSocial={toggleSocial} finish={()=>setMode("app")}/>;

  return <Dashboard active={active} setActive={setActive} mobile={mobile} setMobile={setMobile} form={form} logout={()=>{setMode("welcome");setStep(1)}}/>;
}

function Welcome({onStart,onDemo}){
 return <main className="welcome">
   <div className="welcome-bg one"/><div className="welcome-bg two"/>
   <div className="welcome-nav"><Logo/><span>V2 • Early preview</span></div>
   <section className="welcome-card">
     <div className="welcome-copy">
       <span className="badge"><Sparkles size={14}/> Il tuo social workspace intelligente</span>
       <h1>Crea. Programma.<br/><em>Fatti notare.</em></h1>
       <p>Un unico spazio per organizzare il tuo brand, creare contenuti con l'AI e preparare la pubblicazione sui tuoi social.</p>
       <div className="welcome-actions"><button className="primary big" onClick={onStart}>Crea il tuo workspace <ArrowRight size={18}/></button><button className="ghost" onClick={onDemo}>Esplora la demo</button></div>
       <div className="trust"><span><Check/> Onboarding guidato</span><span><Check/> Multi-social</span><span><Check/> AI ready</span></div>
     </div>
     <div className="preview">
       <div className="preview-top"><i/><i/><i/><span>gestionale-social</span></div>
       <div className="preview-body">
         <div className="preview-side"><b>GS</b>{[1,2,3,4,5].map(x=><i key={x}/>)}</div>
         <div className="preview-main"><small>DASHBOARD</small><h3>Buon pomeriggio 👋</h3><div className="mini-stats"><i/><i/><i/></div><div className="mini-chart"><span/><span/><span/><span/><span/><span/><span/></div></div>
       </div>
     </div>
   </section>
 </main>
}

function Logo(){return <div className="brand logo-dark"><div className="brand-mark"><Sparkles size={22}/></div><div><strong>gestionale</strong><span>social</span></div></div>}

function Onboarding({step,setStep,form,update,toggleSocial,finish}){
 const total=6;
 const next=()=>step<total?setStep(step+1):finish();
 return <main className="onboarding">
   <div className="onboard-top"><Logo/><div className="progress-wrap"><span>Configurazione {step} di {total}</span><div className="progress"><i style={{width:`${step/total*100}%`}}/></div></div></div>
   <section className="onboard-shell">
     <div className="step-label">STEP {String(step).padStart(2,"0")}</div>
     {step===1&&<Step1 form={form} update={update}/>}
     {step===2&&<Step2 form={form} update={update}/>}
     {step===3&&<Step3 form={form} update={update}/>}
     {step===4&&<Step4 form={form} update={update}/>}
     {step===5&&<Step5 form={form} update={update}/>}
     {step===6&&<Step6 form={form} toggleSocial={toggleSocial}/>}
     <div className="onboard-actions">{step>1?<button className="back" onClick={()=>setStep(step-1)}><ArrowLeft/> Indietro</button>:<span/>}<button className="primary big" onClick={next}>{step===total?"Entra nella dashboard":"Continua"} <ArrowRight/></button></div>
   </section>
   <p className="demo-note">Versione dimostrativa: i dati inseriti non vengono salvati su un database.</p>
 </main>
}

const Field=({label,icon:Icon,...props})=><label className="field"><span>{label}</span><div>{Icon&&<Icon size={18}/>}<input {...props}/></div></label>;

function Step1({form,update}){return <div className="step-content"><div className="step-icon"><UserRound/></div><h1>Iniziamo da te.</h1><p>Crea il profilo che utilizzerai per accedere al tuo workspace.</p><div className="form-grid"><Field label="Nome" placeholder="Mario" value={form.name} onChange={e=>update("name",e.target.value)}/><Field label="Cognome" placeholder="Rossi" value={form.surname} onChange={e=>update("surname",e.target.value)}/><Field label="Email" placeholder="nome@email.it" value={form.email} onChange={e=>update("email",e.target.value)}/><Field label="Password" type="password" placeholder="••••••••" value={form.password} onChange={e=>update("password",e.target.value)}/></div></div>}
function Step2({form,update}){let opts=[["Azienda",Building2,"Team, società o brand"],["Freelance",Laptop,"Lavori in autonomia"],["Libero professionista",BriefcaseBusiness,"Studio o attività professionale"]];return <div className="step-content"><div className="step-icon"><BriefcaseBusiness/></div><h1>Come lavori?</h1><p>Ci aiuterà a personalizzare l'esperienza e i contenuti.</p><div className="choice-grid">{opts.map(([n,I,d])=><button key={n} className={"choice "+(form.type===n?"selected":"")} onClick={()=>update("type",n)}><I/><b>{n}</b><span>{d}</span>{form.type===n&&<i><Check/></i>}</button>)}</div></div>}
function Step3({form,update}){return <div className="step-content"><div className="step-icon"><Building2/></div><h1>Parlaci della tua attività.</h1><p>Queste informazioni diventeranno il primo contesto del tuo brand.</p><div className="form-stack"><Field label="Nome attività / Brand" placeholder="Es. Studio Rossi" value={form.business} onChange={e=>update("business",e.target.value)}/><Field label="Settore" placeholder="Es. Marketing, ristorazione, consulenza..." value={form.sector} onChange={e=>update("sector",e.target.value)}/><label className="field"><span>Descrizione breve</span><textarea placeholder="Racconta in poche righe cosa fai e a chi ti rivolgi..." value={form.description} onChange={e=>update("description",e.target.value)}/></label></div></div>}
function Step4({form,update}){return <div className="step-content"><div className="step-icon"><Globe2/></div><h1>Dove possiamo conoscerti?</h1><p>Inserisci il tuo sito oppure una pagina social. In futuro l'AI potrà usarli per comprendere meglio il brand.</p><div className="form-stack"><Field icon={Globe2} label="Sito web" placeholder="https://www.tuosito.it" value={form.website} onChange={e=>update("website",e.target.value)}/><Field icon={Share2} label="Pagina social principale" placeholder="https://instagram.com/..." value={form.socialUrl} onChange={e=>update("socialUrl",e.target.value)}/></div><div className="info-box">💡 Puoi compilare anche uno solo dei due campi.</div></div>}
function Step5({form,update}){return <div className="step-content"><div className="step-icon"><KeyRound/></div><h1>Prepara il tuo assistente AI.</h1><p>Predisponiamo il collegamento a OpenAI. In questa V2 la chiave rimane solo nell'interfaccia demo e non viene memorizzata.</p><div className="form-stack"><Field icon={KeyRound} label="OpenAI API Key" type="password" placeholder="sk-..." value={form.api} onChange={e=>update("api",e.target.value)}/></div><div className="security-box"><b>🔐 Nota sulla sicurezza</b><span>Nella versione definitiva le chiavi API non saranno mai esposte pubblicamente nel browser e verranno gestite lato server.</span></div></div>}
function Step6({form,toggleSocial}){return <div className="step-content"><div className="step-icon"><Share2/></div><h1>Scegli i tuoi canali.</h1><p>Seleziona i social che vorresti gestire. I collegamenti OAuth reali arriveranno negli step successivi.</p><div className="social-choice">{socials.map(s=>{let I=s.icon,sel=form.socials.includes(s.name);return <button key={s.name} className={sel?"selected":""} onClick={()=>toggleSocial(s.name)}><div className={"social-icon "+s.cls}><I/></div><b>{s.name}</b><span>{sel?<><Check/> Selezionato</>:"Seleziona"}</span></button>})}</div></div>}

function Dashboard({active,setActive,mobile,setMobile,form,logout}){
 const name=form.name||"Mario", business=form.business||"Il tuo workspace";
 return <main className="app-shell">
  <aside className={"sidebar "+(mobile?"open":"")}><div className="brand"><div className="brand-mark"><Sparkles size={22}/></div><div><strong>gestionale</strong><span>social</span></div><button className="close" onClick={()=>setMobile(false)}><X/></button></div>
   <div className="workspace"><div className="avatar">{(name[0]||"U").toUpperCase()}</div><div><b>{business}</b><small>{form.type||"Account Business"}</small></div></div>
   <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?"active":""} onClick={()=>{setActive(label);setMobile(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
   <div className="upgrade"><div className="mini-spark"><WandSparkles size={18}/></div><b>Workspace AI</b><p>La base è pronta per automazioni e collegamenti reali.</p><button onClick={logout}><LogOut size={13}/> Torna all'accesso</button></div>
  </aside>
  <section className="content"><header><button className="hamb" onClick={()=>setMobile(true)}><Menu/></button><div className="search"><Search size={18}/><input placeholder="Cerca contenuti, campagne..."/></div><div className="header-actions"><button className="icon-btn"><Bell size={19}/><i/></button><div className="avatar small">{name[0].toUpperCase()}</div></div></header>
  <div className="page"><div className="hero"><div><span className="eyebrow">WORKSPACE / {active.toUpperCase()}</span><h1>{active==="Dashboard"?`Ciao ${name} 👋`:active}</h1><p>{active==="Dashboard"?"Il tuo spazio di lavoro è pronto. Inizia a organizzare i contenuti del brand.":"Sezione predisposta per i prossimi step di sviluppo."}</p></div><button className="primary"><Plus size={18}/> Crea contenuto</button></div>
  {active!=="Dashboard"?<Placeholder active={active}/>:<DashboardHome form={form}/>}</div></section>
 </main>
}

function DashboardHome({form}){
 const selected=form.socials.length||2;
 const scheduled=[["18","AGO","5 idee per migliorare la presenza online","Instagram","10:30","Carosello"],["20","AGO","Dietro le quinte del nostro lavoro","Facebook","18:00","Post"],["22","AGO","3 errori da evitare sui social","Instagram","12:00","Reel"]];
 return <><div className="stats"><Stat icon={CalendarDays} value="8" label="Contenuti programmati" note="+3 questa settimana"/><Stat icon={Share2} value={`${selected}/4`} label="Social selezionati" note="Configurazione iniziale"/><Stat icon={Sparkles} value="24" label="Contenuti AI creati" note="Demo workspace"/><Stat icon={TrendingUp} value="+18%" label="Attività" note="vs. mese scorso"/></div>
 <div className="grid-main"><section className="panel"><div className="panel-head"><div><h2>Prossimi contenuti</h2><p>La tua programmazione editoriale</p></div><button className="link">Vedi calendario <ChevronRight size={16}/></button></div><div className="schedule-list">{scheduled.map((s,i)=><div className="schedule" key={i}><div className="date"><b>{s[0]}</b><span>{s[1]}</span></div><div className="sched-info"><b>{s[2]}</b><div><span>{s[3]}</span><span><Clock3 size={14}/>{s[4]}</span><span>{s[5]}</span></div></div><button className="dots">•••</button></div>)}</div></section>
 <section className="panel ai-card"><div className="ai-orb"><Sparkles/></div><span className="pill">AI CONTENT ASSISTANT</span><h2>Che cosa vuoi pubblicare oggi?</h2><p>Descrivi un argomento e prepara il contenuto per i tuoi social.</p><div className="prompt"><textarea placeholder="Es. Crea un post per promuovere il mio nuovo servizio..."/><button><WandSparkles size={17}/> Genera</button></div><div className="quick"><button>💡 Dammi 5 idee</button><button>📅 Piano editoriale</button></div></section></div>
 <div className="bottom-grid"><section className="panel"><div className="panel-head"><div><h2>I tuoi canali</h2><p>Canali scelti durante l'onboarding</p></div><button className="link">Gestisci <ChevronRight size={16}/></button></div><div className="social-grid">{socials.map(s=>{let I=s.icon,on=form.socials.length?form.socials.includes(s.name):["Instagram","Facebook"].includes(s.name);return <div className="social-card" key={s.name}><div className={"social-icon "+s.cls}><I size={22}/></div><div><b>{s.name}</b><small className={on?"connected":""}>{on?"Selezionato":"Da collegare"}</small></div><span className={on?"dot ok":"dot"}/></div>})}</div></section>
 <section className="panel"><div className="panel-head"><div><h2>Crea rapidamente</h2><p>Scegli il formato</p></div></div><div className="create-grid"><button><ImageIcon/><span><b>Post</b><small>Immagine + copy</small></span></button><button><Layers3/><span><b>Carosello</b><small>Più slide</small></span></button><button><Film/><span><b>Reel</b><small>Video verticale</small></span></button><button><Sparkles/><span><b>Storia</b><small>Contenuto rapido</small></span></button></div></section></div></>
}
function Stat({icon:Icon,value,label,note}){return <div className="stat"><div className="stat-icon"><Icon/></div><div><b className="stat-value">{value}</b><span>{label}</span><small>{note}</small></div></div>}
function Placeholder({active}){let c={"Content Studio":["Crea con l'AI","Post, caroselli, Reel e Stories saranno gestiti da qui."],"Calendario":["Calendario editoriale","Programma e organizza visivamente tutti i contenuti."],"Libreria":["Libreria contenuti","Archivia bozze, immagini, video e contenuti pubblicati."],"Social":["Collega i social","Facebook, Instagram, LinkedIn e TikTok saranno configurabili qui."],"Impostazioni":["Impostazioni account","Profilo, brand, sito web, OpenAI e preferenze."]}[active];return <section className="placeholder panel"><div className="big-icon"><Sparkles/></div><span className="pill">GESTIONALE SOCIAL</span><h2>{c[0]}</h2><p>{c[1]}</p><button className="primary">Sezione predisposta</button></section>}
