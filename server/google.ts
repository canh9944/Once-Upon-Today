import {getPlatform} from './platform';
import {createHmac,randomBytes,createHash} from 'node:crypto';
import {configured,equal} from './security';
import {isLocale,type Locale} from '../shared/domain';

export const oauthCookie='once_google_oauth';
type Flow={state:string;verifier:string;nonce:string;locale:Locale;returnTo:string;expires:number};
const provider=import('jose').then(jose=>({jwtVerify:jose.jwtVerify,keys:jose.createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))}));
export function googleConfig(){
  if(!configured()||!getPlatform().env.GOOGLE_CLIENT_ID||!getPlatform().env.GOOGLE_CLIENT_SECRET||!getPlatform().env.APP_URL)throw new Error('googleUnavailable');
  const app=new URL(getPlatform().env.APP_URL!);if(app.pathname!=='/'||(!['https:'].includes(app.protocol)&&!(app.protocol==='http:'&&['localhost','127.0.0.1'].includes(app.hostname))))throw new Error('googleUnavailable');
  return {clientId:getPlatform().env.GOOGLE_CLIENT_ID!,clientSecret:getPlatform().env.GOOGLE_CLIENT_SECRET!,origin:app.origin,redirectUri:`${app.origin}/api/auth/google/callback`};
}
export function safeReturnTo(value:unknown,locale:Locale){
  if(typeof value!=='string'||value.length>2048||!value.startsWith('/')||value.includes('\\'))return `/${locale}`;
  try{const url=new URL(value,'https://local.invalid');if(url.origin!=='https://local.invalid'||!isLocale(url.pathname.split('/')[1]))return `/${locale}`;url.searchParams.delete('authError');return url.pathname+url.search;}catch{return `/${locale}`;}
}
function signature(payload:string){return createHmac('sha256',getPlatform().env.SESSION_SECRET!).update(payload).digest('base64url');}
export function createFlow(locale:Locale,returnTo:unknown){
  const flow:Flow={state:randomBytes(32).toString('base64url'),verifier:randomBytes(32).toString('base64url'),nonce:randomBytes(32).toString('base64url'),locale,returnTo:safeReturnTo(returnTo,locale),expires:Date.now()+600000};
  const payload=Buffer.from(JSON.stringify(flow)).toString('base64url');return {flow,cookie:`${payload}.${signature(payload)}`};
}
export function readFlow(raw:string|undefined):Flow|null{
  if(!configured()||!raw||raw.length>4096)return null;
  try{const [payload,sig]=raw.split('.');if(!sig||!equal(sig,signature(payload)))return null;const flow=JSON.parse(Buffer.from(payload,'base64url').toString()) as Flow;
    return isLocale(flow.locale)&&flow.expires>Date.now()&&flow.state&&flow.verifier&&flow.nonce?flow:null;
  }catch{return null;}
}
export function authorizationUrl(flow:Flow){const config=googleConfig(),url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:'openid email profile',state:flow.state,nonce:flow.nonce,code_challenge:createHash('sha256').update(flow.verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}).toString();return url.toString();}
export async function googleIdentity(code:string,flow:Flow){
  const config=googleConfig();const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,code,code_verifier:flow.verifier,grant_type:'authorization_code',redirect_uri:config.redirectUri}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('oauthFailed');const result=await response.json();if(typeof result.id_token!=='string')throw new Error('oauthFailed');
  const {jwtVerify,keys}=await provider;
  const {payload}=await jwtVerify(result.id_token,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience:config.clientId,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email','nonce']});
  if(payload.nonce!==flow.nonce||payload.email_verified!==true||typeof payload.sub!=='string'||typeof payload.email!=='string'||(payload.azp!==undefined&&payload.azp!==config.clientId))throw new Error('oauthFailed');
  return {sub:payload.sub,email:payload.email,name:typeof payload.name==='string'?payload.name:'Reader'};
}
