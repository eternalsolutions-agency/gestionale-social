"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export default function LandingMarketingMount(){const router=useRouter();useEffect(()=>{const bind=()=>{const landing=document.querySelector("main.landing");if(!landing)return;const routes={"Funzionalità":"/funzionalita","Come funziona":"/come-funziona","Prezzi":"/prezzi","FAQ":"/faq"};landing.querySelectorAll(".navlinks span").forEach(el=>{const route=routes[el.textContent?.trim()];if(route){el.style.cursor="pointer";el.onclick=()=>router.push(route)}})};bind();const o=new MutationObserver(bind);o.observe(document.body,{childList:true,subtree:true});return()=>o.disconnect()},[router]);return null}
