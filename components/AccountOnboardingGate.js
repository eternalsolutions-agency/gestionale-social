"use client";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import Onboarding from "./Onboarding";

export default function AccountOnboardingGate(){
  const[user,setUser]=useState(null);
  const[needsOnboarding,setNeedsOnboarding]=useState(false);
  const[checking,setChecking]=useState(true);

  useEffect(()=>{
    let alive=true;
    async function check(session){
      if(window.location.pathname==="/auth"||window.location.pathname==="/auth/reset") {if(alive){setNeedsOnboarding(false);setChecking(false)}return}
      if((window.location.pathname==="/team"||(window.location.pathname==="/auth"&&sessionStorage.getItem("kairo_team_invite")))){if(alive){setUser(session?.user||null);setNeedsOnboarding(false);setChecking(false)}return}
      if(!session?.user){if(alive){setUser(null);setNeedsOnboarding(false);setChecking(false)}return}
      if(alive){setUser(session.user);setChecking(true)}
      const {data,error}=await supabase.from("businesses").select("id,onboarding_completed").eq("onboarding_completed",true).limit(1);
      if(alive){setNeedsOnboarding(!error&&(!data||data.length===0));setChecking(false)}
    }
    supabase.auth.getSession().then(({data})=>check(data.session));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,session)=>check(session));
    return()=>{alive=false;listener.subscription.unsubscribe()}
  },[]);

  if(checking||!user||!needsOnboarding)return null;
  return <div style={{position:"fixed",inset:0,zIndex:2147482500,background:"#050505"}}><Onboarding user={user} onComplete={()=>setNeedsOnboarding(false)}/></div>;
}

