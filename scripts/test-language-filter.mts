import assert from 'node:assert/strict';
import {languages,languageGroup,languageMembers,matchesLanguage,languageLabel} from '../shared/languages';
import {locales} from '../shared/domain';
import {resolveLanguage,languageLocale,languageBrowseHref,languageArticleHref,languageSwitchHref} from '../lib/language-selection';
import {uiCopy} from '../lib/ui-i18n';
import {remotePosts,remoteSearch} from '../server/remote-content';

assert.deepEqual(languages,['en','vi']);
for(const locale of locales){assert.ok(languages.some(l=>l===languageGroup(locale)));assert.ok(uiCopy(locale).allLanguages);for(const language of languages)assert.ok(languageLabel(language,locale));}
assert.equal(resolveLanguage('en'), 'all');assert.equal(resolveLanguage('en','en'),'en');
assert.equal(resolveLanguage('en','nl-BE'), 'all');assert.equal(resolveLanguage('en',undefined,'BE'),'all');
assert.equal(languageLocale('vi','all'),'en');assert.equal(languageLocale('en','vi'),'vi');
assert.equal(languageBrowseHref('en'),'/en?lang=en');assert.equal(languageBrowseHref('all'),'/en');
assert.equal(languageSwitchHref('/en/posts/story','lang=en&genre=Mystery&q=family','vi'),'/en/posts/story?lang=vi&genre=Mystery&q=family');
assert.equal(languageSwitchHref('/en','genre=Mystery&q=family','vi'),'/vi?lang=vi&genre=Mystery&q=family');
assert.equal(languageArticleHref({id:'story',language:'fr-BE'},'all'),'/en/posts/story?lang=all');
assert.deepEqual(languageMembers('fr'),['fr','fr-BE']);assert.ok(matchesLanguage('fr-BE','fr'));assert.ok(matchesLanguage('sr-Latn','sr'));assert.ok(!matchesLanguage('nl-BE','en'));
const previousFetch=globalThis.fetch,previousEnv={...process.env};
Object.assign(process.env,{NODE_ENV:'development',DEPLOY_TARGET:'',CONTENT_API_URL:'https://content.example',APP_URL:'http://localhost:3000'});
const post={id:'france',title:'Story',excerpt:'Story',content:'Story',country:'FR',language:'fr',category:'Emotional Family Stories',image:'',author:'Author',date:'2026-11-15',published:true};
const posts=[post,{...post,id:'belgium',country:'BE',language:'fr-BE'},{...post,id:'english-france',language:'en'},{...post,id:'dutch',language:'nl-BE'},{...post,id:'draft',published:false}];
globalThis.fetch=async input=>String(input).includes('/search')?Response.json({posts:posts.slice(0,4).reverse().map(p=>({...p,views:1}))}):Response.json({posts});
try{
  assert.deepEqual((await remotePosts({language:'fr'})).map(p=>p.id),['france','belgium']);
  assert.deepEqual((await remotePosts({language:'en'})).map(p=>p.id),['english-france'],'Filter by language, not country');
  assert.deepEqual((await remotePosts({language:'nl'})).map(p=>p.id),['dutch']);
  assert.deepEqual((await remoteSearch({language:'fr'})).map(p=>p.id),['belgium','france'],'Whitelist requested language even if old API ignores the filter');
  globalThis.fetch=async input=>String(input).includes('/search')?new Response('{}',{status:400}):Response.json({posts});
  assert.deepEqual((await remoteSearch({language:'fr'})).map(p=>p.id),['france','belgium']);
  const many=Array.from({length:40},(_,i)=>({...post,id:`remote-${i}`,language:'fr'}));
  // Deployed APIs without pagination must still expose results after the first six.
  globalThis.fetch=async input=>String(input).includes('/search')?Response.json({posts:many.slice(0,6).map(p=>({...p,views:1}))}):Response.json({posts:many});
  assert.deepEqual((await remoteSearch({offset:6,limit:7})).map(p=>p.id),many.slice(6,13).map(p=>p.id));
  // New APIs supply pagination; use their order and handle a 31-row lookahead.
  let requests=0;
  globalThis.fetch=async input=>{requests++;const url=new URL(String(input));assert.ok(url.pathname.endsWith('/search'));const offset=Number(url.searchParams.get('offset')),limit=Number(url.searchParams.get('limit'));assert.ok(limit<=30);return Response.json({posts:many.slice(offset,offset+limit).map(p=>({...p,views:1})),nextOffset:offset+limit<many.length?offset+limit:null});};
  assert.deepEqual((await remoteSearch({offset:6,limit:31})).map(p=>p.id),many.slice(6,37).map(p=>p.id));assert.equal(requests,2);
}finally{
  globalThis.fetch=previousFetch;
  for(const key of ['NODE_ENV','DEPLOY_TARGET','CONTENT_API_URL','APP_URL']){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}
}
console.log(`PASS: ${languages.length} unique language options, translated labels, regional groups, language-based posts/search and legacy links/API compatibility.`);
