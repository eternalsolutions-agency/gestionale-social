"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import RealStrategy from "./RealStrategy";

export default function StrategyMount(){
 const[target,setTarget]=useState(null);
 useEffect(()=>{
  let last=null;
  const find=()=>{
   const page=document.querySelector(".app .page");
   const marker=page?.querySelector(".eyebrow");
   const isStrategy=marker?.textContent?.trim()==="STRATEGIA PERSONALIZZATA";
   if(isStrategy&&page!==last){last=page;setTarget(page)}
   else if(!isStrategy&&last){last=null;setTarget(null)}
  };
  find();const o=new MutationObserver(find);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect();
 },[]);
 if(!target)return null;
 return createPortal(<><style>{`.app .page>.pagehead,.app .page>.panel,.app .page>.panel+div{display:none!important}.app .page>.rsWrap{display:block!important}`}</style><RealStrategy/></>,target);
}
