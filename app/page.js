"use client";

import { useState } from "react";
import {
  LayoutDashboard, Sparkles, CalendarDays, Library, Share2, Settings,
  Bell, Search, Plus, Instagram, Facebook, Linkedin, Video, Clock3,
  TrendingUp, WandSparkles, ChevronRight, Image as ImageIcon, Film,
  Layers3, Menu, X
} from "lucide-react";

const nav = [
  ["Dashboard", LayoutDashboard],
  ["Content Studio", Sparkles],
  ["Calendario", CalendarDays],
  ["Libreria", Library],
  ["Social", Share2],
  ["Impostazioni", Settings],
];

const social = [
  { name:"Instagram", icon:Instagram, cls:"ig", status:"Connesso" },
  { name:"Facebook", icon:Facebook, cls:"fb", status:"Connesso" },
  { name:"LinkedIn", icon:Linkedin, cls:"li", status:"Da collegare" },
  { name:"TikTok", icon:Video, cls:"tk", status:"Da collegare" },
];

const scheduled = [
  {day:"18", month:"AGO", title:"5 idee per migliorare la presenza online", channel:"Instagram", time:"10:30", type:"Carosello"},
  {day:"20", month:"AGO", title:"Dietro le quinte del nostro lavoro", channel:"Facebook", time:"18:00", type:"Post"},
  {day:"22", month:"AGO", title:"3 errori da evitare sui social", channel:"Instagram", time:"12:00", type:"Reel"},
];

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [mobile, setMobile] = useState(false);

  return (
    <main className="app-shell">
      <aside className={"sidebar " + (mobile ? "open":"")}>
        <div className="brand">
          <div className="brand-mark"><Sparkles size={22}/></div>
          <div><strong>gestionale</strong><span>social</span></div>
          <button className="close" onClick={()=>setMobile(false)}><X/></button>
        </div>

        <div className="workspace">
          <div className="avatar">RP</div>
          <div><b>Il tuo workspace</b><small>Account Business</small></div>
        </div>

        <nav>
          {nav.map(([label, Icon]) => (
            <button key={label} className={active===label ? "active":""}
              onClick={()=>{setActive(label);setMobile(false)}}>
              <Icon size={19}/><span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="upgrade">
          <div className="mini-spark"><WandSparkles size={18}/></div>
          <b>Potenzia il tuo lavoro</b>
          <p>AI, automazioni e più profili social saranno disponibili nei prossimi step.</p>
          <button>Scopri il progetto</button>
        </div>
      </aside>

      <section className="content">
        <header>
          <button className="hamb" onClick={()=>setMobile(true)}><Menu/></button>
          <div className="search"><Search size={18}/><input placeholder="Cerca contenuti, campagne..."/></div>
          <div className="header-actions"><button className="icon-btn"><Bell size={19}/><i/></button><div className="avatar small">RP</div></div>
        </header>

        <div className="page">
          <div className="hero">
            <div>
              <span className="eyebrow">WORKSPACE / {active.toUpperCase()}</span>
              <h1>{active === "Dashboard" ? "Buon pomeriggio 👋" : active}</h1>
              <p>{active === "Dashboard" ? "Organizza, crea e programma i contenuti del tuo brand da un unico posto." : "Questa sezione è già predisposta per i prossimi step di sviluppo."}</p>
            </div>
            <button className="primary"><Plus size={18}/> Crea contenuto</button>
          </div>

          {active !== "Dashboard" ? <Placeholder active={active}/> : <>
            <div className="stats">
              <Stat icon={CalendarDays} value="8" label="Contenuti programmati" note="+3 questa settimana"/>
              <Stat icon={Share2} value="2/4" label="Social collegati" note="Collega altri canali"/>
              <Stat icon={Sparkles} value="24" label="Contenuti AI creati" note="Questo mese"/>
              <Stat icon={TrendingUp} value="+18%" label="Attività" note="vs. mese scorso"/>
            </div>

            <div className="grid-main">
              <section className="panel">
                <div className="panel-head"><div><h2>Prossimi contenuti</h2><p>La tua programmazione editoriale</p></div><button className="link">Vedi calendario <ChevronRight size={16}/></button></div>
                <div className="schedule-list">
                  {scheduled.map((s,i)=><div className="schedule" key={i}>
                    <div className="date"><b>{s.day}</b><span>{s.month}</span></div>
                    <div className="sched-info"><b>{s.title}</b><div><span>{s.channel}</span><span><Clock3 size={14}/>{s.time}</span><span>{s.type}</span></div></div>
                    <button className="dots">•••</button>
                  </div>)}
                </div>
              </section>

              <section className="panel ai-card">
                <div className="ai-orb"><Sparkles/></div>
                <span className="pill">AI CONTENT ASSISTANT</span>
                <h2>Che cosa vuoi pubblicare oggi?</h2>
                <p>Descrivi un argomento e lascia che l'AI prepari il contenuto per i tuoi social.</p>
                <div className="prompt"><textarea placeholder="Es. Crea un post per promuovere il mio nuovo servizio..."/><button><WandSparkles size={17}/> Genera</button></div>
                <div className="quick"><button>💡 Dammi 5 idee</button><button>📅 Piano editoriale</button></div>
              </section>
            </div>

            <div className="bottom-grid">
              <section className="panel">
                <div className="panel-head"><div><h2>I tuoi canali</h2><p>Stato dei collegamenti social</p></div><button className="link">Gestisci <ChevronRight size={16}/></button></div>
                <div className="social-grid">
                  {social.map((s,i)=>{const Icon=s.icon;return <div className="social-card" key={i}>
                    <div className={"social-icon "+s.cls}><Icon size={22}/></div>
                    <div><b>{s.name}</b><small className={s.status==="Connesso"?"connected":""}>{s.status}</small></div>
                    <span className={s.status==="Connesso"?"dot ok":"dot"}/>
                  </div>})}
                </div>
              </section>

              <section className="panel">
                <div className="panel-head"><div><h2>Crea rapidamente</h2><p>Scegli il formato</p></div></div>
                <div className="create-grid">
                  <button><ImageIcon/><span><b>Post</b><small>Immagine + copy</small></span></button>
                  <button><Layers3/><span><b>Carosello</b><small>Più slide</small></span></button>
                  <button><Film/><span><b>Reel</b><small>Video verticale</small></span></button>
                  <button><Sparkles/><span><b>Storia</b><small>Contenuto rapido</small></span></button>
                </div>
              </section>
            </div>
          </>}
        </div>
      </section>
    </main>
  );
}

function Stat({icon:Icon,value,label,note}) {
  return <div className="stat"><div className="stat-icon"><Icon/></div><div><b className="stat-value">{value}</b><span>{label}</span><small>{note}</small></div></div>
}

function Placeholder({active}) {
 const copy = {
  "Content Studio":["Crea con l'AI","Post, caroselli, Reel e Stories saranno gestiti da qui."],
  "Calendario":["Calendario editoriale","Programma e organizza visivamente tutti i contenuti."],
  "Libreria":["Libreria contenuti","Archivia bozze, immagini, video e contenuti pubblicati."],
  "Social":["Collega i social","Facebook, Instagram, LinkedIn e TikTok saranno configurabili qui."],
  "Impostazioni":["Impostazioni account","Profilo, brand, sito web, OpenAI e preferenze."]
 }[active];
 return <section className="placeholder panel"><div className="big-icon"><Sparkles/></div><span className="pill">GESTIONALE SOCIAL</span><h2>{copy[0]}</h2><p>{copy[1]}</p><button className="primary">Sezione predisposta</button></section>
}
