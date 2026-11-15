export type Attribution={source:string;medium:string;campaign:string;fanpage:string;referrer:string;landing:string};
export type TrafficGroup={key:string;views:number;sessions:number;users:number;engagedViews:number;engagementRate:number;averageSeconds:number};
export type DateRange={start:string;end:string};
export type Fanpage={slug:string;name:string;adChannel:string|null};
export type RevenueRow={date:string;dimension:string;views:number;impressions:number;clicks:number;micros:number;genre?:string;postCountry?:string};
export type RevenueReport={kind:'country'|'page'|'channel';currency:string;rows:RevenueRow[];totals:{views:number;impressions:number;clicks:number;micros:number};syncedAt:string;warnings:string[]};
export type AnalyticsResult={range:DateRange;summary:TrafficGroup;firstTrackedAt:string|null;sources:TrafficGroup[];fanpages:TrafficGroup[];genres:TrafficGroup[];countries:TrafficGroup[];postCountries:TrafficGroup[];matrix:(TrafficGroup&{genre:string;country:string})[];pages:Fanpage[];revenue:{connected:boolean;configured:boolean;accountId:string|null;accountName:string|null;timeZone:string|null;reports:RevenueReport[]}};
export function cleanTag(value:unknown,max=120){return typeof value==='string'?value.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max):'';}
export function fanpageSlug(value:unknown){return typeof value==='string'&&/^[a-z0-9][a-z0-9._-]{0,79}$/.test(value)?value:'';}
export function attributionFrom(url:URL,referrer:string):Attribution{
 let host='';try{host=new URL(referrer).hostname.toLowerCase();}catch{}
 const external=host&&host!==url.hostname?host:'',tag=cleanTag(url.searchParams.get('utm_source'),80).toLowerCase();
 const facebook=external==='facebook.com'||external.endsWith('.facebook.com')||external==='fb.com'||url.searchParams.has('fbclid');
 const source=tag|| (facebook?'facebook':external||'direct'),medium=cleanTag(url.searchParams.get('utm_medium'),80).toLowerCase()||(facebook?'social':external?'referral':'none');
 return {source:source==='fb'?'facebook':source,medium,campaign:cleanTag(url.searchParams.get('utm_campaign')),fanpage:(source==='facebook'||source==='fb')?fanpageSlug(url.searchParams.get('fb_page')):'',referrer:external,landing:url.pathname.slice(0,500)};
}
