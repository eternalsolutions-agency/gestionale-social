"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import RealAnalysis from "./RealAnalysis";

export default function AnalysisGate(){
 const[target,setTarget]=useState(null),[active,setActive]=useState(false);
 useEffect(()=>{
  let obs;
  const sync=()=>{
   const page=document.querySelector(".app .main .page");
   const buttons=[...document.querySelectorAll(".sidebar nav button")];
   const analysis=buttons.find(b=>b.textContent?.trim()==="Analisi");
   setTarget(page||null);setActive(!!analysis?.classList.contains("active"));
  };
  sync();obs=new MutationObserver(sync);obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["class"]});
  document.addEventListener("click",sync,true);
  return()=>{obs.disconnect();document.removeEventListener("click",sync,true)};
 },[]);
 if(!target||!active)return null;
 return createPortal(<div className="realAnalysisLayer"><style>{`.realAnalysisLayer{position:absolute;inset:0;z-index:50;background:#050505;min-height:100%;padding:0}.app .page{position:relative}`}</style><RealAnalysis/></div>,target)
}
