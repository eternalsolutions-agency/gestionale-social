"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import RealCreator from "./RealCreator";
export default function CreatorMount(){const[target,setTarget]=useState(null);useEffect(()=>{let last=null;const find=()=>{const page=document.querySelector(".app .page"),buttons=[...document.querySelectorAll(".sidebar nav button")],active=buttons.find(b=>b.classList.contains("active")),yes=active?.textContent?.trim()==="Crea contenuti";if(yes&&page!==last){last=page;setTarget(page)}else if(!yes&&last){last=null;setTarget(null)}};find();const o=new MutationObserver(find);o.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});return()=>o.disconnect()},[]);if(!target)return null;return createPortal(<div className="creatorRealLayer"><style>{`.creatorRealLayer{position:absolute;inset:0;z-index:60;background:#050505;min-height:100%}.app .page{position:relative}`}</style><RealCreator/></div>,target)}
