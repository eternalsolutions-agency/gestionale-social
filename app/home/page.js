"use client";
import FlowBackdrop from "../../components/FlowBackdrop";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Menu,X,ArrowRight,BookOpen,CalendarDays,Check,Search,Sparkles,Target,Zap} from "lucide-react";
import KairoBrand from "../../components/KairoBrand";
import FreeAudit from "../../components/FreeAudit";

function Brand(){return <KairoBrand/>}

export default function KairoHome(){
  const router=useRouter();
  const auditRef=useRef(null);
  const introRef=useRef(null);
  useEffect(()=>{
    const video=introRef.current;
    if(!video)return;
    const observer=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){video.play().catch(()=>{})}else{video.pause()}
    },{threshold:0.35});
    observer.observe(video);
    return()=>observer.disconnect();
  },[]);
  const[menuOpen,setMenuOpen]=useState(false);
  const auth=tab=>router.push(`/auth?tab=${tab}`);
  const audit=()=>auditRef.current?.open();
  useEffect(()=>{if(new URLSearchParams(window.location.search).get("audit")==="1")auditRef.current?.open()},[]);
  const go=p=>{setMenuOpen(false);router.push(p)};
  const steps=[
    [Search,"Analizza","KAIRO comprende brand, presenza online e opportunità."],
    [Target,"Pianifica","Obiettivi e pubblico diventano un piano editoriale concreto."],
    [BookOpen,"Trova idee","Ricevi idee e script coerenti con il tuo business."],
    [Sparkles,"Crea","Genera copy e creatività mantenendo il tuo stile."],
    [CalendarDays,"Programma","Organizza i contenuti nel calendario e mantieni costanza."]
  ];

  return (
    <main className="landing">
      <nav className="landingnav">
        <Brand/>
        <div className={menuOpen?"navlinks open":"navlinks"}>
          <button onClick={()=>go("/funzionalita")}>Funzionalità</button>
          <button onClick={()=>go("/come-funziona")}>Come funziona</button>
          <button onClick={()=>go("/prezzi")}>Prezzi</button>
          <button onClick={()=>go("/faq")}>FAQ</button>
        </div>
        <div className="navactions">
          <button className="outline" onClick={()=>auth("login")}>Accedi</button>
          <button className="redbtn" onClick={audit}>Prova gratis</button><button className="homeMenuButton" aria-label={menuOpen?"Chiudi menu":"Apri menu"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
        </div>
      </nav>

      <section className="hero">
        <div className="herocopy">
          <div className="kicker">KAIRO · AI SOCIAL WORKSPACE</div>
          <h1>I tuoi social,<br/><em>senza il caos.</em></h1>
          <p>KAIRO studia il tuo brand e ti aiuta a decidere cosa pubblicare, come comunicarlo e quando farlo. Tu mantieni il controllo. L&apos;AI accelera il lavoro.</p>
          <div className="heroactions">
            <button className="redbtn big" onClick={audit}><Zap/> Analizza il mio brand <ArrowRight/></button>
            <button className="outline big" onClick={()=>auth("login")}>Entra nel workspace</button>
          </div>
          <div className="ticks">
            <span><Check/> Analisi immediata</span>
            <span><Check/> Piano editoriale</span>
            <span><Check/> Contenuti pronti</span>
          </div>
        </div>
        <div className="heroVisual"><video autoPlay muted loop playsInline preload="metadata" poster="/kairo-v2/mascot.jpg" aria-label="KAIRO ti dà il benvenuto"><source src="/kairo-v2/greeting.mp4" type="video/mp4"/></video><img className="mascotStill" src="/kairo-v2/mascot.jpg" alt="KAIRO, il tuo assistente social"/></div>
      </section>
      <section className="kairoIntro"><div className="introCopy"><span>CONOSCI KAIRO</span><h2>Il tuo assistente.<br/>Il tuo prossimo passo.</h2><p>Guarda l’introduzione e scopri il mondo KAIRO. Attiva l’audio dai controlli per ascoltarlo.</p></div><div className="introPlayer"><video ref={introRef} muted loop controls playsInline preload="auto" poster="/kairo-v2/intro-poster.jpg?v=2" aria-label="Video introduttivo KAIRO"><source src="/kairo-v2/kairo-labs-intro-v2.mp4" type="video/mp4"/></video></div></section>

      <FreeAudit ref={auditRef} onRegister={()=>auth("register")}/>

      <section className="kairoFlow">
        <div className="flowHead">
          <span>UN FLUSSO SEMPLICE</span>
          <h2>Dal tuo brand ai contenuti.<br/>Tutto nello stesso posto.</h2>
          <p>Niente strumenti sparsi e niente pagine complicate. KAIRO trasforma il lavoro social in cinque passaggi chiari.</p>
        </div>
        <div className="features">
          {steps.map(([,title,description])=>(
            <div className="feature kairoImageCard" key={title}>
              <FlowBackdrop title={title}/>
              <b>{title}</b>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="kairoExamples"><article><img src="/kairo-v2/social.jpg" alt="KAIRO con i suoi strumenti social" loading="lazy"/><div><h3>Una direzione per i tuoi social.</h3><p>Analisi, strategia e calendario per lavorare con più chiarezza.</p></div></article><article><img src="/kairo-v2/content.jpg" alt="KAIRO ti aiuta a creare contenuti" loading="lazy"/><div><h3>Più spazio alle tue idee.</h3><p>Copy, visual, caroselli, Reel e Storie nel tuo Studio AI.</p></div></article></section>
      <section className="kairoPromise">
        <span>KAIRO</span>
        <h2>La strategia resta tua.<br/>Il lavoro ripetitivo lo fa l&apos;AI.</h2>
        <p>Un workspace pensato per attività, professionisti e team che vogliono comunicare meglio senza passare ore davanti ai social.</p>
        <button className="redbtn big" onClick={audit}>Inizia dall&apos;analisi <ArrowRight/></button>
      </section>

      <footer><Brand/><p>KAIRO · AI Social Workspace</p></footer>
    </main>
  );
}

