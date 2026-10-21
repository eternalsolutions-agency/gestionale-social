"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import RealIdeas from "./RealIdeas";
export default function IdeasMount(){const[target,setTarget]=useState(null);useEffect(()=>{let last=null;const find=()=>{const page=document.querySelector(".app .page"),marker=page?.querySelector(".eyebrow"),yes=marker?.textContent?.trim()==="SCRIPT LIBRARY";if(yes&&page!==last){last=page;setTarget(page)}else if(!yes&&last){last=null;setTarget(null)}};find();const o=new MutationObserver(find);o.observe(document.body,{childList:true,subtree:true,characterData:true});return()=>o.disconnect()},[]);if(!target)return null;return createPortal(<><style>{`.app .page>.pagehead,.app .page>.filters,.app .page>.scriptgrid{display:none!important}.app .page>.riWrap{display:block!important}`}</style><RealIdeas/></>,target)}
