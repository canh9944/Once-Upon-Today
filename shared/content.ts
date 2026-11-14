export const MAX_POST_CONTENT=500_000;
export const MAX_IMAGE_BYTES=5*1024*1024;
export function isImageSource(value:unknown):value is string{
  if(typeof value!=='string')return false;
  if(/^\/api\/uploads\/[a-f0-9-]{36}\.(webp|png|jpg)$/.test(value))return true;
  try{return /^https:\/\//i.test(value)&&new URL(value).protocol==='https:';}catch{return false;}
}
export function textToHtml(text:string){return text.split(/\n\s*\n/).map(p=>`<p>${p.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>')}</p>`).join('');}
