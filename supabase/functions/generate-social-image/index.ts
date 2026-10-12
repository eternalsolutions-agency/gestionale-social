import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.99.1";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const sizes:Record<string,{width:number;height:number}>={"1:1":{width:1024,height:1024},"4:5":{width:1024,height:1280},"9:16":{width:768,height:1365},"16:9":{width:1365,height:768}};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});

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
  const body=await req.json();const contentId=body?.content_id?String(body.content_id):null;
  const prompt=String(body?.prompt||"").trim();
  const format=sizes[body?.format]?body.format:"4:5";
  const quality=String(body?.quality||"Alta");
  const generationType=String(body?.generation_type||"social_image");
  if(prompt.length<8)return json({error:"Descrivi meglio il visual da creare."},400);
  const{data:business,error:businessError}=await userClient.from("businesses").select("id,name,industry,target_audience,tone_of_voice,primary_goal").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(businessError||!business)return json({error:"Completa prima il profilo aziendale."},400);
if(contentId){const{data:target,error:targetError}=await userClient.from("contents").select("id").eq("id",contentId).eq("business_id",business.id).eq("created_by",user.id).maybeSingle();if(targetError||!target)return json({error:"Il contenuto attivo non e disponibile. Seleziona una nuova bozza."},400);}
  const{data:brand}=await userClient.from("brand_profiles").select("*").eq("business_id",business.id).maybeSingle();
  const brandContext=[business.name&&`Brand: ${business.name}`,business.industry&&`Settore: ${business.industry}`,business.target_audience&&`Target: ${business.target_audience}`,business.tone_of_voice&&`Tono: ${business.tone_of_voice}`,brand?.visual_style&&`Stile visuale: ${brand.visual_style}`].filter(Boolean).join(". ");
  const finalPrompt=`${prompt}. ${brandContext}. Professional social media visual, polished commercial photography/design, clean composition, no watermark.`;
  const{data:gen,error:genError}=await userClient.rpc("create_ai_generation",{p_business_id:business.id,p_content_id:contentId,p_generation_type:generationType,p_prompt:finalPrompt,p_metadata:{format,quality,original_prompt:prompt}});
  if(genError)throw new Error(`Creazione job AI: ${genError.message}`);
  const row=Array.isArray(gen)?gen[0]:gen;
  generationId=row?.id||null;
  if(!generationId)throw new Error("Il job AI non ha restituito un ID valido");
  const{error:processingError}=await admin.from("ai_generations").update({status:"processing",updated_at:new Date().toISOString()}).eq("id",generationId);
  if(processingError)throw processingError;
  const falResponse=await fetch("https://fal.run/fal-ai/flux/schnell",{method:"POST",headers:{Authorization:`Key ${falKey}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:finalPrompt,image_size:sizes[format],num_images:1,num_inference_steps:quality==="Standard"?2:4,enable_safety_checker:true,output_format:"jpeg",acceleration:"none"})});
  const falData=await falResponse.json().catch(()=>({}));
  if(!falResponse.ok)throw new Error(typeof falData?.detail==="string"?falData.detail:(falData?.error||`fal.ai HTTP ${falResponse.status}`));
  const image=falData?.images?.[0];
  if(!image?.url)throw new Error("fal.ai non ha restituito un'immagine");
  const remote=await fetch(image.url);
  if(!remote.ok)throw new Error("Impossibile scaricare l'immagine generata");
  const bytes=await remote.arrayBuffer();
  const path=`${user.id}/${business.id}/ai-${generationId}.jpg`;
  const{error:uploadError}=await admin.storage.from("rp-social-media").upload(path,bytes,{contentType:"image/jpeg",upsert:false});
  if(uploadError)throw uploadError;
  const{data:asset,error:assetError}=await admin.from("media_assets").insert({business_id:business.id,owner_id:user.id,content_id:contentId,kind:"image",source:"ai",title:prompt.slice(0,90),storage_path:path,mime_type:"image/jpeg",metadata:{provider:"fal",model:"fal-ai/flux/schnell",format,quality,width:image.width,height:image.height,generation_id:generationId}}).select("id,storage_path").single();
  if(assetError){await admin.storage.from("rp-social-media").remove([path]);throw assetError;}
  await admin.from("ai_generations").update({status:"completed",output_asset_id:asset.id,completed_at:new Date().toISOString(),updated_at:new Date().toISOString(),error_message:null,metadata:{format,quality,original_prompt:prompt,seed:falData?.seed??null}}).eq("id",generationId);
  const{data:signed}=await admin.storage.from("rp-social-media").createSignedUrl(path,3600);
  return json({ok:true,generation_id:generationId,asset_id:asset.id,image_url:signed?.signedUrl||null});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  if(generationId)await admin.from("ai_generations").update({status:"failed",error_message:message,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",generationId);
  console.error("generate-social-image",message);
  return json({error:message},500);
 }
});