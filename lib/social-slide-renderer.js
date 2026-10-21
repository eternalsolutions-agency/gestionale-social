export function wrapLines(ctx,text,width){
 const lines=[];for(const paragraph of String(text||"").split("\n")){
 let line="";for(const word of paragraph.split(/\s+/).filter(Boolean)){const test=line?line+" "+word:word;if(ctx.measureText(test).width<=width){line=test;continue;}if(line){lines.push(line);line="";}let part="";for(const ch of word){if(ctx.measureText(part+ch).width>width&&part){lines.push(part);part="";}part+=ch;}line=part;}lines.push(line);
 }return lines;
}
function textBlock(ctx,text,x,y,width,height,maxSize,minSize,color,weight=500,font="Arial"){
 let size=maxSize,lines;do{ctx.font=weight+" "+size+"px "+font+", sans-serif";lines=wrapLines(ctx,text,width);if(lines.length*size*1.28<=height)break;size-=2;}while(size>=minSize);
 if(lines.length*size*1.28>height)throw new Error("Il testo e troppo lungo per la slide. Accorcialo.");
 ctx.fillStyle=color;ctx.textBaseline="top";lines.forEach((line,i)=>ctx.fillText(line,x,y+i*size*1.28));return lines.length*size*1.28;
}
async function loadImage(url){const img=new Image();img.crossOrigin="anonymous";await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error("Sfondo non disponibile. Scegli un'altra immagine."));img.src=url;});return img;}
export async function renderSocialSlide(slide,design,index,total){
 const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");if(!ctx)throw new Error("Canvas non disponibile.");
 const story=design.kind==="stories";canvas.width=1080;canvas.height=story?1920:design.ratio==="1:1"?1080:1350;const h=canvas.height;
 ctx.fillStyle=design.background;ctx.fillRect(0,0,1080,h);
 if(slide.backgroundUrl){const image=await loadImage(slide.backgroundUrl);const scale=Math.max(1080/image.width,h/image.height);const w=image.width*scale,ih=image.height*scale;ctx.drawImage(image,(1080-w)/2,(h-ih)/2,w,ih);ctx.fillStyle="rgba(3,12,27,.70)";ctx.fillRect(0,0,1080,h);}
 const gradient=ctx.createLinearGradient(0,0,1080,h);gradient.addColorStop(0,design.accent+"35");gradient.addColorStop(1,"#00000000");ctx.fillStyle=gradient;ctx.fillRect(0,0,1080,h);
 const top=story?220:95,bottom=story?260:110;
 const font=['Arial','Georgia','Verdana','Trebuchet MS'].includes(design.font)?design.font:'Arial';
 if(design.logoUrl){const logo=await loadImage(design.logoUrl);const scale=Math.min(150/logo.width,90/logo.height);ctx.drawImage(logo,1080-85-logo.width*scale,top,logo.width*scale,logo.height*scale);}
 ctx.fillStyle=design.accent;ctx.fillRect(85,top,110,10);
 textBlock(ctx,design.brand||"IL TUO BRAND",85,top+40,900,70,30,24,design.accent,700,font);
 const titleY=top+150,titleH=story?330:h===1080?230:280;
 const titleSize=index===0?84:70;textBlock(ctx,slide.heading,85,titleY,910,titleH,titleSize,42,"#ffffff",800,font);
 const bodyY=titleY+titleH+40,footerY=h-bottom;
 const bodyH=footerY-bodyY-160;
 textBlock(ctx,slide.body,85,bodyY,910,bodyH,42,26,"#e0edff",500,font);
 if(slide.cta){ctx.fillStyle=design.accent;ctx.fillRect(85,footerY-120,910,4);textBlock(ctx,slide.cta,85,footerY-88,900,90,34,24,"#ffffff",700,font);}
 textBlock(ctx,String(index+1).padStart(2,"0")+" / "+String(total).padStart(2,"0"),85,h-bottom+10,300,50,24,22,design.accent,700,font);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Esportazione non riuscita")),"image/jpeg",.93));
}
export function saveBlob(blob,filename){const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
