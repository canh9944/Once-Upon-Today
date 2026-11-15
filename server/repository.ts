import {getPlatform} from './platform';
import type {Post} from '../shared/data';
import {normalizeSearch,type SearchStory} from '../shared/search';
import {contentOrigin,remotePosts,remoteStory,remoteSearch} from './remote-content';
import {categoryAliases,categoryValue} from '../shared/categories';
import {countryMembers} from '../shared/countries';
import {languageMembers} from '../shared/languages';

export async function searchStories({query='',country,genre,language}:{query?:string;country?:string;genre?:string;language?:string}={}):Promise<SearchStory[]>{
  if(contentOrigin())return remoteSearch({query,country,genre,language});
  const conditions=['p.published=1'],args:unknown[]=[];
  if(country&&country!=='all'){const members=countryMembers(country);conditions.push(`p.country IN (${members.map(()=>'?').join(',')})`);args.push(...members);}
  if(language&&language!=='all'){const members=languageMembers(language);conditions.push(`p.language IN (${members.map(()=>'?').join(',')})`);args.push(...members);}
  if(genre&&genre!=='all'){const aliases=categoryAliases(genre);conditions.push(`p.category IN (${aliases.map(()=>'?').join(',')})`);args.push(...aliases);}
  const posts=await getPlatform().db.all<SearchStory&{excerpt:string}>(`SELECT p.id,p.title,p.excerpt,p.image,p.category,p.language,p.author,COALESCE(v.views,0) views FROM posts p LEFT JOIN (SELECT postId,COUNT(*) views FROM events WHERE type='view' GROUP BY postId) v ON v.postId=p.id WHERE ${conditions.join(' AND ')} ORDER BY views DESC,p.date DESC,p.id ASC`,args);
  const terms=normalizeSearch(query).split(/\s+/).filter(Boolean);
  return posts.filter(post=>{const text=normalizeSearch(`${post.title} ${post.excerpt} ${post.author} ${post.category}`);return terms.every(term=>text.includes(term));}).slice(0,6).map(({excerpt,...post})=>post);
}
export const tables={posts:['id','title','excerpt','content','contentFormat','country','language','category','image','author','date','published'],users:['id','email','name','passwordHash','googleSub','createdAt','facebookSub','appleSub'],events:['key','visitor','type','postId','date'],uploads:['filename','mime','size','createdAt'],imports:['source','completedAt']} as const;
export async function one<T>(sql:string,params:unknown[]=[]):Promise<T|null>{return (await getPlatform().db.all<T>(sql,params))[0]||null;}
export function normalizePost(post:Post):Post{return {...post,category:categoryValue(post.category),published:!!post.published};}
export async function listPosts(filters:{country?:string;language?:string;admin?:boolean}={}):Promise<Post[]>{
  if(contentOrigin())return remotePosts(filters);
  const conditions:string[]=[],args:unknown[]=[];if(!filters.admin){conditions.push('published=1');}if(filters.country&&filters.country!=='all'){const members=countryMembers(filters.country);conditions.push(`country IN (${members.map(()=>'?').join(',')})`);args.push(...members);}if(filters.language&&filters.language!=='all'){const members=languageMembers(filters.language);conditions.push('language IN ('+members.map(()=>'?').join(',')+')');args.push(...members);}
  return (await getPlatform().db.all<Post>(`SELECT * FROM posts${conditions.length?' WHERE '+conditions.join(' AND '):''} ORDER BY date DESC,rowid ASC`,args)).map(normalizePost);
}
export async function getPost(id:string,admin=false){if(contentOrigin())return admin?null:remoteStory(id);const post=await one<Post>('SELECT * FROM posts WHERE id=?'+(admin?'':' AND published=1'),[id]);return post?normalizePost(post):null;}
export async function upsertPost(post:Post){const keys=tables.posts;await getPlatform().db.run(`INSERT INTO posts (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys.filter(k=>k!=='id').map(k=>`${k}=excluded.${k}`).join(',')}`,keys.map(k=>k==='published'?Number(post.published):post[k]??'text'));}
