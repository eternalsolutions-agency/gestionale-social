import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.1";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const sizes:Record<string,{width:number;height:number}>={"1:1":{width:1024,height:1024},"4:5":{width:1024,height:1280},"9:16":{width:768,height:1365},"16:9":{width:1365,height:768}};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const clean=(value:unknown,max=500)=>String(value||"").trim().slice(0,max);

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Metodo non consentito"},405);
 const authHeader=req.headers.get("Authorization")||"";
 const token=authHeader.replace(/^Bearer\s+/i,"");
 const falKey=Deno.env.get("FAL_KEY");
 if(!falKey)return json({error:"FAL_KEY non configurata"},503);
 const supabaseUrl=Deno.env.get("SUPABASE_URL")!;
 const anonKey=Deno.env.get("SUPABASE_ANON_KEY")!;
 const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const userClient=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authHeader}}});
 const admin=createClient(supabaseUrl,serviceKey);
 const{data:userData,error:userError}=await userClient.auth.getUser(token);
 const user=userData?.user;
 if(userError||!user)return json({error:"Sessione non valida"},401);
 let generationId:string|null=null;
 try{
  const body=await req.json();
  const contentId=body?.content_id?String(body.content_id):null;
  const prompt=clean(body?.prompt,2400);
  const format=sizes[body?.format]?body.format:"4:5";
  const quality=String(body?.quality||"Alta");
  const generationType=clean(body?.generation_type||"social_image",80);
  if(prompt.length<8)return json({error:"Descrivi meglio il visual da creare."},400);
  const query=userClient.from("businesses").select("id,name,industry,target_audience,tone_of_voice,primary_goal");
  if(body.business_id)query.eq("id",body.business_id);
  const{data:business,error:businessError}=await query.order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(businessError||!business)return json({error:"Completa prima il profilo aziendale."},400);
  let content:any=null;
  if(contentId){const{data:target,error:targetError}=await userClient.from("contents").select("id,title,format,hook,caption,cta,metadata").eq("id",contentId).eq("business_id",business.id).maybeSingle();if(targetError||!target)return json({error:"Il contenuto attivo non e disponibile. Seleziona una nuova bozza."},400);content=target;}
  const{data:brand}=await userClient.from("brand_profiles").select("name,colors,font,tone_of_voice,default_cta,visual_notes,logo_asset_id").eq("business_id",business.id).maybeSingle();
  const colors=brand?.colors&&typeof brand.colors==="object"?Object.values(brand.colors).map(v=>clean(v,30)).filter(Boolean).slice(0,4):[];
  const brandName=clean(brand?.name||business.name,120),tone=clean(brand?.tone_of_voice||business.tone_of_voice,300),visualNotes=clean(brand?.visual_notes,700),contentMeta=content?.metadata&&typeof content.metadata==="object"?content.metadata:{};
  const contentContext=[content?.title&&`Topic and concept: ${clean(content.title,180)}`,contentMeta?.visual&&`Visual direction: ${clean(contentMeta.visual,700)}`,contentMeta?.platform&&`Platform: ${clean(contentMeta.platform,40)}`,content?.format&&`Content format: ${clean(content.format,50)}`].filter(Boolean).join(". ");
  const brandContext=[brandName&&`Brand identity reference: ${brandName}`,business.industry&&`Industry: ${clean(business.industry,180)}`,business.target_audience&&`Audience: ${clean(business.target_audience,350)}`,tone&&`Brand mood: ${tone}`,visualNotes&&`Brand Kit visual rules: ${visualNotes}`,colors.length&&`Brand palette: ${colors.join(" / ")}`].filter(Boolean).join(". ");
  const finalPrompt=[prompt,contentContext,brandContext,"Create ONLY the visual background/artwork. Absolutely no text anywhere in the image: no words, no letters, no numbers, no typography, no captions, no headlines, no CTA, no labels, no signage, no UI text, no pseudo-text, no watermark and no generated logo. Leave intentional clean negative space suitable for adding real typography later. Keep the visual coherent with the supplied Brand Kit. Do not invent claims, prices, awards, reviews or product details. Professional social media artwork, polished commercial photography/design, clean composition."].filter(Boolean).join(". ");
  const{data:gen,error:genError}=await userClient.rpc("create_ai_generation",{p_business_id:business.id,p_content_id:contentId,p_generation_type:generationType,p_prompt:finalPrompt,p_metadata:{format,quality,original_prompt:prompt,brand_kit_applied:Boolean(brand),content_context_applied:Boolean(content),text_free_visual:true}});
  if(genError)throw new Error(`Creazione job AI: ${genError.message}`);const row=Array.isArray(gen)?gen[0]:gen;generationId=row?.id||null;if(!generationId)throw new Error("Il job AI non ha restituito un ID valido");
  const{error:processingError}=await admin.from("ai_generations").update({status:"processing",updated_at:new Date().toISOString()}).eq("id",generationId);if(processingError)throw processingError;
  const falResponse=await fetch("https://fal.run/fal-ai/flux/schnell",{method:"POST",headers:{Authorization:`Key ${falKey}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:finalPrompt,image_size:sizes[format],num_images:1,num_inference_steps:quality==="Standard"?2:4,enable_safety_checker:true,output_format:"jpeg",acceleration:"none"})});
  const falData=await falResponse.json().catch(()=>({}));if(!falResponse.ok)throw new Error(typeof falData?.detail==="string"?falData.detail:(falData?.error||`fal.ai HTTP ${falResponse.status}`));const image=falData?.images?.[0];if(!image?.url)throw new Error("fal.ai non ha restituito un'immagine");
  const remote=await fetch(image.url);if(!remote.ok)throw new Error("Impossibile scaricare l'immagine generata");const bytes=await remote.arrayBuffer();const path=`${user.id}/${business.id}/ai-${generationId}.jpg`;
  const{error:uploadError}=await admin.storage.from("rp-social-media").upload(path,bytes,{contentType:"image/jpeg",upsert:false});if(uploadError)throw uploadError;
  const{data:asset,error:assetError}=await admin.from("media_assets").insert({business_id:business.id,owner_id:user.id,content_id:contentId,kind:"image",source:"ai",title:prompt.slice(0,90),storage_path:path,mime_type:"image/jpeg",metadata:{provider:"fal",model:"fal-ai/flux/schnell",format,quality,width:image.width,height:image.height,generation_id:generationId,brand_kit_applied:Boolean(brand),content_context_applied:Boolean(content),text_free_visual:true}}).select("id,storage_path").single();
  if(assetError){await admin.storage.from("rp-social-media").remove([path]);throw assetError;}
  await admin.from("ai_generations").update({status:"completed",output_asset_id:asset.id,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),error_message:null,metadata:{format,quality,original_prompt:prompt,seed:falData?.seed??null,brand_kit_applied:Boolean(brand),content_context_applied:Boolean(content),text_free_visual:true}}).eq("id",generationId);
  const{data:signed}=await admin.storage.from("rp-social-media").createSignedUrl(path,3600);return json({ok:true,generation_id:generationId,asset_id:asset.id,image_url:signed?.signedUrl||null,brand_kit_applied:Boolean(brand),content_context_applied:Boolean(content),text_free_visual:true});
 }catch(error){const message=error instanceof Error?error.message:String(error);if(generationId)await admin.from("ai_generations").update({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",generationId);console.error("generate-social-image",message);return json({error:message},500);}
});