"use client";
import {useEffect,useState} from "react";
import {BarChart3,CalendarDays,HelpCircle,PenLine,X} from "lucide-react";

const poses=[
"data:image/webp;base64,UklGRoBV...",
"data:image/webp;base64,UklGRm...",
"data:image/webp;base64,UklGRn...",
"data:image/webp;base64,UklGRo..."
];

const steps=[
  {title:"Ciao, sono Rippy!",text:"Sono il tuo assistente RP Social. Ti accompagno passo dopo passo: iniziamo configurando la tua attività.",action:"Inizia",pose:0},
  {title:"Partiamo dal tuo brand",text:"Inserisci il sito web oppure un profilo social. RP Social userà queste informazioni per costruire la tua prima analisi.",action:"Avanti",pose:1},
  {title:"Poi analizziamo",text:"Ti mostrerò punti forti, criticità e priorità, così saprai esattamente da dove partire.",action:"Avanti",pose:2},
  {title:"Infine creiamo",text:"Dalla strategia passeremo a idee, script e calendario. Quando vuoi, mi trovi sempre qui in basso a destra.",action:"Ho capito",pose:3}
];

export default function RippyAssistant(){
  const[ready,setReady]=useState(false),[open,setOpen]=useState(false),[tour,setTour]=useState(false),[step,setStep]=useState(0);
  useEffect(()=>{try{const active=localStorage.getItem("rps_session");if(active){setReady(true);if(!localStorage.getItem("rippy_onboarding_done")){setTour(true);setOpen(true)}}}catch(e){}},[]);
  if(!ready)return null;
  const next=()=>{if(step<steps.length-1)setStep(step+1);else{try{localStorage.setItem("rippy_onboarding_done","1")}catch(e){}setTour(false);setOpen(false);setStep(0)}};
  const go=(name)=>{const buttons=[...document.querySelectorAll(".sidebar nav button")];const target=buttons.find(b=>b.textContent.trim()===name);if(target)target.click();setOpen(false)};
  const pose=tour?steps[step].pose:0;
  return <>
    {open&&<div style={{position:"fixed",right:24,bottom:112,width:"min(380px,calc(100vw - 32px))",zIndex:1000,background:"#0b0b0d",border:"1px solid #28282d",borderRadius:22,boxShadow:"0 25px 80px rgba(0,0,0,.7)",overflow:"hidden",color:"white"}}>
      <div style={{height:4,background:"#ff1737"}}/>
      <div style={{height:160,position:"relative",overflow:"hidden",background:"radial-gradient(circle at 50% 100%,rgba(255,23,55,.25),transparent 58%),#070707"}}><img src={poses[pose]} alt="Rippy, assistente RP Social" style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"center"}}/><button onClick={()=>setOpen(false)} style={{position:"absolute",right:12,top:12,width:30,height:30,borderRadius:"50%",border:"1px solid #333",background:"rgba(0,0,0,.72)",color:"#aaa",cursor:"pointer",display:"grid",placeItems:"center"}}><X size={16}/></button><span style={{position:"absolute",left:14,bottom:12,padding:"6px 9px",borderRadius:8,background:"rgba(0,0,0,.75)",fontSize:9,fontWeight:900,letterSpacing:1.2,color:"#ff1737"}}>RIPPY · ASSISTENTE RP SOCIAL</span></div>
      <div style={{padding:20}}>{tour?<><div style={{fontSize:9,color:"#666",marginBottom:7}}>PASSAGGIO {step+1} DI {steps.length}</div><h3 style={{margin:"0 0 8px",fontSize:20}}>{steps[step].title}</h3><p style={{margin:"0 0 18px",fontSize:12,lineHeight:1.65,color:"#aaa"}}>{steps[step].text}</p><div style={{height:3,background:"#181818",borderRadius:4,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"#ff1737",transition:"width .25s"}}/></div><button onClick={next} style={primary}>{steps[step].action} →</button></>:<><h3 style={{margin:"0 0 5px",fontSize:18}}>Cosa vuoi fare oggi?</h3><p style={{fontSize:11,color:"#777",margin:"0 0 14px"}}>Ti porto direttamente nella sezione giusta.</p><Action icon={BarChart3} text="Analizzare il mio profilo" onClick={()=>go("Analisi")}/><Action icon={PenLine} text="Creare un contenuto" onClick={()=>go("Crea contenuti")}/><Action icon={CalendarDays} text="Preparare la settimana" onClick={()=>go("Calendario")}/><Action icon={HelpCircle} text="Rivedere la guida" onClick={()=>{setStep(0);setTour(true)}}/></>}</div>
    </div>}
    <button aria-label="Apri Rippy" onClick={()=>setOpen(!open)} style={{position:"fixed",right:24,bottom:24,width:76,height:76,zIndex:999,borderRadius:"50%",border:"2px solid #ff1737",background:"#080808",cursor:"pointer",boxShadow:"0 0 0 6px rgba(255,23,55,.08),0 12px 35px rgba(0,0,0,.55)",overflow:"hidden",padding:0}}><img src={poses[0]} alt="Rippy" style={{width:"145%",height:"145%",objectFit:"cover",objectPosition:"center 28%",transform:"translate(-15%,-10%)"}}/></button>
  </>;
}
function Action({icon:Icon,text,onClick}){return <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 12px",marginTop:7,border:"1px solid #202024",borderRadius:11,background:"#101012",color:"#ddd",cursor:"pointer",fontSize:11,textAlign:"left"}}><Icon size={16} color="#ff1737"/>{text}</button>}
const primary={width:"100%",border:0,borderRadius:11,padding:"12px 16px",background:"#ff1737",color:"white",fontWeight:900,cursor:"pointer"};