import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHmac} from 'node:crypto';
import {generateKeyPair,exportJWK,exportPKCS8,SignJWT,jwtVerify} from 'jose';
import Database from 'better-sqlite3';
import {migrateLocal} from './migrate-local.mjs';

const directory=fs.mkdtempSync(path.join(os.tmpdir(),'once-social-'));
const origin='https://stories.example';
const appleSecret=await generateKeyPair('ES256',{extractable:true}),rsa=await generateKeyPair('RS256',{extractable:true}),wrongKey=await generateKeyPair('RS256');
Object.assign(process.env,{CONTENT_API_URL:'',DATABASE_PATH:path.join(directory,'test.sqlite'),UPLOAD_DIR:path.join(directory,'uploads'),APP_URL:origin,SESSION_SECRET:'test-only-secret-'.repeat(4),GOOGLE_CLIENT_ID:'google-id',GOOGLE_CLIENT_SECRET:'google-secret',FACEBOOK_CLIENT_ID:'facebook-id',FACEBOOK_CLIENT_SECRET:'facebook-secret',APPLE_CLIENT_ID:'apple-id',APPLE_TEAM_ID:'apple-team',APPLE_KEY_ID:'apple-key',APPLE_PRIVATE_KEY:await exportPKCS8(appleSecret.privateKey),ADMIN_GOOGLE_EMAILS:'google@example.com,facebook@example.com,apple@example.com'});
const {handle}=await import('../server/api');
const {getPlatform}=await import('../server/platform/node');
const {createSocialFlow,readSocialFlow,socialConfig}=await import('../server/social');
const key={...await exportJWK(rsa.publicKey),kid:'test-key',alg:'RS256'};
type Identity={provider:string;sub:string;email:string;nonce:string;invalidNonce?:boolean;invalidToken?:'signature'|'issuer'|'audience'|'expiry'};
const codes=new Map<string,Identity>(),tokens=new Map<string,Identity>();let fetchCount=0;
const realFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 fetchCount++;const url=new URL(String(input));
 if(url.pathname.endsWith('/certs')||url.pathname==='/auth/keys')return Response.json({keys:[key]});
 if(url.pathname.endsWith('/token')||url.pathname.endsWith('/access_token')){
  const data=new URLSearchParams(String(init?.body)),code=data.get('code')!,identity=codes.get(code);assert.ok(identity,'Authorization codes are single use');codes.delete(code);
  assert.equal(data.get('redirect_uri'),`${origin}/api/auth/${identity.provider}/callback`);
  if(identity.provider==='facebook'){const token=`token-${code}`;tokens.set(token,identity);return Response.json({access_token:token,token_type:'bearer'});}
  if(identity.provider==='apple')await jwtVerify(data.get('client_secret')!,appleSecret.publicKey,{issuer:'apple-team',audience:'https://appleid.apple.com',subject:'apple-id',algorithms:['ES256']});
  else {assert.equal(data.get('client_secret'),'google-secret');assert.ok(data.get('code_verifier'));}
  const jwt=await new SignJWT({email:identity.email,email_verified:true,nonce:identity.invalidNonce?'wrong':identity.nonce,name:'Google Reader'}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer(identity.invalidToken==='issuer'?'https://evil.example':identity.provider==='apple'?'https://appleid.apple.com':'https://accounts.google.com').setAudience(identity.invalidToken==='audience'?'other-app':`${identity.provider}-id`).setSubject(identity.sub).setIssuedAt().setExpirationTime(identity.invalidToken==='expiry'?'0s':'5m').sign(identity.invalidToken==='signature'?wrongKey.privateKey:rsa.privateKey);
  return Response.json({id_token:jwt,access_token:'unused',token_type:'bearer'});
 }
 if(url.pathname.endsWith('/me')){const token=new Headers(init?.headers).get('Authorization')!.slice(7),identity=tokens.get(token)!;assert.ok(identity);assert.equal(url.searchParams.get('appsecret_proof'),createHmac('sha256','facebook-secret').update(token).digest('hex'));return Response.json({id:identity.sub,email:identity.email,name:'Facebook Reader'});}
 throw new Error(`Unexpected external request: ${url.origin}${url.pathname}`);
};
const request=(route:string,method='GET',body?:unknown,cookie?:string,requestOrigin=origin)=>handle(new Request(origin+route,{method,headers:{Origin:requestOrigin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':body instanceof URLSearchParams?'application/x-www-form-urlencoded':'application/json'}:{})},...(body?{body:body instanceof URLSearchParams?body:JSON.stringify(body)}:{})}));
async function start(provider:string,returnTo='/vi/posts/story?language=vi'){
 const response=await request(`/api/auth/${provider}`,'POST',{locale:'vi',returnTo});assert.equal(response.status,200);
 const data=await response.json(),url=new URL(data.url),cookie=response.headers.get('set-cookie')!.split(';')[0];
 assert.equal(url.searchParams.get('redirect_uri'),`${origin}/api/auth/${provider}/callback`);
 if(provider==='apple'){assert.match(response.headers.get('set-cookie')!,/SameSite=none/i);assert.match(response.headers.get('set-cookie')!,/Secure/);assert.equal(url.searchParams.get('response_mode'),'form_post');}
 if(provider==='google')assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 return {provider,url,cookie};
}
let codeIndex=0;
async function callback(flow:Awaited<ReturnType<typeof start>>,email=`${flow.provider}@example.com`,sub=`${flow.provider}-subject`,extra:{invalidNonce?:boolean;invalidToken?:Identity['invalidToken'];state?:string;user?:string}={}){
 const code=`code-${codeIndex++}`;codes.set(code,{provider:flow.provider,email,sub,nonce:flow.url.searchParams.get('nonce')||'',invalidNonce:extra.invalidNonce,invalidToken:extra.invalidToken});
 const params=new URLSearchParams({code,state:extra.state??flow.url.searchParams.get('state')!,...(extra.user?{user:extra.user}:{})});
 return flow.provider==='apple'?request('/api/auth/apple/callback','POST',params,flow.cookie):request(`/api/auth/${flow.provider}/callback?${params}`,'GET',undefined,flow.cookie);
}
const session=(response:Response)=>/once_session=([a-f0-9]{64})/.exec(response.headers.get('set-cookie')||'')?.[0];
try{
 const availability=await (await request('/api/auth')).json();assert.ok(availability.googleEnabled&&availability.facebookEnabled&&availability.appleEnabled);
 assert.equal((await request('/api/auth/facebook','POST',{locale:'en'},undefined,'https://evil.example')).status,403);
 for(const provider of ['google','facebook','apple']){
  const response=await callback(await start(provider),undefined,undefined,{user:JSON.stringify({name:{firstName:'Apple',lastName:'Reader'},email:'attacker@example.com'})});
  assert.equal(response.headers.get('location'),origin+'/vi/posts/story?language=vi');assert.ok(session(response));
  const profile=await (await request('/api/auth','GET',undefined,session(response))).json();assert.equal(profile.user.provider,provider);assert.equal(profile.user.email,`${provider}@example.com`);assert.equal(profile.user.role,provider==='google'?'admin':'reader');
  assert.ok(!JSON.stringify(profile).includes('Sub'));assert.ok(!JSON.stringify(profile).includes('secret'));
  const logout=await request('/api/auth','DELETE',undefined,session(response));assert.equal(logout.status,200);assert.equal((await (await request('/api/auth','GET',undefined,session(response))).json()).user,null);
 }
 const before=fetchCount,badState=await callback(await start('facebook'),undefined,undefined,{state:'forged'});assert.ok(badState.headers.get('location')!.includes('authError=oauthFailed'));assert.equal(fetchCount,before);
 const flow=createSocialFlow('facebook','en','https://evil.example');assert.equal(flow.flow.returnTo,'/en');assert.equal(readSocialFlow('apple',flow.cookie),null);assert.equal(readSocialFlow('facebook',flow.cookie+'x'),null);
 const invalidNonce=await callback(await start('apple'),undefined,undefined,{invalidNonce:true});assert.ok(invalidNonce.headers.get('location')!.includes('authError=oauthFailed'));assert.equal(session(invalidNonce),undefined);
 for(const provider of ['google','apple'])for(const invalidToken of ['signature','issuer','audience','expiry'] as const){const rejected=await callback(await start(provider),undefined,undefined,{invalidToken});assert.ok(rejected.headers.get('location')!.includes('authError=oauthFailed'),`${provider}: reject ${invalidToken}`);assert.equal(session(rejected),undefined);}
 const collision=await callback(await start('facebook'),'google@example.com','other-subject');assert.ok(collision.headers.get('location')!.includes('authError=accountExists'));assert.equal(session(collision),undefined);
 const missingEmail=await callback(await start('facebook'),'','no-email');assert.ok(missingEmail.headers.get('location')!.includes('authError=socialEmailMissing'));
 const returning=await callback(await start('apple'));assert.ok(session(returning));const publicProfile=await (await request('/api/auth','GET',undefined,session(returning))).json();assert.equal(publicProfile.user.name,'Apple Reader');
 assert.equal((await getPlatform().db.all<{count:number}>('SELECT COUNT(*) count FROM users'))[0].count,3);
 const db=new Database(process.env.DATABASE_PATH!);migrateLocal(db);migrateLocal(db);assert.equal(db.prepare('SELECT COUNT(*) count FROM users').get()!.count,3);db.close();
 const oldKey=process.env.APPLE_PRIVATE_KEY;delete process.env.APPLE_PRIVATE_KEY;assert.throws(()=>socialConfig('apple'));const disabled=await (await request('/api/auth')).json();assert.equal(disabled.appleEnabled,false);process.env.APPLE_PRIVATE_KEY=oldKey;
 console.log('PASS: Google/Facebook/Apple callbacks, signed identity checks, Apple client secret/form POST, sessions/logout, safe return URLs, CSRF, nonce, email collision, missing email, reader permissions, returning users and repeat migrations.');
}finally{globalThis.fetch=realFetch;/* Windows holds the runtime SQLite handle until process exit; fixture is outside the workspace. */}
