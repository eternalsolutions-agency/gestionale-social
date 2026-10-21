"use client";
import {useEffect} from "react";
export default function ThemeToggle(){useEffect(()=>{document.documentElement.dataset.theme="light";try{localStorage.setItem("rps_theme","light")}catch{}},[]);return null}
