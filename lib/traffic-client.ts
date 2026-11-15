'use client';
import {attributionFrom,type Attribution} from '@/shared/analytics';
type Session=Attribution&{id:string;lastActive:number};
let usedReferrer=false;
let fallback:Session|undefined,cleanup:(()=>void)|undefined,last:{url:string;post:string;id:string;at:number}|undefined;
export function trafficSession():Session{
 const url=new URL(location.href),incoming=attributionFrom(url,usedReferrer?'':document.referrer),now=Date.now();usedReferrer=true;let previous=fallback;
 try{const raw=sessionStorage.getItem('once-traffic-session');if(raw)previous=JSON.parse(raw);}catch{}
 const hasCampaign=url.searchParams.has('utm_source')||url.searchParams.has('fb_page'),changed=hasCampaign&&previous&&(incoming.source!==previous.source||incoming.campaign!==previous.campaign||incoming.fanpage!==previous.fanpage);
 const session=previous&&typeof previous.id==='string'&&now-previous.lastActive<1800000&&!changed?{...previous,lastActive:now}:{...incoming,id:crypto.randomUUID(),lastActive:now};fallback=session;
 try{sessionStorage.setItem('once-traffic-session',JSON.stringify(session));}catch{}return session;
}
function send(payload:unknown,beacon=false){const body=JSON.stringify(payload);if(beacon&&navigator.sendBeacon){navigator.sendBeacon('/api/traffic',new Blob([body],{type:'application/json'}));return;}void fetch('/api/traffic',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});}
export function stopTraffic(){cleanup?.();cleanup=undefined;}
export function clearTrafficSession(){stopTraffic();fallback=undefined;last=undefined;try{sessionStorage.removeItem('once-traffic-session');}catch{}}
export function recordTraffic(postId:string,visitor:string){
 const now=Date.now(),url=location.href;if(last&&last.url===url&&last.post===postId&&now-last.at<500)return;
 stopTraffic();const session=trafficSession(),id=crypto.randomUUID();last={url,post:postId,id,at:now};
 send({type:'view',id,postId,visitor,sessionId:session.id,attribution:session,language:document.documentElement.lang,device:innerWidth<768?'mobile':'desktop'});
 let active=0,tick=performance.now(),lastSent=0,done=false,readHalf=false;
 const accountTime=()=>{const current=performance.now();if(document.visibilityState==='visible')active+=Math.min(current-tick,2000);tick=current;};
 const progress=()=>{const height=document.documentElement.scrollHeight-innerHeight;if(height>0&&scrollY/height>=.5)readHalf=true;};
 const flush=(beacon=false)=>{accountTime();if(active<1000||active-lastSent<1000)return;send({type:'engagement',id,visitor,sessionId:session.id,engagedMs:Math.round(active),readHalf},beacon);lastSent=active;};
 const interval=setInterval(()=>{accountTime();progress();if(!done&&(active>=30000||active>=10000&&readHalf)){done=true;flush();}},1000);
 const visibility=()=>{accountTime();if(document.visibilityState==='hidden')flush(true);};
 const leave=()=>flush(true);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);window.addEventListener('scroll',progress,{passive:true});
 cleanup=()=>{clearInterval(interval);flush(true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);window.removeEventListener('scroll',progress);};
}
