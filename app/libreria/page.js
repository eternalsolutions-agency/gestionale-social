"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,FolderOpen,Image as ImageIcon,Loader2,RefreshCw,Trash2,Upload} from "lucide-react";
import {useRouter} from "next/navigation";
import {supabase} from "../../lib/supabase";

const BUCKET="rp-social-media";
const filters=["Tutti","Upload","Immagini AI","Prodotti","Brand"];

export default function Library(){
 const router=useRouter();
 const inputRef=useRef(null);
 const[filter,setFilter]=useState("Tutti");
 const[assets,setAssets]=useState([]);
 const[loading,setLoading]=useState(true);
 const[uploading,setUploading]=useState(false);
 const[message,setMessage]=useState("");

 useEffect(()=>{loadAssets();},[]);

 async function context(){
  const{data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)throw new Error("Accedi a RP Social per usare la Libreria.");
  const{data:business,error:businessError}=await supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("created_at",{ascending:true}).limit(1).maybeSingle();
  if(businessError)throw businessError;
  if(!business)throw new Error("Completa prima l'onboarding della tua attività.");
  return{user,business};
 }

 async function loadAssets(){
  setLoading(true);setMessage("");
  try{
   const{user}=await context();
   const{data,error}=await supabase.from("media_assets").select("id,title,kind,source,storage_path,mime_type,metadata,created_at").eq("owner_id",user.id).order("created_at",{ascending:false});
   if(error)throw error;
   const hydrated=await Promise.all((data||[]).map(async asset=>{
    if(!asset.storage_path)return asset;
    const{data:file,error:fileError}=await supabase.storage.from(BUCKET).download(asset.storage_path);
    if(fileError)return asset;
    return{...asset,preview:URL.createObjectURL(file)};
   }));
   setAssets(current=>{current.forEach(a=>a.preview&&URL.revokeObjectURL(a.preview));return hydrated;});
  }catch(error){setMessage(error.message||"Impossibile caricare la Libreria.");}
  finally{setLoading(false);}
 }

 async function uploadFile(event){
  const file=event.target.files?.[0];event.target.value="";
  if(!file)return;
  if(!file.type.startsWith("image/")){setMessage("Per questa prima versione carica immagini JPG, PNG o WebP. I video arriveranno con upload resumable.");return;}
  if(file.size>6*1024*1024){setMessage("Per ora il limite per singola immagine è 6 MB.");return;}
  setUploading(true);setMessage("");
  let uploadedPath="";
  try{
   const{user,business}=await context();
   const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"").toLowerCase();
   uploadedPath=`${user.id}/${business.id}/${crypto.randomUUID()}.${ext}`;
   const{error:uploadError}=await supabase.storage.from(BUCKET).upload(uploadedPath,file,{contentType:file.type,upsert:false});
   if(uploadError)throw uploadError;
   const{error:rowError}=await supabase.from("media_assets").insert({business_id:business.id,owner_id:user.id,kind:"image",source:"upload",title:file.name,storage_path:uploadedPath,mime_type:file.type,metadata:{size:file.size,original_name:file.name}});
   if(rowError)throw rowError;
   setMessage("Immagine caricata nella Media Library.");
   await loadAssets();
  }catch(error){if(uploadedPath)await supabase.storage.from(BUCKET).remove([uploadedPath]);setMessage(error.message||"Upload non riuscito.");}
  finally{setUploading(false);}
 }

 async function removeAsset(asset){
  if(!confirm(`Eliminare ${asset.title||"questo contenuto"}?`))return;
  setMessage("");
  try{
   if(asset.storage_path){const{error}=await supabase.storage.from(BUCKET).remove([asset.storage_path]);if(error)throw error;}
   const{error}=await supabase.from("media_assets").delete().eq("id",asset.id);if(error)throw error;
   if(asset.preview)URL.revokeObjectURL(asset.preview);
   setAssets(current=>current.filter(x=>x.id!==asset.id));setMessage("Contenuto eliminato.");
  }catch(error){setMessage(error.message||"Eliminazione non riuscita.");}
 }

 const visible=assets.filter(a=>filter==="Tutti"||(filter==="Upload"&&a.source==="upload")||(filter==="Immagini AI"&&a.source==="ai")||(filter==="Prodotti"&&a.source==="product")||(filter==="Brand"&&a.source==="brand"));
 return <main className="lib"><style>{css}</style><nav><button onClick={()=>router.push('/')}><ArrowLeft/> RP Social</button><b>MEDIA LIBRARY</b></nav><header><div><span>ASSET DEL BRAND</span><h1>Tutto il materiale creativo, in un solo posto.</h1><p>Le immagini vengono salvate nel tuo Storage privato Supabase e restano isolate per utente tramite RLS.</p></div><div className="actions"><button className="secondary" onClick={loadAssets}><RefreshCw/> Aggiorna</button><button className="upload" disabled={uploading} onClick={()=>inputRef.current?.click()}>{uploading?<Loader2 className="spin"/>:<Upload/>}{uploading?" Caricamento...":" Carica immagine"}</button><input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadFile}/></div></header><div className="filters">{filters.map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>{message&&<div className="notice">{message}</div>}{loading?<section className="empty"><Loader2 className="spin"/><h2>Carico la tua libreria…</h2></section>:visible.length?<section className="grid">{visible.map(asset=><article key={asset.id}><div className="preview">{asset.preview?<img src={asset.preview} alt={asset.title||"Media RP Social"}/>:<ImageIcon/>}</div><div className="meta"><div><b>{asset.title||"Immagine"}</b><small>{asset.source==="ai"?"Generata con AI":"Upload"} · {new Date(asset.created_at).toLocaleDateString("it-IT")}</small></div><button onClick={()=>removeAsset(asset)} title="Elimina"><Trash2/></button></div></article>)}</section>:<section className="empty"><FolderOpen/><h2>La tua libreria è pronta.</h2><p>Carica la prima immagine: verrà salvata nello Storage RP Social e registrata nel database per essere riutilizzata da Creator e Studio AI.</p><button className="upload" onClick={()=>inputRef.current?.click()}><Upload/> Carica la prima immagine</button></section>}</main>}

const css=`*{box-sizing:border-box}.lib{min-height:100vh;background:#070708;color:#fff;padding:28px;font-family:Arial,sans-serif}.lib nav,.lib header,.filters,.empty,.grid,.notice{max-width:1150px;margin-left:auto;margin-right:auto}.lib nav{display:flex;justify-content:space-between;align-items:center}.lib nav button,.secondary{display:flex;align-items:center;gap:7px;background:#111114;border:1px solid #28282e;color:#ddd;padding:10px 13px;border-radius:10px;cursor:pointer}.lib nav svg,.secondary svg{width:15px}.lib nav b{font-size:11px;color:#ff1737;letter-spacing:.15em}.lib header{margin-top:65px;display:flex;align-items:end;justify-content:space-between;gap:20px}.lib header span{font-size:9px;color:#ff1737;font-weight:900;letter-spacing:.15em}.lib h1{font-size:clamp(34px,5vw,55px);letter-spacing:-.05em;max-width:750px;margin:8px 0}.lib header p,.empty p{color:#7f7f88;font-size:11px;line-height:1.7;max-width:650px}.actions{display:flex;gap:8px}.upload{border:0;background:#ff1737;color:#fff;border-radius:11px;padding:12px 15px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:900;cursor:pointer}.upload:disabled{opacity:.6}.upload svg{width:16px}.filters{display:flex;gap:7px;flex-wrap:wrap;margin-top:30px}.filters button{background:#0d0d0f;border:1px solid #27272d;color:#777;padding:9px 12px;border-radius:20px;font-size:9px;cursor:pointer}.filters button.active{background:#ff1737;border-color:#ff1737;color:#fff}.notice{margin-top:14px;background:#111114;border:1px solid #29292f;border-radius:12px;padding:12px;color:#aaa;font-size:11px}.empty{min-height:360px;margin-top:14px;border:1px dashed #303038;border-radius:20px;background:radial-gradient(circle at 50% 20%,rgba(255,23,55,.08),transparent 45%),#0a0a0b;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px}.empty>svg{width:45px;height:45px;color:#ff1737}.empty h2{font-size:25px;margin:14px 0 3px}.empty .upload{margin-top:14px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px}.grid article{background:#0c0c0e;border:1px solid #24242a;border-radius:16px;overflow:hidden}.preview{aspect-ratio:1/1;background:#111114;display:flex;align-items:center;justify-content:center}.preview img{width:100%;height:100%;object-fit:cover}.preview>svg{width:38px;color:#555}.meta{display:flex;align-items:center;justify-content:space-between;padding:12px;gap:10px}.meta>div{display:grid;gap:5px;min-width:0}.meta b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.meta small{font-size:9px;color:#707078}.meta button{background:#151518;border:1px solid #29292f;color:#888;border-radius:9px;padding:8px;cursor:pointer}.meta button:hover{color:#fff;border-color:#ff1737}.meta svg{width:15px;height:15px}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:850px){.grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:700px){.lib{padding:16px}.lib header{align-items:flex-start;flex-direction:column;margin-top:40px}.actions{width:100%;flex-wrap:wrap}.grid{grid-template-columns:1fr}}`;