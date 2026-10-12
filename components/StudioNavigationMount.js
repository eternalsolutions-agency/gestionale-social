"use client";
import {useEffect} from "react";
import {Sparkles} from "lucide-react";

export default function StudioNavigationMount(){
 useEffect(()=>{
  const wire=()=>{
   const nav=document.querySelector(".sidebar nav");
   if(!nav)return;
   const buttons=[...nav.querySelectorAll("button")];
   const library=buttons.find(b=>(b.textContent||"").trim()==="Libreria");
   if(library&&!library.dataset.realLibrary){
    library.dataset.realLibrary="1";
    library.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();window.location.href="/libreria";},true);
   }
   if(!nav.querySelector("[data-rp-studio]")){
    const studio=document.createElement("button");
    studio.type="button";
    studio.dataset.rpStudio="1";
    studio.innerHTML='<span class="rp-studio-icon">✦</span><span>Studio AI</span>';
    studio.addEventListener("click",()=>{window.location.href="/studio-ai";});
    if(library)nav.insertBefore(studio,library);else nav.appendChild(studio);
   }
  };
  wire();
  const observer=new MutationObserver(wire);
  observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 return <style>{`.sidebar nav [data-rp-studio]{position:relative}.sidebar nav [data-rp-studio] .rp-studio-icon{width:18px;display:inline-flex;align-items:center;justify-content:center;color:#ff1737;font-size:17px}.sidebar nav [data-rp-studio] span:last-child{font:inherit}`}</style>;
}
