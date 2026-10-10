"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import RealCalendar from "./RealCalendar";
export default function CalendarMount(){const[target,setTarget]=useState(null);useEffect(()=>{let last=null;const find=()=>{const page=document.querySelector(".app .page"),active=[...document.querySelectorAll(".sidebar nav button")].find(b=>b.classList.contains("active")),yes=active?.textContent?.trim()==="Calendario";if(yes&&page!==last){last=page;setTarget(page)}else if(!yes&&last){last=null;setTarget(null)}};find();const o=new MutationObserver(find);o.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});return()=>o.disconnect()},[]);if(!target)return null;return createPortal(<div className="calendarRealLayer"><style>{`.calendarRealLayer{position:absolute;inset:0;z-index:61;background:#050505;min-height:100%}.app .page{position:relative}`}</style><RealCalendar/></div>,target)}
