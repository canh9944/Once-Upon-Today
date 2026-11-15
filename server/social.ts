import {createHmac} from 'node:crypto';
import {generateRandomState,generateRandomNonce,validateAuthResponse} from 'oauth4webapi';
import {createRemoteJWKSet,importPKCS8,SignJWT,jwtVerify} from 'jose';
import {getPlatform} from './platform';
import {configured,cookieOptions,equal,normalizeEmail,validEmail} from './security';
import {safeReturnTo} from './google';
import {isLocale,type Locale} from '../shared/domain';

export type SocialProvider='facebook'|'apple';
type Flow={provider:SocialProvider;state:string;nonce:string;locale:Locale;returnTo:string;expires:number};
const appleKeys=createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
export const socialCookie=(provider:SocialProvider)=>`once_${provider}_oauth`;
export const socialCookieOptions=(provider:SocialProvider)=>({...cookieOptions(),...(provider==='apple'?{secure:true,sameSite:'none' as const}:{})});
export function socialConfig(provider:SocialProvider){
 const env=getPlatform().env,prefix=provider.toUpperCase(),clientId=env[`${prefix}_CLIENT_ID`];
 if(!configured()||!env.APP_URL||!clientId)throw new Error('socialUnavailable');
 const app=new URL(env.APP_URL);
 if(app.pathname!=='/'||app.username||app.password||app.search||app.hash||!(app.protocol==='https:'||provider==='facebook'&&app.protocol==='http:'&&['localhost','127.0.0.1'].includes(app.hostname)))throw new Error('socialUnavailable');
 if(provider==='facebook'&&!env.FACEBOOK_CLIENT_SECRET||provider==='apple'&&(!env.APPLE_TEAM_ID||!env.APPLE_KEY_ID||!env.APPLE_PRIVATE_KEY))throw new Error('socialUnavailable');
 const version=env.FACEBOOK_GRAPH_VERSION||'v27.0';if(!/^v\d+\.0$/.test(version))throw new Error('socialUnavailable');
 return {clientId,redirectUri:`${app.origin}/api/auth/${provider}/callback`,version};
}
function sign(payload:string){return createHmac('sha256',getPlatform().env.SESSION_SECRET!).update(payload).digest('base64url');}
export function createSocialFlow(provider:SocialProvider,locale:Locale,returnTo:unknown){
 socialConfig(provider);const flow:Flow={provider,state:generateRandomState(),nonce:generateRandomNonce(),locale,returnTo:safeReturnTo(returnTo,locale),expires:Date.now()+600000};
 const payload=Buffer.from(JSON.stringify(flow)).toString('base64url');return {flow,cookie:`${payload}.${sign(payload)}`};
}
export function readSocialFlow(provider:SocialProvider,raw:string|undefined):Flow|null{
 if(!configured()||!raw||raw.length>4096)return null;
 try{const parts=raw.split('.');if(parts.length!==2||!equal(parts[1],sign(parts[0])))return null;const f=JSON.parse(Buffer.from(parts[0],'base64url').toString()) as Flow;
 return f.provider===provider&&isLocale(f.locale)&&typeof f.state==='string'&&!!f.state&&typeof f.nonce==='string'&&!!f.nonce&&f.expires>Date.now()&&f.expires<=Date.now()+600000?{...f,returnTo:safeReturnTo(f.returnTo,f.locale)}:null;}catch{return null;}
}
export function socialAuthorizationUrl(flow:Flow){
 const c=socialConfig(flow.provider),url=new URL(flow.provider==='apple'?'https://appleid.apple.com/auth/authorize':`https://www.facebook.com/${c.version}/dialog/oauth`);
 url.search=new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirectUri,response_type:'code',state:flow.state,...(flow.provider==='apple'?{scope:'name email',response_mode:'form_post',nonce:flow.nonce}:{scope:'email,public_profile'})}).toString();return url.toString();
}
export function validateSocialResponse(flow:Flow,params:URLSearchParams){
 const config=socialConfig(flow.provider);
 return validateAuthResponse({issuer:flow.provider==='apple'?'https://appleid.apple.com':'https://www.facebook.com'},{client_id:config.clientId},params,flow.state);
}
export async function socialIdentity(code:string,flow:Flow,userData?:string){
 const c=socialConfig(flow.provider),env=getPlatform().env;
 let secret=env.FACEBOOK_CLIENT_SECRET!;
 if(flow.provider==='apple')secret=await new SignJWT({}).setProtectedHeader({alg:'ES256',kid:env.APPLE_KEY_ID!}).setIssuer(env.APPLE_TEAM_ID!).setSubject(c.clientId).setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('5m').sign(await importPKCS8(env.APPLE_PRIVATE_KEY!.replace(/\\n/g,'\n'),'ES256'));
 const response=await fetch(flow.provider==='apple'?'https://appleid.apple.com/auth/token':`https://graph.facebook.com/${c.version}/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.clientId,client_secret:secret,code,grant_type:'authorization_code',redirect_uri:c.redirectUri}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('oauthFailed');const tokens=await response.json();
 if(flow.provider==='apple'){
  if(typeof tokens.id_token!=='string')throw new Error('oauthFailed');
  const {payload}=await jwtVerify(tokens.id_token,appleKeys,{issuer:'https://appleid.apple.com',audience:c.clientId,algorithms:['RS256'],requiredClaims:['sub','exp','iat','nonce','email']});
  if(payload.nonce!==flow.nonce||!['true',true].includes(payload.email_verified as boolean|string)||!validEmail(payload.email))throw new Error('oauthFailed');
  let name='Reader';try{const user=JSON.parse(userData||'{}');const parts=[user.name?.firstName,user.name?.lastName].filter(v=>typeof v==='string');if(parts.length)name=parts.join(' ').slice(0,80);}catch{}
  return {sub:payload.sub!,email:normalizeEmail(payload.email),name};
 }
 if(typeof tokens.access_token!=='string'||!tokens.access_token)throw new Error('oauthFailed');
 const profileUrl=new URL(`https://graph.facebook.com/${c.version}/me`);profileUrl.search=new URLSearchParams({fields:'id,name,email',appsecret_proof:createHmac('sha256',secret).update(tokens.access_token).digest('hex')}).toString();
 const profileResponse=await fetch(profileUrl,{headers:{Authorization:`Bearer ${tokens.access_token}`},signal:AbortSignal.timeout(15000)});if(!profileResponse.ok)throw new Error('oauthFailed');const profile=await profileResponse.json();
 if(typeof profile.id!=='string'||!profile.id)throw new Error('oauthFailed');if(!validEmail(profile.email))throw new Error('socialEmailMissing');
 return {sub:profile.id,email:normalizeEmail(profile.email),name:typeof profile.name==='string'?profile.name.slice(0,80):'Reader'};
}
