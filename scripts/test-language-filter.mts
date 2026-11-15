import assert from 'node:assert/strict';
import {languages,languageGroup,languageMembers,matchesLanguage,languageLabel} from '../shared/languages';
import {locales} from '../shared/domain';
import {resolveLanguage,languageLocale,languageBrowseHref,languageArticleHref} from '../lib/language-selection';
import {uiCopy} from '../lib/ui-i18n';
import {remotePosts,remoteSearch} from '../server/remote-content';

assert.equal(languages[0],'en');assert.equal(new Set(languages).size,languages.length);
for(const locale of locales){assert.ok(languages.some(l=>l===languageGroup(locale)));assert.ok(uiCopy(locale).allLanguages);for(const language of languages)assert.ok(languageLabel(language,locale));}
assert.equal(resolveLanguage('en'), 'all');assert.equal(resolveLanguage('en','en'),'en');
assert.equal(resolveLanguage('nl-BE'), 'nl');assert.equal(resolveLanguage('en',undefined,'BE'),'fr');
assert.equal(languageLocale('nl-BE','all'),'en');assert.equal(languageLocale('nl-BE','nl'),'nl-BE');
assert.equal(languageBrowseHref('en'),'/en?lang=en');assert.equal(languageBrowseHref('all'),'/en');
assert.ok(languageArticleHref({id:'story',language:'fr-BE'},'fr').endsWith('?lang=fr'));
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
}finally{
  globalThis.fetch=previousFetch;
  for(const key of ['NODE_ENV','DEPLOY_TARGET','CONTENT_API_URL','APP_URL']){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}
}
console.log(`PASS: ${languages.length} unique language options, translated labels, regional groups, language-based posts/search and legacy links/API compatibility.`);
