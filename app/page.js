"use client";

import { useState } from "react";
import {
  LayoutDashboard, Sparkles, CalendarDays, Library, Share2, Settings, Bell, Search,
  Plus, Instagram, Facebook, Linkedin, Video, Clock3, TrendingUp, WandSparkles,
  ChevronRight, Image as ImageIcon, Film, Layers3, Menu, X, ArrowRight, ArrowLeft,
  Building2, Laptop, BriefcaseBusiness, Globe2, Check, KeyRound, UserRound, LogOut, Save, Send, FileText, Smile, Target, ExternalLink, BookOpen, Copy, Trash2, CreditCard, WalletCards, BadgeEuro, CircleDollarSign, Bot, Clapperboard, Crown, ReceiptText, ArrowUpRight
} from "lucide-react";

const nav = [
  ["Dashboard", LayoutDashboard], ["Content Studio", Sparkles], ["Calendario", CalendarDays],
  ["Libreria", Library], ["Social", Share2], ["Piani & Fatturazione", CreditCard], ["Impostazioni", Settings],
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
  const [contents,setContents]=useState([]);
  const [studio,setStudio]=useState({format:"Post",channels:["Instagram"],topic:"",goal:"Informare",tone:"Professionale",provider:"OpenAI",videoProvider:"Google AI Video",result:""});
  const [form,setForm]=useState({name:"",surname:"",email:"",password:"",type:"",business:"",sector:"",description:"",website:"",socialUrl:"",api:"",socials:[]});

  const update=(k,v)=>setForm({...form,[k]:v});
  const toggleSocial=(n)=>update("socials",form.socials.includes(n)?form.socials.filter(x=>x!==n):[...form.socials,n]);

  if(mode==="welcome") return <Welcome onStart={()=>setMode("onboarding")} onDemo={()=>setMode("app")}/>;
  if(mode==="onboarding") return <Onboarding step={step} setStep={setStep} form={form} update={update} toggleSocial={toggleSocial} finish={()=>setMode("app")}/>;

  return <Dashboard active={active} setActive={setActive} mobile={mobile} setMobile={setMobile} form={form} contents={contents} setContents={setContents} studio={studio} setStudio={setStudio} logout={()=>{setMode("welcome");setStep(1)}}/>;
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

function Dashboard({active,setActive,mobile,setMobile,form,contents,setContents,studio,setStudio,logout}){
 const name=form.name||"Mario", business=form.business||"Il tuo workspace";
 return <main className="app-shell">
  <aside className={"sidebar "+(mobile?"open":"")}><div className="brand"><div className="brand-mark"><Sparkles size={22}/></div><div><strong>gestionale</strong><span>social</span></div><button className="close" onClick={()=>setMobile(false)}><X/></button></div>
   <div className="workspace"><div className="avatar">{(name[0]||"U").toUpperCase()}</div><div><b>{business}</b><small>{form.type||"Account Business"}</small></div></div>
   <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?"active":""} onClick={()=>{setActive(label);setMobile(false)}}><Icon size={19}/><span>{label}</span></button>)}</nav>
   <div className="upgrade"><div className="mini-spark"><WandSparkles size={18}/></div><b>Workspace AI</b><p>La base è pronta per automazioni e collegamenti reali.</p><button onClick={logout}><LogOut size={13}/> Torna all'accesso</button></div>
  </aside>
  <section className="content"><header><button className="hamb" onClick={()=>setMobile(true)}><Menu/></button><div className="search"><Search size={18}/><input placeholder="Cerca contenuti, campagne..."/></div><div className="header-actions"><button className="icon-btn"><Bell size={19}/><i/></button><div className="avatar small">{name[0].toUpperCase()}</div></div></header>
  <div className="page"><div className="hero"><div><span className="eyebrow">WORKSPACE / {active.toUpperCase()}</span><h1>{active==="Dashboard"?`Ciao ${name} 👋`:active}</h1><p>{active==="Dashboard"?"Il tuo spazio di lavoro è pronto. Inizia a organizzare i contenuti del brand.":"Sezione predisposta per i prossimi step di sviluppo."}</p></div><button className="primary"><Plus size={18}/> Crea contenuto</button></div>
  {active==="Dashboard"?<DashboardHome form={form}/>:
    active==="Content Studio"?<ContentStudio studio={studio} setStudio={setStudio} contents={contents} setContents={setContents}/>:
    active==="Libreria"?<LibraryView contents={contents} setContents={setContents}/>:
    active==="Piani & Fatturazione"?<BillingView/>:
    active==="Impostazioni"?<SettingsView form={form}/>:
    <Placeholder active={active}/>}</div></section>
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

function ContentStudio({studio,setStudio,contents,setContents}){
 const formats=[["Post",ImageIcon],["Carosello",Layers3],["Reel / Video",Film],["Storia",Sparkles]];
 const toggle=(n)=>setStudio({...studio,channels:studio.channels.includes(n)?studio.channels.filter(x=>x!==n):[...studio.channels,n]});
 const generate=()=>{
  const topic=studio.topic.trim()||"il tuo prossimo contenuto";
  const base=studio.format==="Carosello"
   ? `SLIDE 1 — ${topic}\n\nSLIDE 2 — Il problema\nSpiega in modo semplice perché questo tema è importante per il tuo pubblico.\n\nSLIDE 3 — Il valore\nMostra una soluzione concreta e utile.\n\nSLIDE 4 — Il consiglio\nAggiungi un suggerimento pratico che l'utente può applicare subito.\n\nSLIDE 5 — CTA\nVuoi saperne di più? Scrivici o salva questo carosello.`
   : studio.format==="Reel / Video"
   ? `HOOK\n“Se ti occupi di ${topic}, fermati 30 secondi.”\n\nSCENA 1\nPresenta il problema in modo diretto.\n\nSCENA 2\nMostra il vantaggio o la soluzione.\n\nSCENA 3\nAggiungi un esempio concreto.\n\nCTA\n“Seguici per altri contenuti come questo.”`
   : studio.format==="Storia"
   ? `STORIA 1\n👋 Oggi parliamo di ${topic}.\n\nSTORIA 2\nUna cosa importante da sapere: comunica un beneficio concreto.\n\nSTORIA 3\n💬 Vuoi approfondire? Rispondi a questa storia.`
   : `✨ ${topic}\n\nUna comunicazione efficace parte da un messaggio semplice: capire il bisogno del pubblico e trasformarlo in valore concreto.\n\nRacconta cosa rende la tua attività diversa, mostra un beneficio reale e invita le persone a fare il passo successivo.\n\n👉 Vuoi saperne di più? Contattaci.\n\n#socialmedia #business #comunicazione`;
  setStudio({...studio,result:base});
 };
 const save=()=>{if(!studio.result)return;setContents([{id:Date.now(),title:studio.topic||"Contenuto senza titolo",format:studio.format,channels:studio.channels,text:studio.result,status:"Bozza"},...contents])};
 return <div className="studio-layout">
  <section className="panel studio-builder">
   <div className="panel-head"><div><h2>Content Studio</h2><p>Configura il contenuto che vuoi creare</p></div><span className="pill purple">AI DEMO</span></div>
   <label className="studio-label">1. Formato</label><div className="format-grid">{formats.map(([n,I])=><button className={studio.format===n?"selected":""} key={n} onClick={()=>setStudio({...studio,format:n})}><I/><b>{n}</b></button>)}</div>
   <label className="studio-label">2. Canali</label><div className="channel-row">{socials.map(x=>{let I=x.icon,on=studio.channels.includes(x.name);return <button className={on?"selected":""} key={x.name} onClick={()=>toggle(x.name)}><I/><span>{x.name}</span>{on&&<Check/>}</button>})}</div>
   <label className="studio-label">3. Motore AI</label>
   <div className="provider-grid">
    <button className={studio.provider==="OpenAI"?"selected":""} onClick={()=>setStudio({...studio,provider:"OpenAI"})}><Bot/><div><b>OpenAI</b><span>Testi, idee e copy</span></div></button>
    <button className={studio.provider==="Gemini"?"selected":""} onClick={()=>setStudio({...studio,provider:"Gemini"})}><Sparkles/><div><b>Google Gemini</b><span>Testi e contenuti multimodali</span></div></button>
   </div>
   {(studio.format==="Reel / Video"||studio.format==="Storia")&&<div className="video-provider"><Clapperboard/><div><b>Video AI</b><span>{studio.videoProvider} • predisposto per Veo</span></div><select value={studio.videoProvider} onChange={e=>setStudio({...studio,videoProvider:e.target.value})}><option>Google AI Video</option></select></div>}
   <label className="studio-label">4. Di cosa vuoi parlare?</label><textarea className="topic" placeholder="Es. Voglio promuovere il nuovo servizio di consulenza per piccole attività..." value={studio.topic} onChange={e=>setStudio({...studio,topic:e.target.value})}/>
   <div className="studio-selects"><label><span>Obiettivo</span><select value={studio.goal} onChange={e=>setStudio({...studio,goal:e.target.value})}><option>Informare</option><option>Vendere</option><option>Engagement</option><option>Brand awareness</option></select></label><label><span>Tono</span><select value={studio.tone} onChange={e=>setStudio({...studio,tone:e.target.value})}><option>Professionale</option><option>Amichevole</option><option>Diretto</option><option>Creativo</option><option>Ispirazionale</option></select></label></div>
   <button className="primary generate-btn" onClick={generate}><WandSparkles/> Genera contenuto</button>
  </section>
  <section className="panel studio-output">
   <div className="panel-head"><div><h2>Anteprima</h2><p>Il risultato diventerà modificabile</p></div>{studio.result&&<button className="copy-btn" onClick={()=>navigator.clipboard?.writeText(studio.result)}><Copy/> Copia</button>}</div>
   {!studio.result?<div className="empty-output"><div><Sparkles/></div><h3>Il contenuto apparirà qui</h3><p>Configura le opzioni a sinistra e premi “Genera contenuto”.</p></div>:<>
    <div className="output-meta"><span>{studio.format}</span><span>{studio.provider}</span>{studio.channels.map(c=><span key={c}>{c}</span>)}</div>
    <textarea className="result-editor" value={studio.result} onChange={e=>setStudio({...studio,result:e.target.value})}/>
    <div className="result-actions"><button className="secondary" onClick={save}><Save/> Salva in Libreria</button><button className="primary"><CalendarDays/> Programma</button></div>
   </>}
  </section>
 </div>
}

function LibraryView({contents,setContents}){
 return <section className="panel library-panel"><div className="panel-head"><div><h2>Libreria contenuti</h2><p>Le bozze create durante questa sessione</p></div><span className="counter">{contents.length} contenuti</span></div>
 {!contents.length?<div className="library-empty"><Library/><h3>La libreria è vuota</h3><p>Crea un contenuto dal Content Studio e salvalo come bozza.</p></div>:
 <div className="library-list">{contents.map(c=><article key={c.id}><div className="library-type"><FileText/></div><div className="library-copy"><div><b>{c.title}</b><span>{c.format} • {c.channels.join(", ")}</span></div><p>{c.text.slice(0,150)}{c.text.length>150?"...":""}</p></div><span className="draft">{c.status}</span><button className="trash" onClick={()=>setContents(contents.filter(x=>x.id!==c.id))}><Trash2/></button></article>)}</div>}</section>
}


function BillingView(){
 const [annual,setAnnual]=useState(false);
 const [selected,setSelected]=useState("Pro");
 const plans=[
  {name:"Start",price:"19,90",annual:"199",desc:"Per freelance e piccole attività",features:["1 brand","2 canali social","Calendario editoriale","Libreria contenuti","AI con API personale","Post e caroselli"],featured:false},
  {name:"Pro",price:"34,90",annual:"349",desc:"Per chi pubblica con continuità",features:["3 brand","4 canali social","Tutto di Start","Reel e Stories","OpenAI + Gemini","Google AI Video / Veo ready","Piani editoriali AI"],featured:true},
  {name:"Agency",price:"69,90",annual:"699",desc:"Per agenzie e gestione multi-cliente",features:["10 brand","4 social per brand","Tutto di Pro","Workspace multi-cliente","Gestione team predisposta","Priorità funzionalità","Dashboard avanzata"],featured:false}
 ];
 return <div className="billing-wrap">
  <section className="billing-hero panel">
   <div><span className="pill purple">GESTIONALE SOCIAL SaaS</span><h2>Scegli il piano giusto per il tuo lavoro</h2><p>I pagamenti reali verranno collegati successivamente. La V4 mostra già il flusso commerciale completo.</p></div>
   <div className="billing-toggle"><button className={!annual?"active":""} onClick={()=>setAnnual(false)}>Mensile</button><button className={annual?"active":""} onClick={()=>setAnnual(true)}>Annuale <span>2 mesi circa inclusi</span></button></div>
  </section>
  <div className="plans-grid">
   {plans.map(plan=><article className={"plan-card panel "+(plan.featured?"featured":"")} key={plan.name}>
    {plan.featured&&<div className="popular"><Crown/> PIÙ SCELTO</div>}
    <div className="plan-top"><div><h3>{plan.name}</h3><p>{plan.desc}</p></div><div className="plan-price"><b>€ {annual?plan.annual:plan.price}</b><span>+ IVA / {annual?"anno":"mese"}</span></div></div>
    <div className="plan-features">{plan.features.map(f=><span key={f}><Check/> {f}</span>)}</div>
    <button className={plan.featured?"primary plan-btn":"secondary plan-btn"} onClick={()=>setSelected(plan.name)}>{selected===plan.name?"Piano selezionato":"Scegli "+plan.name}</button>
   </article>)}
  </div>
  <section className="panel payment-panel">
   <div className="panel-head"><div><h2>Metodo di pagamento</h2><p>Piano selezionato: <b>{selected}</b></p></div><span className="status-demo">DEMO V4</span></div>
   <div className="payment-grid">
    <button><div className="pay-icon stripe"><CreditCard/></div><div><b>Stripe</b><span>Carta di credito/debito e pagamenti ricorrenti</span></div><ArrowUpRight/></button>
    <button><div className="pay-icon paypal"><WalletCards/></div><div><b>PayPal</b><span>Abbonamento ricorrente tramite account PayPal</span></div><ArrowUpRight/></button>
   </div>
   <div className="billing-note"><ReceiptText/><div><b>Fatturazione</b><span>Il prezzo mostrato è al netto IVA. Nella versione reale collegheremo checkout, rinnovi, fatture, upgrade/downgrade e cancellazione.</span></div></div>
  </section>
 </div>
}

function SettingsView({form}){
 const [tab,setTab]=useState("AI");
 const [showOpenAI,setShowOpenAI]=useState(true);
 const [showGemini,setShowGemini]=useState(true);
 return <div className="settings-layout">
  <section className="panel settings-nav"><h2>Impostazioni</h2><button className={tab==="AI"?"active":""} onClick={()=>setTab("AI")}><Bot/> AI & API</button><button className={tab==="Brand"?"active":""} onClick={()=>setTab("Brand")}><Building2/> Profilo Brand</button><button className={tab==="Account"?"active":""} onClick={()=>setTab("Account")}><UserRound/> Account</button></section>
  {tab!=="AI"?<section className="panel placeholder settings-placeholder"><div className="big-icon"><Settings/></div><h2>{tab==="Brand"?"Profilo Brand":"Account"}</h2><p>Sezione predisposta per i prossimi step.</p></section>:
  <section className="panel api-settings">
   <span className="pill purple">PROVIDER AI</span><h2>AI & API</h2><p className="settings-intro">Gestionale Social potrà usare la chiave API personale dell'utente. In V4 i collegamenti sono ancora dimostrativi e nessuna credenziale viene salvata.</p>
   <div className="provider-settings-grid">
    <article className="provider-setting-card"><div className="provider-title"><div className="api-status-icon"><Bot/></div><div><b>OpenAI</b><span>Copy, idee, piani editoriali e assistenza contenuti</span></div><span className={form.api?"status-demo":"status-off"}>{form.api?"DEMO":"NON COLLEGATA"}</span></div>
     <div className="api-field-demo"><label>OpenAI API Key</label><div><input type="password" value={form.api||""} readOnly placeholder="sk-..."/><button>Verifica</button></div></div>
     <button className="guide-toggle" onClick={()=>setShowOpenAI(!showOpenAI)}><BookOpen/> Guida OpenAI <ChevronRight/></button>
     {showOpenAI&&<div className="mini-guide"><p><b>1.</b> Accedi alla piattaforma OpenAI.</p><p><b>2.</b> Configura la fatturazione API se richiesta.</p><p><b>3.</b> Crea una Secret API key.</p><p><b>4.</b> In futuro inseriscila qui: mai nel codice GitHub.</p><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Apri API Keys <ExternalLink/></a></div>}
    </article>
    <article className="provider-setting-card"><div className="provider-title"><div className="api-status-icon gemini"><Sparkles/></div><div><b>Google Gemini</b><span>Gemini API + predisposizione Google AI Video / Veo</span></div><span className="status-off">NON COLLEGATA</span></div>
     <div className="api-field-demo"><label>Gemini API Key</label><div><input type="password" readOnly placeholder="Inserisci la chiave Gemini in futuro"/><button>Verifica</button></div></div>
     <button className="guide-toggle" onClick={()=>setShowGemini(!showGemini)}><BookOpen/> Guida Gemini / Veo <ChevronRight/></button>
     {showGemini&&<div className="mini-guide"><p><b>1.</b> Apri Google AI Studio.</p><p><b>2.</b> Crea o visualizza una Gemini API key.</p><p><b>3.</b> Per modelli a pagamento abilita la fatturazione prevista da Google.</p><p><b>4.</b> I modelli video compatibili, come Veo, useranno l'integrazione Google AI.</p><a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Apri Google AI Studio <ExternalLink/></a></div>}
    </article>
   </div>
   <div className="security-warning"><b>Sicurezza delle chiavi</b><p>Non inserire ancora credenziali reali nella V4. Quando attiveremo le API, le chiamate passeranno dal server e le chiavi non dovranno mai finire nel repository GitHub o nel JavaScript inviato al browser.</p></div>
  </section>}
 </div>
}

function Stat({icon:Icon,value,label,note}){return <div className="stat"><div className="stat-icon"><Icon/></div><div><b className="stat-value">{value}</b><span>{label}</span><small>{note}</small></div></div>}
function Placeholder({active}){let c={"Content Studio":["Crea con l'AI","Post, caroselli, Reel e Stories saranno gestiti da qui."],"Calendario":["Calendario editoriale","Programma e organizza visivamente tutti i contenuti."],"Libreria":["Libreria contenuti","Archivia bozze, immagini, video e contenuti pubblicati."],"Social":["Collega i social","Facebook, Instagram, LinkedIn e TikTok saranno configurabili qui."],"Impostazioni":["Impostazioni account","Profilo, brand, sito web, OpenAI e preferenze."]}[active];return <section className="placeholder panel"><div className="big-icon"><Sparkles/></div><span className="pill">GESTIONALE SOCIAL</span><h2>{c[0]}</h2><p>{c[1]}</p><button className="primary">Sezione predisposta</button></section>}
