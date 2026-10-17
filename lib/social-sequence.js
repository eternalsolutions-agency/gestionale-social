const clean=v=>String(v||"").replace(/\s+/g," ").trim();
const clip=(v,n)=>{const s=clean(v);if(s.length<=n)return s;const cut=s.slice(0,n+1),p=Math.max(cut.lastIndexOf(". "),cut.lastIndexOf("; "),cut.lastIndexOf(", "),cut.lastIndexOf(" "));return (p>n*.6?cut.slice(0,p):cut.slice(0,n)).trim()+"…"};
const sentences=v=>String(v||"").split(/\n\s*\n|(?<=[.!?])\s+/).map(clean).filter(Boolean);
const titleFrom=(text,fallback)=>clip(clean(text).replace(/[.!?]+$/,""),72)||fallback;
export function buildSocialSequence({kind="carousel",content={},brandKit={}}={}){
 const story=kind==="stories",scenes=Array.isArray(content?.metadata?.scenes)?content.metadata.scenes.filter(Boolean):[],hook=clean(content.hook),caption=clean(content.caption||content.body),cta=clean(content.cta||brandKit?.cta||"Scopri di più"),title=clean(content.title||brandKit?.name||"Il tuo messaggio");
 const facts=[...scenes,...sentences(caption)].map(x=>clip(x,story?250:330)).filter(Boolean),unique=[];for(const x of facts){if(!unique.some(y=>y.toLowerCase()===x.toLowerCase()))unique.push(x)}
 if(story){const count=Math.min(5,Math.max(3,unique.length?Math.min(unique.length+1,5):3));return Array.from({length:count},(_,i)=>{if(i===0)return{heading:titleFrom(hook,title),body:clip(unique[0]||caption,230),cta:""};if(i===count-1)return{heading:"Il prossimo passo",body:clip(unique[i]||unique[unique.length-1]||caption,220),cta};const body=unique[i]||unique[i-1]||caption;return{heading:titleFrom(scenes[i-1],`Punto ${i+1}`),body:clip(body,250),cta:""}})}
 const count=Math.min(10,Math.max(5,unique.length?Math.min(unique.length+2,8):5));return Array.from({length:count},(_,i)=>{if(i===0)return{heading:titleFrom(hook,title),body:clip(unique[0]||caption,220),cta:""};if(i===count-1)return{heading:"Il prossimo passo",body:clip(unique[unique.length-1]||caption,220),cta};const body=unique[Math.min(i,unique.length-1)]||caption;return{heading:titleFrom(scenes[i-1],`Punto ${i}`),body:clip(body,330),cta:""}})
}
