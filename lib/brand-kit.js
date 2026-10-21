import {supabase} from './supabase';
export async function loadBrandKit(business){
 const r=await supabase.from('brand_profiles').select('*').eq('business_id',business.id).maybeSingle();if(r.error)throw r.error;const b=r.data||{};let logoUrl='';
 if(b.logo_asset_id){const a=await supabase.from('media_assets').select('storage_path').eq('id',b.logo_asset_id).eq('business_id',business.id).maybeSingle();if(a.data){const s=await supabase.storage.from('rp-social-media').createSignedUrl(a.data.storage_path,3600);logoUrl=s.data?.signedUrl||'';}}
 return{name:b.brand_name||business.name||'',primary:b.colors?.primary||'#111111',secondary:b.colors?.secondary||'#FFFFFF',font:['Arial','Georgia','Verdana','Trebuchet MS'].includes(b.fonts?.primary)?b.fonts.primary:'Arial',cta:b.cta||'Contattaci per saperne di più',tone:business.tone_of_voice||'',notes:b.visual_notes||'',logo_asset_id:b.logo_asset_id||'',logoUrl};
}
export async function brandLogoUrl(assetId,businessId){if(!assetId)return '';const a=await supabase.from('media_assets').select('storage_path').eq('id',assetId).eq('business_id',businessId).maybeSingle();if(!a.data)return '';const s=await supabase.storage.from('rp-social-media').createSignedUrl(a.data.storage_path,3600);return s.data?.signedUrl||'';}
