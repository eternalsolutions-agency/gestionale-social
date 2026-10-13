"use client";
import KairoBrand from "../../components/KairoBrand";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

export default function AuthPage(){
  const router=useRouter();
  const[tab,setTab]=useState("login");
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[password,setPassword]=useState("");
  const[loading,setLoading]=useState(false);
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");
  const[session,setSession]=useState(null);
  const enterApp=()=>router.replace("/workspace");
  useEffect(()=>{
    const requestedTab=new URLSearchParams(window.location.search).get("tab");
    setTab(requestedTab==="register"?"register":"login");
    supabase.auth.getSession().then(({data})=>setSession(data.session||null));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next||null));
    return()=>listener.subscription.unsubscribe();
  },[]);

  async function logout(){setLoading(true);setError("");const {error}=await supabase.auth.signOut();if(error)setError("Non sono riuscito a disconnettere l'account. Riprova.");else{setSession(null);setEmail("");setPassword("");setMessage("Account disconnesso. Ora puoi accedere con un altro account.");}setLoading(false)}
  async function submit(e){
    e.preventDefault();setLoading(true);setError("");setMessage("");
    if(password.length<6){setError("La password deve contenere almeno 6 caratteri.");setLoading(false);return}
    if(tab==="register"){
      const {data,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name}}});
      if(error)setError(error.message);
      else if(data.session)enterApp();
      else setMessage("Registrazione completata. Controlla la tua email per confermare l'account, poi accedi.");
    }else{
      const {error}=await supabase.auth.signInWithPassword({email,password});
      if(error)setError("Email o password non corrette.");
      else enterApp();
    }
    setLoading(false);
  }

  return <main style={{minHeight:"100vh",background:"#fff",color:"#17283f",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,sans-serif"}}>
    <div style={{position:"fixed",width:420,height:420,borderRadius:"50%",background:"#568dff",filter:"blur(180px)",opacity:.16,top:-160,right:-100}}/>
    <section style={{width:"100%",maxWidth:430,border:"1px solid #d9e5f3",background:"#fff",borderRadius:22,padding:30,boxShadow:"0 18px 55px rgba(32,76,136,.09)",position:"relative"}}>
      <button onClick={()=>router.push("/")} style={{border:0,background:"transparent",color:"#8293ad",cursor:"pointer",padding:0,marginBottom:26}}>← Torna a KAIRO</button>
      <div style={{marginBottom:25}}><KairoBrand/></div>
      {session?<><h1 style={{fontSize:30,margin:"0 0 7px"}}>Sei già connesso.</h1><p style={{color:"#526478",fontSize:13,lineHeight:1.6,margin:"0 0 20px"}}>Sessione attiva{session.user?.email?<> come <b style={{color:"#17283f"}}>{session.user.email}</b></>:null}. Puoi continuare nel workspace oppure cambiare account.</p><div style={{display:"grid",gap:10}}><button onClick={enterApp} style={{border:0,borderRadius:12,padding:"14px 18px",fontWeight:800,background:"#1763d1",color:"white",cursor:"pointer"}}>Continua nel workspace</button><button disabled={loading} onClick={logout} style={{border:"1px solid #d9e5f3",borderRadius:12,padding:"14px 18px",fontWeight:800,background:"#fff",color:"#17283f",cursor:"pointer"}}>{loading?"Disconnessione...":"Esci / Cambia account"}</button></div>{error&&<div style={{marginTop:14,fontSize:12,color:"#b42332"}}>{error}</div>}</>:<><h1 style={{fontSize:30,margin:"0 0 7px"}}>{tab==="login"?"Bentornato.":"Crea il tuo account."}</h1><p style={{color:"#526478",fontSize:13,lineHeight:1.6,margin:"0 0 24px"}}>{tab==="login"?"Accedi al tuo workspace KAIRO.":"Inizia a costruire la tua strategia social."}</p><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,background:"#fff",padding:5,borderRadius:12,marginBottom:22}}><button onClick={()=>{setTab("login");setError("");setMessage("")}} style={tabStyle(tab==="login")}>Accedi</button><button onClick={()=>{setTab("register");setError("");setMessage("")}} style={tabStyle(tab==="register")}>Registrati</button></div><form onSubmit={submit} style={{display:"grid",gap:14}}>{tab==="register"&&<Field label="Nome e cognome" value={name} setValue={setName} placeholder="Il tuo nome" required/>}<Field label="Email" value={email} setValue={setEmail} placeholder="nome@email.it" type="email" required/><Field label="Password" value={password} setValue={setPassword} placeholder="Minimo 6 caratteri" type="password" required/>{error&&<div style={{fontSize:12,color:"#b42332",background:"rgba(255,80,110,.08)",border:"1px solid rgba(255,80,110,.25)",padding:12,borderRadius:10}}>{error}</div>}{message&&<div style={{fontSize:12,color:"#167245",background:"rgba(80,200,120,.08)",border:"1px solid rgba(80,200,120,.2)",padding:12,borderRadius:10}}>{message}</div>}<button disabled={loading} style={{border:0,borderRadius:12,padding:"14px 18px",fontWeight:800,background:"#1763d1",color:"white",cursor:"pointer",marginTop:4}}>{loading?"Attendi...":tab==="login"?"Accedi a KAIRO":"Crea account"}</button></form></>}
      <p style={{fontSize:10,color:"#586b88",textAlign:"center",margin:"20px 0 0"}}>Accesso protetto tramite Supabase Auth.</p>
    </section>
  </main>
}
function Field({label,value,setValue,placeholder,type="text",required}){return <label style={{display:"grid",gap:7,fontSize:11,fontWeight:700,color:"#17283f"}}>{label}<input type={type} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} required={required} style={{width:"100%",boxSizing:"border-box",border:"1px solid #d9e5f3",background:"#fff",color:"#17283f",borderRadius:11,padding:"13px 14px",outline:"none"}}/></label>}
function tabStyle(active){return{border:0,borderRadius:9,padding:10,cursor:"pointer",fontWeight:800,fontSize:11,background:active?"#1763d1":"transparent",color:active?"white":"#8293ad"}}
