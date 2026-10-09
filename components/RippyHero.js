"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";

export default function RippyHero(){
  const [hero,setHero]=useState(null);

  useEffect(()=>{
    const findHero=()=>setHero(document.querySelector(".landing .hero"));
    findHero();
    const observer=new MutationObserver(findHero);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  if(!hero)return null;

  return createPortal(<>
    <style>{`
      .landing .hero{position:relative;overflow:hidden;isolation:isolate;min-height:620px}
      .landing .hero .herocopy{position:relative;z-index:4;max-width:650px}
      .landing .heroapp{display:none!important}
      .rippyHero{position:absolute;z-index:1;right:-2%;top:50%;transform:translateY(-50%);width:min(61vw,900px);height:100%;min-height:620px;pointer-events:none;overflow:hidden}
      .rippyHero:before{content:"";position:absolute;inset:5% 2% 4% 12%;background:radial-gradient(circle at 64% 48%,rgba(255,23,55,.18),rgba(255,23,55,.05) 32%,transparent 67%);filter:blur(16px);z-index:0}
      .rippyHero:after{content:"";position:absolute;inset:0;z-index:2;background:linear-gradient(90deg,#050505 0%,rgba(5,5,5,.96) 5%,rgba(5,5,5,.68) 19%,transparent 43%),linear-gradient(0deg,#050505 0%,transparent 18%,transparent 82%,#050505 100%)}
      .rippyHero video{position:absolute;z-index:1;width:100%;height:100%;object-fit:cover;object-position:center center;mix-blend-mode:screen;filter:contrast(1.06) saturate(1.06)}
      .rippyHeroBadge{position:absolute;z-index:3;right:8%;bottom:9%;padding:9px 13px;border:1px solid rgba(255,23,55,.28);border-radius:999px;background:rgba(5,5,5,.64);backdrop-filter:blur(12px);color:#fff;font-size:10px;letter-spacing:.08em;box-shadow:0 0 24px rgba(255,23,55,.12)}
      .rippyHeroBadge b{color:#ff1737}
      @media(max-width:900px){.landing .hero{min-height:auto;padding-bottom:390px}.rippyHero{top:auto;bottom:0;right:-12%;transform:none;width:124%;height:430px;min-height:0}.rippyHero:after{background:linear-gradient(180deg,#050505 0%,rgba(5,5,5,.25) 22%,transparent 48%),linear-gradient(0deg,#050505 0%,transparent 22%)}.rippyHeroBadge{right:18%;bottom:7%}}
      @media(max-width:560px){.landing .hero{padding-bottom:330px}.rippyHero{height:360px;width:142%;right:-22%}.rippyHeroBadge{right:22%;font-size:9px}}
      @media(prefers-reduced-motion:reduce){.rippyHero video{display:none}}
    `}</style>
    <div className="rippyHero" aria-hidden="true">
      <video autoPlay muted loop playsInline preload="metadata" poster="/rippy-hero-poster.jpg">
        <source src="/rippy-hero.mp4" type="video/mp4"/>
      </video>
      <div className="rippyHeroBadge">CIAO, SONO <b>RIPPY</b> · IL TUO ASSISTENTE RP SOCIAL</div>
    </div>
  </>,hero);
}
