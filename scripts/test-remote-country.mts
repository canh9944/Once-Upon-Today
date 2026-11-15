import assert from 'node:assert/strict';
import {remotePosts,remoteSearch} from '../server/remote-content';
import {countries,europeanCountryOrder,normalizeCountry,matchesCountry,isCountryCode} from '../shared/countries';
import {browseHref,resolveCountry} from '../lib/country-selection';

const originalFetch=globalThis.fetch,originalEnv={...process.env};
Object.assign(process.env,{NODE_ENV:'development',DEPLOY_TARGET:'',CONTENT_API_URL:'https://content.example',APP_URL:'http://localhost:3000'});
const post={id:'england',title:'England story',excerpt:'A story',content:'Content',country:'GB-ENG',language:'en',category:'Emotional Family Stories',image:'',author:'Author',date:'2026-11-15',published:true};
const posts=[post,{...post,id:'uk',country:'GB'},{...post,id:'usa',country:'US'},{...post,id:'market',country:'US-UK'},{...post,id:'vietnam',country:'VN'},{...post,id:'finland',country:'FI'},{...post,id:'draft',published:false}];
const calls:string[]=[];
try{
  globalThis.fetch=async input=>{
    const url=new URL(String(input));calls.push(url.href);
    return url.searchParams.has('country')?new Response('{}',{status:400}):Response.json({posts});
  };
  assert.equal(countries[0].code,'US-UK');
  assert.equal(new Set(countries.map(c=>c.code)).size,countries.length);
  assert.ok(!countries.some(c=>['US','GB','GB-ENG'].includes(c.code)));
  assert.deepEqual(countries.slice(1,1+europeanCountryOrder.length).map(c=>c.code),[...europeanCountryOrder]);
  assert.deepEqual(countries.slice(-4).map(c=>c.code),['VN','JP','KR','TH']);
  for(const alias of ['US-UK','US','GB','GB-ENG']){
    assert.equal(normalizeCountry(alias),'US-UK');assert.ok(isCountryCode(alias));
    assert.equal(resolveCountry('en',alias),'US-UK');
    assert.equal(browseHref(alias),'/en?country=US-UK');
    assert.ok(matchesCountry(alias,'US-UK'));assert.ok(!matchesCountry('VN',alias));
    assert.deepEqual((await remotePosts({country:alias})).map(p=>p.id),['england','uk','usa','market']);
  }
  assert.equal(new URL(calls[0]).searchParams.has('country'),false);
  assert.deepEqual((await remoteSearch({country:'US-UK',query:'England'})).map(p=>p.id),['england','uk','usa','market']);
  assert.deepEqual((await remotePosts({country:'FI'})).map(p=>p.id),['finland'],'Keep the old-API country fallback');
  globalThis.fetch=async()=>Response.json({posts:posts.filter(p=>!matchesCountry(p.country,'US-UK'))});
  assert.deepEqual(await remotePosts({country:'US-UK'}),[],'No matching market posts must give an empty list');
  for(const status of [401,403,500]){
    let count=0;globalThis.fetch=async()=>{count++;return new Response('{}',{status});};
    await assert.rejects(remotePosts({country:'GB-ENG'}),new RegExp(`HTTP ${status}`));
    assert.equal(count,1,'Do not hide authorization or server failures');
  }
  console.log('PASS: US-UK first, Europe-first order, legacy aliases, grouped US/UK posts and search, old-API fallback, draft exclusion and preserved upstream errors.');
}finally{
  globalThis.fetch=originalFetch;
  for(const key of ['NODE_ENV','DEPLOY_TARGET','CONTENT_API_URL','APP_URL']){if(originalEnv[key]===undefined)delete process.env[key];else process.env[key]=originalEnv[key];}
}
