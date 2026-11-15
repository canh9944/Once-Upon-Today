import {isCountryCode} from '../shared/countries';
import {NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {imageSize} from 'image-size';
import {getPlatform} from './platform';
import {one,getPost,listPosts,upsertPost,searchStories} from './repository';
import {ApiError,admin,configured,cookieOptions,currentUser,digest,equal,fail,hashPassword,limit,normalizeEmail,origin,readCookie,sessionCookie,setSession,validEmail,verifyPassword,type Account} from './security';
import {authorizationUrl,createFlow,googleConfig,googleIdentity,oauthCookie,readFlow} from './google';
import type {Post} from '../shared/data';
import {brand,isLocale} from '../shared/domain';
import {MAX_IMAGE_BYTES,MAX_POST_CONTENT,isImageSource} from '../shared/content';
import {hasContent,sanitizeContent} from '../shared/sanitize-content';
import {contentOrigin,remotePosts,remoteStory,remoteSearch} from './remote-content';
import {categoryValue} from '../shared/categories';

const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
async function body(req:Request){try{return await req.json();}catch{fail('validationError');}}
async function route(req:Request):Promise<Response>{
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\/?/,''),method=req.method;
 const requestedLanguage=url.searchParams.get('language');
 if(method==='GET'&&['posts','search'].includes(path)&&requestedLanguage&&requestedLanguage!=='all'&&!isLocale(requestedLanguage))fail('validationError');
 const remote=contentOrigin();
 if(remote){
  if(path==='health'&&method==='GET')return json({ok:true,database:null,contentSource:remote});
  if(path==='auth'&&method==='GET')return json({authenticated:false,user:null,googleEnabled:false,remoteOrigin:remote});
  if(path==='auth'&&method==='DELETE')return json({ok:true});
  if(path==='events'&&method==='POST')return json({ok:true});
  if(path==='posts'&&method==='GET')return json({posts:await remotePosts({country:url.searchParams.get('country')||undefined,language:url.searchParams.get('language')||undefined})});
  if(path==='search'&&method==='GET')return json({posts:await remoteSearch({query:url.searchParams.get('q')||'',country:url.searchParams.get('country')||undefined,genre:url.searchParams.get('genre')||undefined,language:url.searchParams.get('language')||undefined})});
  if(path.startsWith('stories/')&&method==='GET'){const post=await remoteStory(decodeURIComponent(path.slice(8)));if(!post)fail('notFound',404);return json({post});}
  fail('requestError',403);
 }
 const {db,objects,env}=getPlatform();
 if(env.READ_ONLY==='true'&&!['GET','HEAD'].includes(method))fail('maintenance',503);
 if(path==='health'&&method==='GET')return json({ok:true,database:getPlatform().kind==='node'?'sqlite':'d1'});
 if(path==='search'&&method==='GET'){
  const query=url.searchParams.get('q')||'',country=url.searchParams.get('country')||undefined,genre=url.searchParams.get('genre')||undefined,language=url.searchParams.get('language')||undefined;
  if(language&&language!=='all'&&!isLocale(language)||query.length>200||country&&country!=='all'&&!isCountryCode(country))fail('validationError');
  return json({posts:await searchStories({query,country,genre,language})});
 }
 if(path==='auth'&&method==='GET'){const user=await currentUser(req);return json({authenticated:!!user,user,googleEnabled:!!(configured()&&env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.APP_URL)});}
 if(path==='auth'&&method==='DELETE'){origin(req);const raw=readCookie(req,sessionCookie);if(raw)await db.run('DELETE FROM sessions WHERE hash=?',[digest(raw)]);const res=json({ok:true});res.cookies.set(sessionCookie,'',{...cookieOptions(),maxAge:0});return res;}
 if((path==='auth'||path==='auth/signup')&&method==='POST'){
  origin(req);if(!configured())fail('configError',503);const signup=path.endsWith('signup');await limit(req,signup?'signup':'login',signup?5:10);const p=await body(req);
  if(!validEmail(p?.email)||typeof p.password!=='string'||p.password.length>128)fail(signup?'signupValidation':'loginError');const email=normalizeEmail(p.email);let id:string|undefined;
  if(signup){if(typeof p.name!=='string'||p.name.trim().length<2||p.name.trim().length>80||p.password.length<12)fail('signupValidation');if(email===normalizeEmail(env.ADMIN_EMAIL||'')||await one('SELECT id FROM users WHERE email=?',[email]))fail('accountExists',409);id=randomUUID();const hash=await hashPassword(p.password);try{await db.run('INSERT INTO users(id,email,name,passwordHash,googleSub,createdAt) VALUES(?,?,?,?,NULL,?)',[id,email,p.name.trim(),hash,new Date().toISOString()]);}catch(e){if(String(e).includes('UNIQUE'))fail('accountExists',409);throw e;}}
  else if(env.ADMIN_EMAIL&&env.ADMIN_PASSWORD&&equal(email,normalizeEmail(env.ADMIN_EMAIL))&&equal(p.password,env.ADMIN_PASSWORD))id='env-admin';
  else{const user=await one<Account>('SELECT * FROM users WHERE email=?',[email]);if(user?.passwordHash&&await verifyPassword(p.password,user.passwordHash))id=user.id;}
  if(!id)fail('loginError',401);const res=json({ok:true},signup?201:200);await setSession(req,res,id);return res;
 }
 if(path==='auth/google'&&method==='POST'){origin(req);await limit(req,'google',20);try{googleConfig();const p=await body(req),{flow,cookie}=createFlow(isLocale(p?.locale)?p.locale:'en',p?.returnTo),res=json({url:authorizationUrl(flow)});res.cookies.set(oauthCookie,cookie,{...cookieOptions(),maxAge:600});return res;}catch{fail('googleUnavailable',503);}}
 if(path==='auth/google/callback'&&method==='GET'){
  const flow=readFlow(readCookie(req,oauthCookie)),destination=new URL(flow?.returnTo||'/en',env.APP_URL||url.origin);
  const reject=(code:string)=>{destination.searchParams.set('authError',code);const res=NextResponse.redirect(destination,307);res.cookies.set(oauthCookie,'',{...cookieOptions(),maxAge:0});return res;};
  if(!flow||!equal(url.searchParams.get('state')||'',flow.state)||url.searchParams.has('error')||!url.searchParams.get('code'))return reject('oauthFailed');
  try{const identity=await googleIdentity(url.searchParams.get('code')!,flow);if(!validEmail(identity.email))return reject('oauthFailed');const email=normalizeEmail(identity.email),existing=await one<Account>('SELECT * FROM users WHERE googleSub=?',[identity.sub]),collision=await one<Account>('SELECT * FROM users WHERE email=?',[email]);if(collision&&collision.id!==existing?.id)return reject('accountExists');const id=existing?.id||randomUUID();if(existing)await db.run('UPDATE users SET email=?,name=? WHERE id=?',[email,identity.name.slice(0,80),id]);else await db.run('INSERT INTO users VALUES(?,?,?,NULL,?,?)',[id,email,identity.name.slice(0,80),identity.sub,new Date().toISOString()]);const res=NextResponse.redirect(destination,307);await setSession(req,res,id);res.cookies.set(oauthCookie,'',{...cookieOptions(),maxAge:0});return res;}catch{return reject('oauthFailed');}
 }
 if(path==='posts'&&method==='GET'){const language=url.searchParams.get('language')||undefined,country=url.searchParams.get('country')||undefined;if(language&&language!=='all'&&!isLocale(language)||country&&!isCountryCode(country))fail('validationError');return json({posts:await listPosts({country,language,admin:(await currentUser(req))?.role==='admin'})});}
 if((path.startsWith('posts/')||path.startsWith('stories/'))&&method==='GET'){const editing=path.startsWith('posts/');if(editing)await admin(req);const post=await getPost(path.split('/')[1],editing);if(!post)fail('notFound',404);return json({post});}
 if(path==='posts'&&method==='POST'){
  await admin(req,true);const p=await body(req);if(!p||!['title','excerpt','category'].every(k=>typeof p[k]==='string'&&p[k].trim()&&p[k].length<1000)||typeof p.content!=='string'||!p.content.trim()||p.content.length>MAX_POST_CONTENT||!isCountryCode(p.country)||!isLocale(p.language)||typeof p.published!=='boolean'||p.contentFormat!==undefined&&!['text','html'].includes(p.contentFormat))fail('validationError');
  const author=typeof p.author==='string'?p.author.trim()||brand:p.author===undefined?brand:null;if(!author||author.length>180)fail('validationError');if(p.image&&!isImageSource(p.image))fail('imageError');if(p.id!==undefined&&(typeof p.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(p.id)))fail('validationError');
  const content=p.contentFormat==='html'?sanitizeContent(p.content):p.content;if(p.contentFormat==='html'&&!hasContent(content))fail('validationError');const old=p.id?await getPost(p.id,true):null;
  const post:Post={id:p.id||randomUUID(),title:p.title.trim(),excerpt:p.excerpt.trim(),content,contentFormat:p.contentFormat||'text',country:p.country,language:p.language,category:categoryValue(p.category),image:p.image||'',author,date:old?.date||new Date().toISOString().slice(0,10),published:p.published};await upsertPost(post);return json({post});
 }
 if(path==='posts'&&method==='DELETE'){await admin(req,true);const p=await body(req);if(typeof p?.id!=='string')fail('validationError');await db.run('DELETE FROM posts WHERE id=?',[p.id]);return json({ok:true});}
 if(path==='events'&&method==='POST'){origin(req);await limit(req,'events',300);const p=await body(req);if(!p||typeof p.visitor!=='string'||p.visitor.length>80||!['view','like'].includes(p.type)||typeof p.postId!=='string')fail('validationError');if(p.postId!=='home'&&!await getPost(p.postId))return json({ok:true});const date=new Date().toISOString(),key=digest(JSON.stringify([p.visitor,p.type,p.postId,p.type==='view'?date.slice(0,10):'once']));await db.run('INSERT OR IGNORE INTO events VALUES(?,?,?,?,?)',[key,p.visitor,p.type,p.postId,date]);return json({ok:true});}
 if(path==='stats'&&method==='GET'){
  await admin(req);const counts=await db.all<{type:string;count:number}>('SELECT type,COUNT(*) count FROM events GROUP BY type'),users=await one<{count:number}>('SELECT COUNT(DISTINCT visitor) count FROM events'),posts=await db.all('SELECT p.id,p.title,p.country,COUNT(e.key) views FROM posts p LEFT JOIN events e ON e.postId=p.id AND e.type=\'view\' GROUP BY p.id'),start=new Date();start.setUTCDate(start.getUTCDate()-13);const recent=await db.all<{date:string;type:string;count:number}>('SELECT substr(date,1,10) date,type,COUNT(*) count FROM events WHERE date>=? GROUP BY substr(date,1,10),type',[start.toISOString().slice(0,10)]),days=Array.from({length:14},(_,i)=>{const d=new Date();d.setUTCDate(d.getUTCDate()-13+i);const date=d.toISOString().slice(0,10);return {date:date.slice(5),views:recent.find(r=>r.date===date&&r.type==='view')?.count||0,likes:recent.find(r=>r.date===date&&r.type==='like')?.count||0};});return json({views:counts.find(c=>c.type==='view')?.count||0,likes:counts.find(c=>c.type==='like')?.count||0,users:users?.count||0,days,posts});
 }
 if(path==='uploads'&&method==='POST'){
  await admin(req,true);await limit(req,'upload',30);const data=await req.formData(),file=data.get('file');if(!(file instanceof File))fail('uploadType');if(file.size>MAX_IMAGE_BYTES)fail('uploadSize',413);const bytes=new Uint8Array(await file.arrayBuffer());let info;try{info=imageSize(bytes);}catch{fail('uploadType');}const ext=info.type==='jpeg'?'jpg':info.type;if(!['jpg','png','webp'].includes(ext||'')||file.type!==(ext==='jpg'?'image/jpeg':`image/${ext}`)||!info.width||!info.height||info.width*info.height>25000000)fail('uploadType');const filename=`${randomUUID()}.${ext}`,mime=file.type;await objects.put(filename,bytes,mime);await db.run('INSERT INTO uploads VALUES(?,?,?,?)',[filename,mime,bytes.length,new Date().toISOString()]);return json({url:`/api/uploads/${filename}`},201);
 }
 if(path.startsWith('uploads/')&&method==='GET'){const key=path.slice(8);if(!/^[a-f0-9-]{36}\.(webp|jpg|png)$/.test(key))fail('notFound',404);const object=await objects.get(key);if(!object)fail('notFound',404);return new Response(object.bytes as BodyInit,{headers:{'Content-Type':object.contentType,'Cache-Control':'public,max-age=31536000,immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});}
 fail('notFound',404);
}
export async function handle(req:Request){try{
 if(req.body){const reader=req.body.getReader(),chunks:Uint8Array[]=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>8*1024*1024){await reader.cancel();fail('uploadSize',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}req=new Request(req.url,{method:req.method,headers:req.headers,body:bytes});}
 return await route(req);
}catch(e){if(e instanceof ApiError)return json({code:e.code},e.status);console.error('API failure',e instanceof Error?e.stack:'unknown');return json({code:'requestError'},500);}}
