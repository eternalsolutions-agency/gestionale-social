export function studioFormat(value) {
 const format=String(value||"").toLowerCase();
 if(/carosell|carousel/.test(format))return "carousel";
 if(/stor/.test(format))return "stories";
 if(/reel/.test(format))return "reel";
 return "post";
}
export function studioLink(content) {
 const query=new URLSearchParams({format:studioFormat(content?.format)});
 if(content?.metadata?.media_set_id&&["carousel","stories"].includes(studioFormat(content.format)))query.set("design",content.metadata.media_set_id);
 return "/studio-ai?"+query.toString();
}
