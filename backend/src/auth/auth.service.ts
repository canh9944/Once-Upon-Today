import {Inject,Injectable,HttpException} from '@nestjs/common';
import {createHash,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {LessThan} from 'typeorm';
import type {Request,Response} from 'express';
import {DatabaseService} from '../database/database.service';
import type {UserEntity} from '../database/entities';
import {settings} from '../config';
import type {PublicUser} from '../../../shared/domain';
const derive=promisify(scrypt);
export const sessionCookie='once_session';
export const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production'||settings.origin.startsWith('https:'),sameSite:'lax' as const,path:'/'};
export const normalizeEmail=(value:string)=>value.trim().toLowerCase();
export function validEmail(value:unknown):value is string{return typeof value==='string'&&value.trim().length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());}
export function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export function configured(){return (process.env.SESSION_SECRET?.length||0)>=32;}
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex'),hash=await derive(password,salt,64) as Buffer;return `scrypt:${salt}:${hash.toString('hex')}`;}
export async function verifyPassword(password:string,stored:string){const [kind,salt,hash]=stored.split(':');if(kind!=='scrypt'||!salt||!hash)return false;return equal((await derive(password,salt,64) as Buffer).toString('hex'),hash);}
export function fail(code:string,status=400):never{throw new HttpException({code},status);}
@Injectable()
export class AuthService{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  origin(req:Request){if(req.get('origin')!==settings.origin)fail('requestError',403);}
  async limit(req:Request,bucket:string,max:number){
    const now=Date.now(),key=`${bucket}:${req.ip||'local'}`;
    await this.db.source.query('DELETE FROM rate_limits WHERE resetAt < ?',[now]);
    await this.db.source.query('INSERT INTO rate_limits(key,count,resetAt) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',[key,now+900000]);
    const [row]=await this.db.source.query('SELECT count FROM rate_limits WHERE key=?',[key]);if(row.count>max)fail('rateError',429);
  }
  publicUser(user:UserEntity):PublicUser{const allowed=(process.env.ADMIN_GOOGLE_EMAILS||'').split(',').map(normalizeEmail).filter(Boolean);return {id:user.id,email:user.email,name:user.name,role:user.googleSub&&allowed.includes(user.email)?'admin':'reader',provider:user.googleSub?'google':'credentials'};}
  async current(req:Request):Promise<PublicUser|null>{
    if(!configured())return null;const raw=req.cookies?.[sessionCookie];if(typeof raw!=='string'||!/^[a-f0-9]{64}$/.test(raw))return null;
    const session=await this.db.sessions.findOneBy({hash:digest(raw)});if(!session||session.expires<=Date.now())return null;
    if(session.userId==='env-admin'){if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD)return null;return {id:'env-admin',email:normalizeEmail(process.env.ADMIN_EMAIL),name:'Editor',role:'admin',provider:'credentials'};}
    const user=await this.db.users.findOneBy({id:session.userId});return user?this.publicUser(user):null;
  }
  async admin(req:Request,write=false){if(write)this.origin(req);if((await this.current(req))?.role!=='admin')fail('requestError',401);}
  async session(req:Request,res:Response,userId:string){const raw=randomBytes(32).toString('hex'),old=req.cookies?.[sessionCookie];await this.db.sessions.delete({expires:LessThan(Date.now())});if(typeof old==='string')await this.db.sessions.delete({hash:digest(old)});await this.db.sessions.insert({hash:digest(raw),userId,expires:Date.now()+28800000});res.cookie(sessionCookie,raw,{...cookieOptions,maxAge:28800000});}
  async logout(req:Request,res:Response){this.origin(req);const raw=req.cookies?.[sessionCookie];if(typeof raw==='string')await this.db.sessions.delete({hash:digest(raw)});res.clearCookie(sessionCookie,cookieOptions);res.clearCookie('atlas_session',cookieOptions);return {ok:true};}
  async login(req:Request,res:Response,body:any){
    this.origin(req);if(!configured())fail('configError',503);await this.limit(req,'login',10);
    if(!body||!validEmail(body.email)||typeof body.password!=='string'||body.password.length>128)fail('loginError',400);
    const email=normalizeEmail(body.email);let id:string|undefined;
    if(process.env.ADMIN_EMAIL&&process.env.ADMIN_PASSWORD&&equal(email,normalizeEmail(process.env.ADMIN_EMAIL))&&equal(body.password,process.env.ADMIN_PASSWORD))id='env-admin';
    else{const user=await this.db.users.findOneBy({email});if(user?.passwordHash&&await verifyPassword(body.password,user.passwordHash))id=user.id;else await verifyPassword(body.password,'scrypt:00000000000000000000000000000000:'+'0'.repeat(128));}
    if(!id)fail('loginError',401);await this.session(req,res,id);return {ok:true};
  }
  async signup(req:Request,res:Response,body:any){
    this.origin(req);if(!configured())fail('configError',503);await this.limit(req,'signup',5);
    if(!body||!validEmail(body.email)||typeof body.name!=='string'||body.name.trim().length<2||body.name.trim().length>80||typeof body.password!=='string'||body.password.length<12||body.password.length>128)fail('signupValidation');
    const email=normalizeEmail(body.email);if(email===normalizeEmail(process.env.ADMIN_EMAIL||''))fail('accountExists',409);
    const user=this.db.users.create({id:randomBytes(16).toString('hex'),email,name:body.name.trim(),passwordHash:await hashPassword(body.password),googleSub:null,createdAt:new Date().toISOString()});
    try{await this.db.users.insert(user);}catch(e){if((e as {code?:string}).code?.startsWith('SQLITE_CONSTRAINT'))fail('accountExists',409);throw e;}
    await this.session(req,res,user.id);return {ok:true};
  }
}
