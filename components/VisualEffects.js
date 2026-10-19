'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
// Enhance content already visible to users; no content depends on animation to appear.
const selector='.hero .herocopy,.heroVisual,.studioHero,.page>div>div:first-child,.creativeCard,.feature,.flowCard,.kairoFlow article,.plans article,.featureHero,.kdStats>div,.kdGrid>section,.kdAdvice,.riGrid>article,.rsPillars>article,.lib .grid>article,.businessTools>section,.businessTools .grid>article,.businessTools .stats>.stat,.socialHub .channelGrid>article,.reelBuilder .scene,.teamPage>section,.external>section,.sfeLayout,.authCard';
export default function VisualEffects(){const path=usePathname();useEffect(()=>{
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)');let observer,mutations,frame=0;const seen=new WeakSet();let index=0;
 function stop(){observer?.disconnect();mutations?.disconnect();cancelAnimationFrame(frame)}
 function start(){stop();if(preference.matches||!('IntersectionObserver' in window))return;
 observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;entry.target.classList.add('kairoEntrance');observer.unobserve(entry.target)}},{threshold:.06});
 const scan=()=>{frame=0;document.querySelectorAll(selector).forEach(el=>{if(seen.has(el)||el.closest('.overlay,.modal,[role="dialog"]'))return;seen.add(el);el.style.setProperty('--kairo-delay',`${(index++%4)*35}ms`);observer.observe(el)})};
 scan();mutations=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(scan)});mutations.observe(document.getElementById('main-content')||document.body,{childList:true,subtree:true});
 }
 start();preference.addEventListener('change',start);return()=>{stop();preference.removeEventListener('change',start)};
 },[path]);return null}
