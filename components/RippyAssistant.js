"use client";
import {useEffect,useState} from "react";
import {BarChart3,CalendarDays,HelpCircle,PenLine,Sparkles,X} from "lucide-react";

const steps=[
  {title:"Ciao, sono Rippy!",text:"Sono il tuo assistente RP Social. Ti accompagno passo dopo passo: iniziamo configurando la tua attività.",action:"Inizia"},
  {title:"Partiamo dal tuo brand",text:"Inserisci il sito web oppure un profilo social. RP Social userà queste informazioni per costruire la tua prima analisi.",action:"Avanti"},
  {title:"Poi analizziamo",text:"Ti mostrerò punti forti, criticità e priorità, così saprai esattamente da dove partire.",action:"Avanti"},
  {title:"Infine creiamo",text:"Dalla strategia passeremo a idee, script e calendario. Quando vuoi, mi trovi sempre qui in basso a destra.",action:"Ho capito"}
];

export default function RippyAssistant({onNavigate}){
  const[open,setOpen]=useState(false),[tour,setTour]=useState(false),[step,setStep]=useState(0);
  useEffect(()=>{try{if(!localStorage.getItem("rippy_onboarding_done")){setTour(true);setOpen(true)}}catch(e){}},[]);
  const next=()=>{if(step<steps.length-1)setStep(step+1);else{try{localStorage.setItem("rippy_onboarding_done","1")}catch(e){}setTour(false);setOpen(false);setStep(0)}};
  const go=(name)=>{onNavigate?.(name);setOpen(false)};
  return <>
    {open&&<div style={{position:"fixed",right:24,bottom:105,width:"min(360px,calc(100vw - 32px))",zIndex:1000,background:"#0b0b0d",border:"1px solid #28282d",borderRadius:20,boxShadow:"0 25px 80px rgba(0,0,0,.65)",overflow:"hidden",color:"white"}}>
      <div style={{height:4,background:"#ff1737"}}/>
      <div style={{padding:20}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}><div style={{width:54,height:54,borderRadius:18,display:"grid",placeItems:"center",background:"linear-gradient(145deg,#fff,#c9c9c9)",border:"3px solid #ff1737",boxShadow:"0 0 25px rgba(255,23,55,.25)",color:"#080808",fontWeight:1000,fontSize:16}}>RP</div><div style={{flex:1}}><b style={{fontSize:15}}>Rippy</b><div style={{fontSize:9,letterSpacing:1.5,color:"#ff1737",fontWeight:800}}>ASSISTENTE RP SOCIAL</div></div><button onClick={()=>setOpen(false)} style={{border:0,background:"transparent",color:"#777",cursor:"pointer"}}><X size={18}/></button></div>
        {tour?<><div style={{fontSize:10,color:"#777",marginBottom:7}}>PASSAGGIO {step+1} DI {steps.length}</div><h3 style={{margin:"0 0 8px",fontSize:19}}>{steps[step].title}</h3><p style={{margin:"0 0 18px",fontSize:12,lineHeight:1.65,color:"#aaa"}}>{steps[step].text}</p><div style={{height:3,background:"#181818",borderRadius:4,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"#ff1737"}}/></div><button onClick={next} style={primary}>{steps[step].action} →</button></>:<><h3 style={{margin:"0 0 5px",fontSize:18}}>Cosa vuoi fare?</h3><p style={{fontSize:11,color:"#777",margin:"0 0 14px"}}>Dimmi dove vuoi andare e ti accompagno.</p><Action icon={BarChart3} text="Analizzare il mio profilo" onClick={()=>go("Analisi")}/><Action icon={PenLine} text="Creare un contenuto" onClick={()=>go("Crea contenuti")}/><Action icon={CalendarDays} text="Preparare la settimana" onClick={()=>go("Calendario")}/><Action icon={HelpCircle} text="Rivedere la guida" onClick={()=>{setStep(0);setTour(true)}}/></>}
      </div>
    </div>}
    <button aria-label="Apri Rippy" onClick={()=>setOpen(!open)} style={{position:"fixed",right:24,bottom:24,width:66,height:66,zIndex:999,borderRadius:"50%",border:"2px solid #ff1737",background:"#090909",color:"white",cursor:"pointer",boxShadow:"0 0 0 6px rgba(255,23,55,.08),0 12px 35px rgba(0,0,0,.5)",display:"grid",placeItems:"center"}}><span style={{fontWeight:1000,fontSize:18}}>RP</span><Sparkles size={15} style={{position:"absolute",right:4,top:2,color:"#ff1737"}}/></button>
  </>
}
function Action({icon:Icon,text,onClick}){return <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 12px",marginTop:7,border:"1px solid #202024",borderRadius:11,background:"#101012",color:"#ddd",cursor:"pointer",fontSize:11,textAlign:"left"}}><Icon size={16} color="#ff1737"/>{text}</button>}
const primary={width:"100%",border:0,borderRadius:11,padding:"12px 16px",background:"#ff1737",color:"white",fontWeight:900,cursor:"pointer"};
