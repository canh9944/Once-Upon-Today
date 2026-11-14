import {FilterXSS,escapeAttrValue} from 'xss';
import {isImageSource} from './content';
const filter=new FilterXSS({whiteList:{p:[],br:[],h2:[],h3:[],h4:[],strong:[],b:[],em:[],i:[],u:[],s:[],blockquote:[],ul:[],ol:['start'],li:[],a:['href','title'],code:[],pre:[],hr:[],img:['src','alt','title','width','height']},stripIgnoreTag:true,stripIgnoreTagBody:['script','style','svg','math','iframe','textarea','noscript'],safeAttrValue(tag,name,value){
  if(name==='src')return isImageSource(value)?escapeAttrValue(value):'';
  if(name==='href')return /^(https?:\/\/|mailto:|\/(?!\/))/i.test(value)?escapeAttrValue(value):'';
  if(['width','height','start'].includes(name))return /^\d{1,5}$/.test(value)?value:'';
  return escapeAttrValue(value);
}});
export function sanitizeContent(html:string){return filter.process(html);}
export function hasContent(html:string){return !!html.replace(/<[^>]*>/g,'').replace(/&(?:nbsp|#160);/g,' ').trim()||/<img\b[^>]*src="[^\"]+"/i.test(html);}
