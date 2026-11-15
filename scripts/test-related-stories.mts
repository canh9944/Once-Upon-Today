import assert from 'node:assert/strict';
import type {Post} from '../shared/data';
import {categories,categoryLabels} from '../shared/categories';
import {relatedStories} from '../shared/related-stories';

const current:Post={id:'current',title:'Family memories',excerpt:'A quiet reunion',content:'Original content',country:'US',language:'en',category:categories[0],image:'',author:'Author',date:'2026-11-15',published:true};
const post=(id:string,values:Partial<Post>={}):Post=>({...current,id,title:'Other perspectives',excerpt:'Another subject',category:categories[2],country:'FR',language:'fr',...values});
const pool=[current,post('draft',{published:false,category:categories[0]}),post('unrelated'),post('same-language',{language:'en'}),post('same-market',{country:'GB'}),post('same-category',{category:categoryLabels.vi[0]}),post('same-category',{title:'Duplicate'})];
const result=relatedStories(current,pool);
assert.equal(result[0].id,'same-category','Same category has priority, including translated labels');
assert.ok(result.findIndex(p=>p.id==='same-language')<result.findIndex(p=>p.id==='unrelated'));
assert.ok(result.findIndex(p=>p.id==='same-market')<result.findIndex(p=>p.id==='unrelated'));
assert.ok(!result.some(p=>['current','draft'].includes(p.id)));
assert.equal(new Set(result.map(p=>p.id)).size,result.length);
assert.ok(result.every(p=>!('content' in p)),'Avoid sending full article bodies with recommendation cards');
assert.equal(relatedStories(current,Array.from({length:20},(_,i)=>post(`post-${i}`))).length,8);
assert.deepEqual(relatedStories(current,pool,0),[]);
assert.deepEqual(relatedStories(current,[current]),[]);
console.log('PASS: relevant ranking, translated categories, US-UK grouping, current/draft/duplicate exclusion, metadata-only cards and bounded/empty results.');
