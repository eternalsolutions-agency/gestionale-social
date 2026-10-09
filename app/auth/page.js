"use client";
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
  const enterApp=()=>{localStorage.setItem("rps_session","authenticated");router.replace("/")};
  useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session)enterApp()})},[]);

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

  return <main style={{minHeight:"100vh",background:"#050505",color:"#fff",display:"grid",placeItems:"center",padding:24,fontFamily:"Arial,sans-serif"}}>
    <div style={{position:"fixed",width:420,height:420,borderRadius:"50%",background:"#ff1737",filter:"blur(180px)",opacity:.13,top:-160,right:-100}}/>
    <section style={{width:"100%",maxWidth:430,border:"1px solid #222",background:"#0b0b0d",borderRadius:22,padding:30,boxShadow:"0 25px 80px rgba(0,0,0,.55)",position:"relative"}}>
      <button onClick={()=>router.push("/")} style={{border:0,background:"transparent",color:"#777",cursor:"pointer",padding:0,marginBottom:26}}>← Torna a RP Social</button>
      <div style={{marginBottom:25}}><div style={{fontSize:26,fontWeight:900,letterSpacing:-1}}>RP <span style={{color:"#ff1737"}}>SOCIAL</span></div><div style={{fontSize:9,letterSpacing:3,color:"#777",marginTop:3}}>BY RP DIGITAL</div></div>
      <h1 style={{fontSize:30,margin:"0 0 7px"}}>{tab==="login"?"Bentornato.":"Crea il tuo account."}</h1>
      <p style={{color:"#888",fontSize:13,lineHeight:1.6,margin:"0 0 24px"}}>{tab==="login"?"Accedi al tuo workspace RP Social.":"Inizia a costruire la tua strategia social."}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,background:"#111",padding:5,borderRadius:12,marginBottom:22}}>
        <button onClick={()=>{setTab("login");setError("");setMessage("")}} style={tabStyle(tab==="login")}>Accedi</button>
        <button onClick={()=>{setTab("register");setError("");setMessage("")}} style={tabStyle(tab==="register")}>Registrati</button>
      </div>
      <form onSubmit={submit} style={{display:"grid",gap:14}}>
        {tab==="register"&&<Field label="Nome e cognome" value={name} setValue={setName} placeholder="Il tuo nome" required/>}
        <Field label="Email" value={email} setValue={setEmail} placeholder="nome@email.it" type="email" required/>
        <Field label="Password" value={password} setValue={setPassword} placeholder="Minimo 6 caratteri" type="password" required/>
        {error&&<div style={{fontSize:12,color:"#ff5c70",background:"rgba(255,23,55,.08)",border:"1px solid rgba(255,23,55,.25)",padding:12,borderRadius:10}}>{error}</div>}
        {message&&<div style={{fontSize:12,color:"#b9f6ca",background:"rgba(80,200,120,.08)",border:"1px solid rgba(80,200,120,.2)",padding:12,borderRadius:10}}>{message}</div>}
        <button disabled={loading} style={{border:0,borderRadius:12,padding:"14px 18px",fontWeight:800,background:"#ff1737",color:"white",cursor:"pointer",marginTop:4}}>{loading?"Attendi...":tab==="login"?"Accedi a RP Social":"Crea account"}</button>
      </form>
      <p style={{fontSize:10,color:"#555",textAlign:"center",margin:"20px 0 0"}}>Accesso protetto tramite Supabase Auth.</p>
    </section>
  </main>
}
function Field({label,value,setValue,placeholder,type="text",required}){return <label style={{display:"grid",gap:7,fontSize:11,fontWeight:700,color:"#bbb"}}>{label}<input type={type} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder} required={required} style={{width:"100%",boxSizing:"border-box",border:"1px solid #262626",background:"#080808",color:"#fff",borderRadius:11,padding:"13px 14px",outline:"none"}}/></label>}
function tabStyle(active){return{border:0,borderRadius:9,padding:10,cursor:"pointer",fontWeight:800,fontSize:11,background:active?"#ff1737":"transparent",color:active?"#fff":"#777"}}
