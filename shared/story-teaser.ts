import type {Post} from './data';

/** Plain text only: never render article HTML inside a homepage preview. */
export function storyTeaser(post:Pick<Post,'excerpt'|'content'|'contentFormat'>){
 const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',hellip:'…',ndash:'–',mdash:'—',lsquo:'‘',rsquo:'’',ldquo:'“',rdquo:'”'};
 const body=post.contentFormat==='html'?post.content.replace(/<(script|style|iframe|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(match,key:string)=>{if(key[0]!=='#')return entities[key.toLowerCase()]??match;const number=key[1].toLowerCase()==='x'?parseInt(key.slice(2),16):Number(key.slice(1));return number>0&&number<=0x10ffff&&!(number>=0xd800&&number<=0xdfff)?String.fromCodePoint(number):' ';}):post.content;
 const normalize=(value:string)=>value.replace(/\s+/gu,' ').trim();
 const excerpt=normalize(post.excerpt),text=normalize(body);
 return (text.startsWith(excerpt)?text:[excerpt,text].filter(Boolean).join(' ')).slice(0,5000);
}
