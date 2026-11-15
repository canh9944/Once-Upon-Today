import {createHmac} from 'node:crypto';
import {getPlatform} from './platform';
import {one,getPost} from './repository';
import {fail} from './security';
import {categoryValue} from '../shared/categories';
import {cleanTag,fanpageSlug,type DateRange,type TrafficGroup} from '../shared/analytics';

export function dateRange(url:URL):DateRange{
 const end=url.searchParams.get('end')||new Date().toISOString().slice(0,10),start=url.searchParams.get('start')||new Date(Date.now()-29*86400000).toISOString().slice(0,10);
 const valid=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(!valid(start)||!valid(end)||start>end||Date.parse(end)-Date.parse(start)>89*86400000||end>new Date().toISOString().slice(0,10))fail('validationError');return {start,end};
}
const uuid=(value:unknown)=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(value);
export async function captureTraffic(req:Request,p:any){
 if(!p||!uuid(p.id)||!uuid(p.sessionId)||typeof p.visitor!=='string'||!p.visitor||p.visitor.length>80)fail('validationError');
 const {db,env}=getPlatform(),visitor=createHmac('sha256',env.SESSION_SECRET||'once-anonymous-traffic').update(p.visitor).digest('hex');
 if(p.type==='engagement'){
  if(!Number.isFinite(p.engagedMs)||p.engagedMs<0||typeof p.readHalf!=='boolean')fail('validationError');
  const row=await one<{createdAt:string}>('SELECT createdAt FROM traffic_views WHERE id=? AND visitor=? AND sessionId=?',[p.id,visitor,p.sessionId]);if(!row)return;
  const duration=Math.max(0,Math.min(p.engagedMs,1800000,Date.now()-Date.parse(row.createdAt)+2000)),engaged=duration>=30000||duration>=10000&&p.readHalf;
  await db.run('UPDATE traffic_views SET engagedMs=MAX(engagedMs,?),engaged=MAX(engaged,?) WHERE id=? AND visitor=? AND sessionId=?',[Math.round(duration),Number(engaged),p.id,visitor,p.sessionId]);return;
 }
 if(p.type!=='view'||typeof p.postId!=='string'||p.postId.length>100||!p.attribution||!['desktop','mobile'].includes(p.device))fail('validationError');
 const post=p.postId==='home'?null:await getPost(p.postId);if(p.postId!=='home'&&!post)return;
 const a=p.attribution,source=cleanTag(a.source,80).toLowerCase()||'direct',country=(getPlatform().country||req.headers.get('cf-ipcountry')||'').toUpperCase(),geo=/^[A-Z]{2}$/.test(country)&&!['XX','T1'].includes(country)?country:'unknown';
 let referrer='';try{referrer=new URL('https://'+cleanTag(a.referrer,200)).hostname;}catch{}
 const landing=typeof a.landing==='string'&&a.landing.startsWith('/')?a.landing.split(/[?#]/)[0].slice(0,500):'/';
 await db.run('INSERT OR IGNORE INTO traffic_views(id,visitor,sessionId,postId,genre,postCountry,country,source,medium,campaign,fanpage,referrer,landing,language,device,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[p.id,visitor,p.sessionId,p.postId,post?categoryValue(post.category):'home',post?.country||'unknown',geo,source,cleanTag(a.medium,80)||'none',cleanTag(a.campaign),source==='facebook'?fanpageSlug(a.fanpage):'',referrer,landing,cleanTag(p.language,20),p.device,new Date().toISOString()]);
}
const grouping:Record<string,string>={sources:'source',fanpages:"CASE WHEN source='facebook' THEN COALESCE(NULLIF(fanpage,''),'unknown') ELSE 'other' END",genres:'genre',countries:'country',postCountries:'postCountry',matrix:"genre || char(31) || country"};
export async function trafficAnalytics(range:DateRange){
 const {db}=getPlatform(),args=[range.start+'T00:00:00.000Z',range.end+'T23:59:59.999Z'];
 const aggregate='COUNT(*) views,COUNT(DISTINCT sessionId) sessions,COUNT(DISTINCT visitor) users,SUM(engaged) engagedViews,AVG(engagedMs)/1000 averageSeconds';
 const decorate=(row:TrafficGroup)=>({...row,engagedViews:row.engagedViews||0,averageSeconds:row.averageSeconds||0,engagementRate:row.views?(row.engagedViews||0)/row.views:0});
 const summary=decorate((await db.all<TrafficGroup>(`SELECT 'all' key,${aggregate} FROM traffic_views WHERE createdAt BETWEEN ? AND ?`,args))[0]);
 const output:Record<string,TrafficGroup[]>={};for(const [name,expression] of Object.entries(grouping))output[name]=(await db.all<TrafficGroup>(`SELECT ${expression} key,${aggregate} FROM traffic_views WHERE createdAt BETWEEN ? AND ? ${name==='fanpages'?"AND source='facebook'":''} GROUP BY ${expression} ORDER BY views DESC,key ASC LIMIT 200`,args)).map(decorate);
 return {range,summary,firstTrackedAt:(await one<{value:string}>('SELECT MIN(createdAt) value FROM traffic_views'))?.value||null,...output,matrix:output.matrix.map(row=>{const [genre,country]=row.key.split('\u001f');return {...row,genre,country};})};
}
