import {createHash,randomBytes,timingSafeEqual,scrypt} from 'node:crypto';
import {NextResponse} from 'next/server';
import {getPlatform} from './platform';
import {one} from './repository';
import type {PublicUser} from '../shared/domain';
export type Account={id:string;email:string;name:string;passwordHash:string|null;googleSub:string|null;createdAt:string};
export const sessionCookie='once_session';
export class ApiError extends Error{constructor(public code:string,public status=400){super(code);}}
export function fail(code:string,status=400):never{throw new ApiError(code,status);}
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const normalizeEmail=(s:string)=>s.trim().toLowerCase();
export function validEmail(value:unknown):value is string{return typeof value==='string'&&value.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export function configured(){return (getPlatform().env.SESSION_SECRET?.length||0)>=32;}
export function cookieOptions(){return {httpOnly:true,secure:getPlatform().env.NODE_ENV==='production'||getPlatform().env.APP_URL?.startsWith('https:')||process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};}
export function origin(req:Request){const expected=getPlatform().env.APP_URL;if(!expected||req.headers.get('origin')!==new URL(expected).origin)fail('requestError',403);}
export function readCookie(req:Request,name:string){return req.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex'),hash=await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));return `scrypt-v2:${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){
 const [kind,salt,hash]=stored.split(':');if(!['scrypt','scrypt-v2'].includes(kind)||!salt||!hash)return false;
 const options=kind==='scrypt-v2'?{N:32768,r:8,p:3,maxmem:64*1024*1024}:{};
 const result=await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,options,(error,key)=>error?reject(error):resolve(key)));return equal(result.toString('hex'),hash);
}
export async function limit(req:Request,bucket:string,max:number){const db=getPlatform().db,now=Date.now(),ip=req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')?.split(',')[0]||'local',key=`${bucket}:${digest(ip)}`;await db.run('INSERT INTO rate_limits(key,count,resetAt) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN resetAt<=? THEN 1 ELSE count+1 END,resetAt=CASE WHEN resetAt<=? THEN excluded.resetAt ELSE resetAt END',[key,now+900000,now,now]);const row=await one<{count:number}>('SELECT count FROM rate_limits WHERE key=?',[key]);if(row!.count>max)fail('rateError',429);}
export function publicUser(user:Account):PublicUser{const allowed=(getPlatform().env.ADMIN_GOOGLE_EMAILS||'').split(',').map(normalizeEmail).filter(Boolean);return {id:user.id,email:user.email,name:user.name,role:user.googleSub&&allowed.includes(user.email)?'admin':'reader',provider:user.googleSub?'google':'credentials'};}
export async function currentUser(req:Request):Promise<PublicUser|null>{if(!configured())return null;const raw=readCookie(req,sessionCookie);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;const session=await one<{userId:string}>('SELECT userId FROM sessions WHERE hash=? AND expires>?',[digest(raw),Date.now()]);if(!session)return null;const env=getPlatform().env;if(session.userId==='env-admin')return env.ADMIN_EMAIL&&env.ADMIN_PASSWORD?{id:'env-admin',email:normalizeEmail(env.ADMIN_EMAIL),name:'Editor',role:'admin',provider:'credentials'}:null;const user=await one<Account>('SELECT * FROM users WHERE id=?',[session.userId]);return user?publicUser(user):null;}
export async function admin(req:Request,write=false){if(write)origin(req);if((await currentUser(req))?.role!=='admin')fail('requestError',401);}
export async function setSession(req:Request,res:NextResponse,userId:string){const old=readCookie(req,sessionCookie),raw=randomBytes(32).toString('hex');const statements:import('./platform/types').Statement[]=[{sql:'DELETE FROM sessions WHERE expires<=?',params:[Date.now()]}];if(old)statements.push({sql:'DELETE FROM sessions WHERE hash=?',params:[digest(old)]});await getPlatform().db.batch([...statements,{sql:'INSERT INTO sessions(hash,userId,expires) VALUES(?,?,?)',params:[digest(raw),userId,Date.now()+28800000]}]);res.cookies.set(sessionCookie,raw,{...cookieOptions(),maxAge:28800});}
