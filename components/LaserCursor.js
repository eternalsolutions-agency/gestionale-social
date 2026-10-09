"use client";

import {useEffect,useRef,useState} from "react";

export default function LaserCursor(){
  const dot=useRef(null);
  const ring=useRef(null);
  const trail=useRef(null);
  const [enabled,setEnabled]=useState(false);

  useEffect(()=>{
    const fine=window.matchMedia("(pointer:fine)").matches;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!fine||reduced)return;
    setEnabled(true);

    let x=-100,y=-100,rx=-100,ry=-100,tx=-100,ty=-100,raf;
    const interactive="a,button,input,textarea,select,label,[role='button']";

    const move=e=>{
      x=e.clientX;y=e.clientY;
      const active=!!e.target.closest(interactive);
      ring.current?.classList.toggle("laser-hover",active);
      dot.current?.classList.toggle("laser-hover",active);
      document.documentElement.classList.add("rp-laser-active");
    };
    const leave=()=>document.documentElement.classList.remove("rp-laser-active");
    const enter=()=>document.documentElement.classList.add("rp-laser-active");
    const down=()=>ring.current?.classList.add("laser-click");
    const up=()=>ring.current?.classList.remove("laser-click");

    const animate=()=>{
      rx+=(x-rx)*.24; ry+=(y-ry)*.24;
      tx+=(x-tx)*.11; ty+=(y-ty)*.11;
      if(dot.current) dot.current.style.transform=`translate3d(${x}px,${y}px,0)`;
      if(ring.current) ring.current.style.transform=`translate3d(${rx}px,${ry}px,0)`;
      if(trail.current) trail.current.style.transform=`translate3d(${tx}px,${ty}px,0)`;
      raf=requestAnimationFrame(animate);
    };
    animate();
    window.addEventListener("mousemove",move,{passive:true});
    document.addEventListener("mouseleave",leave);
    document.addEventListener("mouseenter",enter);
    window.addEventListener("mousedown",down);
    window.addEventListener("mouseup",up);
    return()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove",move);
      document.removeEventListener("mouseleave",leave);
      document.removeEventListener("mouseenter",enter);
      window.removeEventListener("mousedown",down);
      window.removeEventListener("mouseup",up);
      document.documentElement.classList.remove("rp-laser-active");
    };
  },[]);

  if(!enabled)return null;
  return <>
    <style>{`
      @media (pointer:fine){
        .rp-laser-active,.rp-laser-active *{cursor:none!important}
        .rpLaserDot,.rpLaserRing,.rpLaserTrail{position:fixed;left:0;top:0;pointer-events:none;z-index:2147483647;opacity:0;will-change:transform}
        .rp-laser-active .rpLaserDot,.rp-laser-active .rpLaserRing,.rp-laser-active .rpLaserTrail{opacity:1}
        .rpLaserDot{width:5px;height:5px;margin:-2.5px 0 0 -2.5px;border-radius:50%;background:#fff;box-shadow:0 0 5px #fff,0 0 11px #ff1737,0 0 20px rgba(255,23,55,.8)}
        .rpLaserRing{width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:1px solid rgba(255,35,66,.72);box-shadow:inset 0 0 7px rgba(255,23,55,.12),0 0 10px rgba(255,23,55,.18);transition:width .16s ease,height .16s ease,margin .16s ease,border-color .16s ease,box-shadow .16s ease}
        .rpLaserTrail{width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:radial-gradient(circle,rgba(255,23,55,.13) 0%,rgba(255,23,55,.045) 38%,transparent 70%);filter:blur(3px)}
        .rpLaserRing.laser-hover{width:36px;height:36px;margin:-18px 0 0 -18px;border-color:rgba(255,255,255,.78);box-shadow:inset 0 0 10px rgba(255,23,55,.18),0 0 16px rgba(255,23,55,.35)}
        .rpLaserDot.laser-hover{box-shadow:0 0 6px #fff,0 0 14px #ff1737,0 0 26px rgba(255,23,55,.95)}
        .rpLaserRing.laser-click{width:16px;height:16px;margin:-8px 0 0 -8px;border-color:#fff}
      }
      @media (pointer:coarse),(prefers-reduced-motion:reduce){.rpLaserDot,.rpLaserRing,.rpLaserTrail{display:none!important}}
    `}</style>
    <div ref={trail} className="rpLaserTrail" aria-hidden="true"/>
    <div ref={ring} className="rpLaserRing" aria-hidden="true"/>
    <div ref={dot} className="rpLaserDot" aria-hidden="true"/>
  </>;
}
