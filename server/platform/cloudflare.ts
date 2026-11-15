import {getCloudflareContext} from '@opennextjs/cloudflare';
import type {Platform,SqlDatabase} from './types';
type Prepared={bind(...args:unknown[]):Prepared;all<T>():Promise<{results:T[]}>;run():Promise<{meta:{changes:number}}>};
type Bindings={DB:{prepare(sql:string):Prepared;batch(statements:Prepared[]):Promise<unknown>};MEDIA:{put(key:string,bytes:Uint8Array,options:{httpMetadata:{contentType:string}}):Promise<unknown>;get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>;httpMetadata?:{contentType?:string}}|null>};[key:string]:unknown};
export function getPlatform():Platform{
  const context=getCloudflareContext(),bindings=context.env as unknown as Bindings;if(!bindings.DB||!bindings.MEDIA)throw new Error('Missing DB/MEDIA Cloudflare bindings');
  const db:SqlDatabase={all:async<T>(sql:string,params:unknown[]=[])=>{return (await bindings.DB.prepare(sql).bind(...params).all<T>()).results;},run:async(sql,params=[])=>({changes:(await bindings.DB.prepare(sql).bind(...params).run()).meta.changes}),batch:async statements=>{if(statements.length)await bindings.DB.batch(statements.map(s=>bindings.DB.prepare(s.sql).bind(...(s.params||[]))));}};
  return {kind:'cloudflare',db,country:typeof context.cf?.country==='string'?context.cf.country:undefined,objects:{put:async(key,bytes,contentType)=>{await bindings.MEDIA.put(key,bytes,{httpMetadata:{contentType}});},get:async key=>{const object=await bindings.MEDIA.get(key);return object?{bytes:new Uint8Array(await object.arrayBuffer()),contentType:object.httpMetadata?.contentType||'application/octet-stream'}:null;}},env:Object.fromEntries(Object.entries(bindings).filter(([,v])=>typeof v==='string')) as Record<string,string>};
}
