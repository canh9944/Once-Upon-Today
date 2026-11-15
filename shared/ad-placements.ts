const textLength=(html:string)=>html.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|#160);/g,' ').replace(/\s+/g,' ').trim().length;

/** Split sanitized HTML only after a complete top-level paragraph, never inside a list or quote. */
export function articleAdBreak(html:string):number|undefined{
  const total=textLength(html);if(total<4000)return undefined;
  const stack:string[]=[];
  let cursor=0,before=0,best:number|undefined,distance=Infinity;
  for(const match of html.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)){
    const segment=textLength(html.slice(cursor,match.index));
    before+=segment?segment+1:0;cursor=match.index!+match[0].length;
    const tag=match[1].toLowerCase(),closing=match[0].startsWith('</');
    if(['img','br','hr'].includes(tag))continue;
    if(closing){
      if(stack.pop()!==tag)return undefined;
      if(tag==='p'&&!stack.length&&before>=1600&&total-before>=1600&&Math.abs(before-total/2)<distance){best=cursor;distance=Math.abs(before-total/2);}
    }else stack.push(tag);
  }
  if(stack.length)return undefined;
  return best;
}

export function plainArticleAdBreak(paragraphs:string[]):number|undefined{
  const total=paragraphs.reduce((sum,p)=>sum+p.length,0);if(total<4000)return undefined;
  let before=0;const candidates:{index:number;distance:number}[]=[];
  paragraphs.forEach((paragraph,index)=>{before+=paragraph.length;if(before>=1600&&total-before>=1600)candidates.push({index,distance:Math.abs(before-total/2)});});
  return candidates.sort((a,b)=>a.distance-b.distance)[0]?.index;
}
