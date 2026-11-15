import type {Post} from '../shared/data';
import {normalizeSearch,type SearchStory} from '../shared/search';
import {categoryValue} from '../shared/categories';
import {englishMarket,normalizeCountry,matchesCountry,isCountryCode} from '../shared/countries';
import {matchesLanguage} from '../shared/languages';

/** Local public preview only. Production continues to use its own storage adapter. */
export function contentOrigin(){
  if(process.env.NODE_ENV!=='development'||process.env.DEPLOY_TARGET==='cloudflare'||!process.env.CONTENT_API_URL)return null;
  const url=new URL(process.env.CONTENT_API_URL);
  if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('CONTENT_API_URL must be an HTTPS website origin.');
  if(process.env.APP_URL&&new URL(process.env.APP_URL).origin===url.origin)throw new Error('CONTENT_API_URL cannot point to this local server.');
  return url.origin;
}
export async function contentResponse(endpoint:string){
  const origin=contentOrigin();if(!origin)throw new Error('Remote content is not configured.');
  return fetch(`${origin}/api/${endpoint}`,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20_000),headers:{Accept:'application/json'}});
}
function remoteImage(value:string){return value.replace(/(^|["'\s(=])(\/api\/uploads\/[a-f0-9-]{36}\.(?:jpg|png|webp))/g,(_,prefix,src)=>`${prefix}${contentOrigin()}${src}`);}
export function remotePost(post:Post):Post{return {...post,category:categoryValue(post.category),image:remoteImage(post.image),content:remoteImage(post.content)};}
export async function remotePosts(filters:{country?:string;language?:string}={}):Promise<Post[]>{
  // Fetch the public list so language groups include regional editions even on older APIs.
  const params=new URLSearchParams();if(filters.country&&filters.country!=='all'&&normalizeCountry(filters.country)!==englishMarket)params.set('country',filters.country);
  let response=await contentResponse(`posts${params.size?'?'+params:''}`);
  // The deployed API may not yet recognize countries added to this UI.
  // Retry its public list, then filter locally without changing the selected country.
  if(response.status===400&&params.has('country')&&filters.country&&isCountryCode(filters.country)){
    params.delete('country');
    response=await contentResponse(`posts${params.size?'?'+params:''}`);
  }
  if(!response.ok)throw new Error(`Content API returned HTTP ${response.status}`);
  const data=await response.json();if(!Array.isArray(data.posts))throw new Error('Invalid content API response.');
  return data.posts.filter((p:Post)=>p.published===true&&matchesCountry(p.country,filters.country)&&matchesLanguage(p.language,filters.language)).map(remotePost);
}
export async function remoteStory(id:string):Promise<Post|null>{
  const response=await contentResponse(`stories/${encodeURIComponent(id)}`);
  if(response.status===404)return null;
  if(!response.ok)throw new Error(`Content API returned HTTP ${response.status}`);
  const {post}=await response.json();return post?.published===true?remotePost(post):null;
}
export async function remoteSearch(filters:{query?:string;country?:string;genre?:string;language?:string;offset?:number;limit?:number}):Promise<SearchStory[]>{
  const genre=categoryValue(filters.genre||'all'),offset=filters.offset||0,limit=filters.limit??6;
  const params=new URLSearchParams({q:filters.query||'',country:normalizeCountry(filters.country||'all'),genre});
  if(filters.language&&filters.language!=='all')params.set('language',filters.language);
  params.set('offset',String(offset));params.set('limit',String(Math.min(limit,30)));
  const response=await contentResponse(`search?${params}`);
  let ranked:SearchStory[]=[];
  if(response.ok){const data=await response.json();if(!Array.isArray(data.posts))throw new Error('Invalid search API response.');ranked=data.posts.map((p:SearchStory)=>({...p,category:categoryValue(p.category),image:remoteImage(p.image)}));if('nextOffset' in data){
    if(ranked.length<limit&&Number.isSafeInteger(data.nextOffset)&&data.nextOffset>offset){params.set('offset',String(data.nextOffset));params.set('limit',String(Math.min(30,limit-ranked.length)));const extra=await contentResponse(`search?${params}`);if(!extra.ok)throw new Error('Search API unavailable');const next=await extra.json();if(!Array.isArray(next.posts))throw new Error('Invalid search API response.');const seen=new Set(ranked.map(p=>p.id));for(const p of next.posts as SearchStory[])if(!seen.has(p.id)){seen.add(p.id);ranked.push({...p,category:categoryValue(p.category),image:remoteImage(p.image)});}}
    return ranked.slice(0,limit);
  }}
  // Older deployments may not yet expose the suggestions endpoint.
  const unsupportedFilter=response.status===400&&(filters.language||filters.country&&isCountryCode(filters.country));
  if(!response.ok&&response.status!==404&&!unsupportedFilter)throw new Error(`Search API returned HTTP ${response.status}`);
  const terms=normalizeSearch(filters.query||'').split(/\s+/).filter(Boolean);
  return (await remotePosts({country:filters.country,language:filters.language})).filter(p=>(genre==='all'||p.category===genre)&&terms.every(term=>normalizeSearch(`${p.title} ${p.excerpt} ${p.author} ${p.category}`).includes(term))).sort((a,b)=>{const rank=(id:string)=>{const index=ranked.findIndex(p=>p.id===id);return index<0?Infinity:index;};return rank(a.id)-rank(b.id);}).slice(offset,offset+limit).map(({id,title,image,category,language,author})=>({id,title,image,category,language,author,views:ranked.find(p=>p.id===id)?.views||0}));
}
