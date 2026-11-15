import assert from 'node:assert/strict';
import {categories,categoryLabels,categoryValue,categoryAliases} from '../shared/categories';
import {categoryName,locales} from '../lib/i18n';
import {browseHref} from '../lib/country-selection';
import {remotePosts,remoteSearch} from '../server/remote-content';

assert.equal(categories.length,8);
for(const locale of locales){
  assert.equal(categoryLabels[locale].length,8);
  assert.equal(new Set(categoryLabels[locale]).size,8);
  for(const [index,category] of categories.entries()){
    const label=categoryName(category,locale);
    assert.equal(label,categoryLabels[locale][index]);
    if(locale!=='en')assert.notEqual(label,category);
    assert.equal(categoryValue(label),category);
    assert.equal(categoryValue(label.toUpperCase()),category);
    assert.ok(categoryAliases(category).includes(label));
    assert.equal(new URL(browseHref('all',{genre:category}),'https://example.com').searchParams.get('genre'),category);
  }
}
assert.equal(categoryName('Unclassified','vi'),'Unclassified');
const originalFetch=globalThis.fetch,originalEnv={...process.env};
Object.assign(process.env,{NODE_ENV:'development',DEPLOY_TARGET:'',CONTENT_API_URL:'https://content.example',APP_URL:'http://localhost:3000'});
const post={id:'family',title:'A family story',excerpt:'A story',content:'Content',country:'VN',language:'vi',category:categoryLabels.vi[0],image:'',author:'Author',date:'2026-11-15',published:true};
globalThis.fetch=async input=>String(input).includes('/api/search')?new Response('{}',{status:404}):Response.json({posts:[post]});
try{
  assert.equal((await remotePosts())[0].category,categories[0]);
  assert.equal((await remoteSearch({genre:categoryLabels.vi[0]}))[0].category,categories[0]);
  assert.deepEqual(await remoteSearch({genre:categories[1]}),[]);
}finally{
  globalThis.fetch=originalFetch;
  for(const key of ['NODE_ENV','DEPLOY_TARGET','CONTENT_API_URL','APP_URL']){if(originalEnv[key]===undefined)delete process.env[key];else process.env[key]=originalEnv[key];}
}
console.log(`PASS: 8 categories across ${locales.length} locales, translated labels, canonical values, filter URLs, translated API categories and search filtering.`);
