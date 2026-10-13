"use client";
import {useEffect,useState} from "react";
import {BarChart3,CalendarDays,HelpCircle,PenLine,X} from "lucide-react";

const steps=[
 {title:"Ciao, sono Rippy!",text:"Sono il tuo assistente RP Social. Ti accompagno passo dopo passo: iniziamo configurando la tua attività.",action:"Inizia",mood:"hello"},
 {title:"Partiamo dal tuo brand",text:"Inserisci il sito web oppure un profilo social. RP Social userà queste informazioni per costruire la tua prima analisi.",action:"Avanti",mood:"idea"},
 {title:"Poi analizziamo",text:"Ti mostrerò punti forti, criticità e priorità, così saprai esattamente da dove partire.",action:"Avanti",mood:"search"},
 {title:"Infine creiamo",text:"Dalla strategia passeremo a idee, script e calendario. Quando vuoi, mi trovi sempre qui in basso a destra.",action:"Ho capito",mood:"work"}
];

const css=`
@keyframes rippyFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
@keyframes rippyGlow{0%,100%{transform:scale(.9);opacity:.32}50%{transform:scale(1.12);opacity:.7}}
@keyframes rippyBlink{0%,43%,47%,100%{transform:scaleY(1)}45%{transform:scaleY(.08)}}
@keyframes rippyWave{0%,100%{transform:rotate(0deg)}30%{transform:rotate(-18deg)}60%{transform:rotate(13deg)}}
@keyframes rippyThink{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes rippyScan{0%{transform:translateX(-5px)}50%{transform:translateX(5px)}100%{transform:translateX(-5px)}}
@keyframes rippyType{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}
@keyframes rippySpark{0%{transform:translateY(4px) scale(.3);opacity:0}45%{opacity:1}100%{transform:translateY(-24px) scale(1);opacity:0}}
@keyframes rippyPanel{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
.rippy-body{transform-origin:90px 95px;animation:rippyFloat 3.4s ease-in-out infinite}.rippy-eyes{transform-origin:90px 54px;animation:rippyBlink 5.5s infinite}.rippy-wave{transform-origin:45px 108px;animation:rippyWave 2.2s ease-in-out infinite}.rippy-idea{animation:rippyThink 1.7s ease-in-out infinite}.rippy-search{animation:rippyScan 1.7s ease-in-out infinite}.rippy-work{animation:rippyType .8s ease-in-out infinite}.rippy-panel{animation:rippyPanel .24s ease-out}.rippy-launch:hover .rippy-body{animation-duration:1.3s}.rippy-launch:hover{transform:scale(1.06)}
@media (prefers-reduced-motion:reduce){.rippy-body,.rippy-eyes,.rippy-wave,.rippy-idea,.rippy-search,.rippy-work,.rippy-glow,.rippy-spark{animation:none!important}}
`;

export default function RippyAssistant(){
 const[ready,setReady]=useState(false),[open,setOpen]=useState(false),[tour,setTour]=useState(false),[step,setStep]=useState(0);
 useEffect(()=>{try{if(localStorage.getItem("rps_session")){setReady(true);if(!localStorage.getItem("rippy_onboarding_done")){setTour(true);setOpen(true)}}}catch(e){}},[]);
 if(!ready)return null;
 const next=()=>{if(step<steps.length-1)setStep(step+1);else{try{localStorage.setItem("rippy_onboarding_done","1")}catch(e){}setTour(false);setOpen(false);setStep(0)}};
 const go=(name)=>{const b=[...document.querySelectorAll(".sidebar nav button")].find(x=>x.textContent.trim()===name);if(b)b.click();setOpen(false)};
 return <><style>{css}</style>
 {open&&<div className="rippy-panel" style={{position:"fixed",right:24,bottom:112,width:"min(380px,calc(100vw - 32px))",zIndex:1000,background:"#fff",border:"1px solid #d9e5f3",borderRadius:22,boxShadow:"0 18px 55px rgba(32,76,136,.12)",overflow:"hidden",color:"#17283f"}}><div style={{height:4,background:"#1763d1"}}/><div style={{height:175,position:"relative",display:"grid",placeItems:"center",background:"#fff",overflow:"hidden"}}><div className="rippy-glow" style={{position:"absolute",width:150,height:80,borderRadius:"50%",background:"#1763d1",filter:"blur(42px)",animation:"rippyGlow 2.6s ease-in-out infinite"}}/><i className="rippy-spark" style={{position:"absolute",left:"27%",top:"60%",width:5,height:5,borderRadius:"50%",background:"#1763d1",boxShadow:"0 0 12px #1763d1",animation:"rippySpark 2.2s infinite"}}/><i className="rippy-spark" style={{position:"absolute",right:"25%",top:"68%",width:4,height:4,borderRadius:"50%",background:"white",boxShadow:"0 0 10px white",animation:"rippySpark 2.8s .7s infinite"}}/><Rippy mood={tour?steps[step].mood:"hello"} size={150}/><button onClick={()=>setOpen(false)} style={{position:"absolute",right:12,top:12,width:30,height:30,borderRadius:"50%",border:"1px solid #d9e5f3",background:"#fff",color:"#526478",cursor:"pointer",display:"grid",placeItems:"center"}}><X size={16}/></button><span style={{position:"absolute",left:14,bottom:10,padding:"6px 9px",borderRadius:8,background:"#fff",fontSize:9,fontWeight:900,letterSpacing:1.2,color:"#1763d1"}}>RIPPY · ASSISTENTE RP SOCIAL</span></div><div style={{padding:20}}>{tour?<><div style={{fontSize:9,color:"#526478",marginBottom:7}}>PASSAGGIO {step+1} DI {steps.length}</div><h3 style={{margin:"0 0 8px",fontSize:20}}>{steps[step].title}</h3><p style={{margin:"0 0 18px",fontSize:12,lineHeight:1.65,color:"#526478"}}>{steps[step].text}</p><div style={{height:3,background:"#eef5ff",borderRadius:4,overflow:"hidden",marginBottom:16}}><div style={{height:"100%",width:`${((step+1)/steps.length)*100}%`,background:"#1763d1",transition:"width .25s"}}/></div><button onClick={next} style={primary}>{steps[step].action} →</button></>:<><h3 style={{margin:"0 0 5px",fontSize:18}}>Cosa vuoi fare oggi?</h3><p style={{fontSize:11,color:"#526478",margin:"0 0 14px"}}>Ti porto direttamente nella sezione giusta.</p><Action icon={BarChart3} text="Analizzare il mio profilo" onClick={()=>go("Analisi")}/><Action icon={PenLine} text="Creare un contenuto" onClick={()=>go("Crea contenuti")}/><Action icon={CalendarDays} text="Preparare la settimana" onClick={()=>go("Calendario")}/><Action icon={HelpCircle} text="Rivedere la guida" onClick={()=>{setStep(0);setTour(true)}}/></>}</div></div>}
 <button className="rippy-launch" aria-label="Apri Rippy" onClick={()=>setOpen(!open)} style={{position:"fixed",right:24,bottom:24,width:82,height:82,zIndex:999,borderRadius:"50%",border:"2px solid #1763d1",background:"#fff",cursor:"pointer",boxShadow:"0 0 0 6px rgba(23,99,209,.07),0 0 32px rgba(23,99,209,.25),0 12px 35px #0009",display:"grid",placeItems:"center",overflow:"hidden",transition:"transform .2s"}}><div style={{position:"absolute",width:64,height:64,borderRadius:"50%",background:"#1763d1",filter:"blur(26px)",opacity:.2}}/><Rippy mood="hello" size={74}/></button></>;
}

function Rippy({size=120,mood="hello"}){return <div style={{width:size,height:size,position:"relative",zIndex:2}}><video autoPlay muted loop playsInline preload="metadata" poster="/kairo-v2/mascot.jpg" style={{width:"100%",height:"100%",objectFit:"contain"}}><source src={mood==="hello"?"/kairo-v2/greeting.mp4":"/kairo-v2/thinking.mp4"} type="video/mp4"/></video></div>}

function Action({icon:Icon,text,onClick}){return <button onClick={onClick} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"11px 12px",marginTop:7,border:"1px solid #d9e5f3",borderRadius:11,background:"#fff",color:"#174eae",cursor:"pointer",fontSize:11,textAlign:"left"}}><Icon size={16} color="#1763d1"/>{text}</button>}
const primary={width:"100%",border:0,borderRadius:11,padding:"12px 16px",background:"#1763d1",color:"white",fontWeight:900,cursor:"pointer"};
