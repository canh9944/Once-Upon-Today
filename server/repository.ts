import {getPlatform} from './platform';
import type {Post} from '../shared/data';
export const tables={posts:['id','title','excerpt','content','contentFormat','country','language','category','image','author','date','published'],users:['id','email','name','passwordHash','googleSub','createdAt'],events:['key','visitor','type','postId','date'],uploads:['filename','mime','size','createdAt'],imports:['source','completedAt']} as const;
export async function one<T>(sql:string,params:unknown[]=[]):Promise<T|null>{return (await getPlatform().db.all<T>(sql,params))[0]||null;}
export function normalizePost(post:Post):Post{return {...post,published:!!post.published};}
export async function listPosts(filters:{country?:string;language?:string;admin?:boolean}={}):Promise<Post[]>{
  const conditions:string[]=[],args:unknown[]=[];if(!filters.admin){conditions.push('published=1');}if(filters.country){conditions.push('country=?');args.push(filters.country);}if(filters.language){conditions.push('language=?');args.push(filters.language);}
  return (await getPlatform().db.all<Post>(`SELECT * FROM posts${conditions.length?' WHERE '+conditions.join(' AND '):''} ORDER BY date DESC,rowid ASC`,args)).map(normalizePost);
}
export async function getPost(id:string,admin=false){const post=await one<Post>('SELECT * FROM posts WHERE id=?'+(admin?'':' AND published=1'),[id]);return post?normalizePost(post):null;}
export async function upsertPost(post:Post){const keys=tables.posts;await getPlatform().db.run(`INSERT INTO posts (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')}) ON CONFLICT(id) DO UPDATE SET ${keys.filter(k=>k!=='id').map(k=>`${k}=excluded.${k}`).join(',')}`,keys.map(k=>k==='published'?Number(post.published):post[k]??'text'));}
