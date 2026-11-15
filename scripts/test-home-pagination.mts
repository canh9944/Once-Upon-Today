import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {startTestBackend} from './test-backend.mjs';
import {categories} from '../shared/categories';
import {uiCopy} from '../lib/ui-i18n';
import {storyTeaser} from '../shared/story-teaser';
assert.equal(storyTeaser({excerpt:'Opening',content:'Opening continues with the story.',contentFormat:'text'}),'Opening continues with the story.');
assert.equal(storyTeaser({excerpt:'Intro',content:'<p>More &amp; &#x1F600; details.</p><script>hidden()</script>',contentFormat:'html'}),'Intro More & 😀 details.');
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'once-pagination-')),origin='http://localhost:3112';
const posts=Array.from({length:27},(_,i)=>({id:`pagination-${i+1}`,title:`Pagination Story ${i+1} with a long headline that remains fully readable on every card${' including additional story context'.repeat(i%3)}`,excerpt:'A story for pagination testing. '.repeat(12),content:'Reading content for this story.',contentFormat:'text',country:'US',language:'en',category:categories[i<20?0:1],image:'',author:'Test Author',published:true,date:'2026-11-15'}));
await fs.writeFile(path.join(dir,'store.json'),JSON.stringify({posts}));
const backend=await startTestBackend({dir,origin,env:{SESSION_SECRET:'pagination-test-only-'.repeat(3)}});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3112'],{env:backend.env,stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,output);
 const found:string[]=[];let offset:number|null=0;
 while(offset!==null){const response=await fetch(`${origin}/api/search?offset=${offset}`);assert.equal(response.status,200);const data=await response.json();assert.ok(data.posts.length<=6);assert.ok(data.posts.every((post:object)=>!('content' in post)&&!('excerpt' in post)));found.push(...data.posts.map((post:{id:string})=>post.id));offset=data.nextOffset;}
 assert.equal(found.length,27);assert.equal(new Set(found).size,27);
 assert.equal((await (await fetch(origin+'/api/search?q=Story%2023')).json()).posts.length,1);
 assert.equal((await (await fetch(origin+'/api/search?language=vi')).json()).posts.length,0);
 assert.equal((await (await fetch(origin+'/api/search?offset=100')).json()).nextOffset,null);
 assert.equal((await (await fetch(origin+'/api/search?limit=30')).json()).posts.length,27);
 for(const query of ['offset=-1','offset=1.5','limit=31','limit=0'])assert.equal((await fetch(origin+'/api/search?'+query)).status,400);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [width,size] of [[1440,12],[390,6]]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));await context.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({body:''}));
  let failed=false;const requestedOffsets:number[]=[];
  await page.route('**/api/search?**',async route=>{const url=new URL(route.request().url());if(url.searchParams.has('offset')){requestedOffsets.push(Number(url.searchParams.get('offset')));if(!failed&&url.searchParams.get('offset')==='6'){failed=true;return route.fulfill({status:503,json:{code:'requestError'}});}}return route.continue();});
  await page.goto(origin+'/en');const searchInput=page.locator('.header-search input'),suggestions=page.locator('.search-suggestion'),scrollList=page.locator('.search-suggestions-list');await searchInput.click();await expect(suggestions).toHaveCount(6);
  await scrollList.evaluate(node=>{node.scrollTop=node.scrollHeight;});await expect(page.locator('.search-suggestions [role="alert"]')).toBeVisible();await expect(suggestions).toHaveCount(6);await page.locator('.search-suggestions [role="alert"] button').click();await expect(suggestions).toHaveCount(12);
  while(await suggestions.count()<27){const count=await suggestions.count();await scrollList.evaluate(node=>{node.scrollTop=node.scrollHeight;});await expect.poll(()=>suggestions.count()).toBeGreaterThan(count);}
  await expect(suggestions).toHaveCount(27);const suggestionLinks=await suggestions.evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href')));assert.equal(new Set(suggestionLinks).size,27);assert.equal(requestedOffsets.at(-1),24);
  await searchInput.fill('Story 23');await expect(suggestions).toHaveCount(1);await expect(suggestions.first().locator('strong')).toContainText('Story 23');assert.equal(await scrollList.evaluate(node=>node.scrollTop),0);await page.keyboard.press('Escape');assert.equal(page.url(),origin+'/en');
  const ui=uiCopy('en'),titles=page.locator('.card-grid .title-button'),pagination=page.getByRole('navigation',{name:ui.pagination}),next=pagination.getByRole('link',{name:ui.nextPage,exact:true}),previous=pagination.getByRole('link',{name:ui.previousPage,exact:true});
  await page.goto(origin+'/en?q=Pagination');await expect(titles).toHaveCount(size);await expect(previous).toHaveAttribute('aria-disabled','true');
  const recommended=await page.locator('.featured-layout .title-button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));assert.equal(recommended.length,4);for(const card of await page.locator('.feature-copy,.recommendation-copy,.card-grid>.post-card').all()){const title=card.locator('.title-button');await expect(title).toHaveText((await title.getAttribute('aria-label'))!);const excerpt=card.locator('.story-excerpt');assert.ok((await excerpt.textContent())!.length>120);assert.ok(await excerpt.evaluate(node=>node.getBoundingClientRect().height>=parseFloat(getComputedStyle(node).lineHeight)*2));await expect(card.locator('.read-link')).toHaveText('Read the story');}
  await page.evaluate(()=>document.fonts.ready);
  const featureBox=await page.locator('.featured').boundingBox(),layoutBox=await page.locator('.featured-layout').boundingBox(),recommendationBox=await page.locator('.featured-recommendations').boundingBox();if(width>=1024){assert.ok(recommendationBox!.x>=featureBox!.x+featureBox!.width);assert.ok(featureBox!.width<layoutBox!.width);}else assert.ok(recommendationBox!.y>=featureBox!.y+featureBox!.height);assert.ok(await page.locator('.feature-copy>.story-excerpt').evaluate(node=>{const title=node.previousElementSibling!.getBoundingClientRect();return node.getBoundingClientRect().top-title.bottom<=14&&Number(getComputedStyle(node.querySelector('.story-excerpt-text')!).webkitLineClamp)>=4;}));
  for(const card of await page.locator('.card-grid>.post-card').all()){const gap=await card.evaluate(node=>node.querySelector('.story-excerpt')!.getBoundingClientRect().top-node.querySelector('.title-button')!.getBoundingClientRect().bottom);assert.ok(gap<=14,'Preview must start immediately below its title');}

  if(width>=768)await expect.poll(async()=>page.locator('.card-grid .story-excerpt-text').evaluateAll(nodes=>nodes.some(node=>Number(getComputedStyle(node).webkitLineClamp)>4))).toBe(true);
  for(const excerpt of await page.locator('.story-excerpt').all())assert.ok(await excerpt.evaluate(node=>{const text=node.querySelector('.story-excerpt-text')!,line=parseFloat(getComputedStyle(text).lineHeight),height=text.getBoundingClientRect().height;return height<=node.getBoundingClientRect().height&&Math.abs(height/line-Math.round(height/line))<.05;}),'Every visible preview must end on a complete line');
  const rows=await page.locator('.card-grid>.post-card').evaluateAll(cards=>cards.map(card=>{const box=card.getBoundingClientRect();return {top:Math.round(box.top),height:box.height,read:card.querySelector('.read-link')!.getBoundingClientRect().top};}));for(const row of rows){const same=rows.filter(item=>item.top===row.top);assert.ok(same.every(item=>Math.abs(item.height-row.height)<2));assert.ok(same.every(item=>Math.abs(item.read-row.read)<2));}
  await page.screenshot({path:'artifacts/full-titles-'+width+'.png'});
  const firstTitles=await titles.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));await next.click();await expect(page).toHaveURL(origin+'/en?q=Pagination&page=2#story-feed');await expect(titles).toHaveCount(Math.min(size,23-size));
  assert.ok((await titles.evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')))).every(title=>!firstTitles.includes(title)),'Pages must not repeat stories');
  assert.deepEqual(await page.locator('.featured-layout .title-button').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),recommended);
  await page.reload();await expect(titles).toHaveCount(Math.min(size,23-size));await expect(pagination.locator('[aria-current="page"]')).toHaveText('2');
  await page.locator('.card-grid .title-button').first().click();await expect(page.locator('.article-page')).toBeVisible();await expect(page.locator('.related-copy h3').first()).toBeVisible();assert.ok(await page.locator('.related-copy h3').first().evaluate(node=>getComputedStyle(node).webkitLineClamp==='none'));await expect(page.locator('.related-copy .read-link').first()).toHaveText('Read the story');assert.equal(new URL(page.url()).searchParams.get('page'),'2');await page.locator('.article-back').click();await expect(titles).toHaveCount(Math.min(size,23-size));assert.equal(new URL(page.url()).searchParams.get('page'),'2');
  await pagination.getByRole('link',{name:ui.page+' '+Math.ceil(23/size),exact:true}).click();await expect(titles).toHaveCount(23%size);await expect(next).toHaveAttribute('aria-disabled','true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Pagination must fit mobile');
  await page.goto(origin+'/en?page=999');await expect(titles).toHaveCount(23%size);
  await page.goto(origin+'/en?q=Pagination&page=2');await page.locator('.header-genre button').click();await page.locator('.searchable-select-popover [role="option"]').nth(1).click();await expect.poll(()=>new URL(page.url()).searchParams.has('page')).toBe(false);await expect(titles).toHaveCount(size);assert.equal(new URL(page.url()).searchParams.get('q'),'Pagination');
  await page.goto(origin+'/en?q=Story%2023');await expect(titles).toHaveCount(0);await expect(page.locator('.featured-layout .title-button')).toHaveCount(1);await expect(pagination).toHaveCount(0);
  await page.goto(origin+'/en?q=missing-story');await expect(page.locator('.empty')).toBeVisible();await expect(pagination).toHaveCount(0);
  await context.close();
 }
 console.log('PASS: search API pagination, desktop/mobile infinite scroll through 27 results, deduplication, error retry, query reset; 12 desktop / 6 mobile feed stories excluding four fixed recommendations, full titles, adaptive previews filling spare space, equal-height cards, featured text without clipping and right-side related stories and read links, disjoint pages, last-page counts, URL/reload/back restoration, filter reset, invalid pages, empty/single-page state and mobile layout.');
}finally{
 await browser?.close();server.kill();await new Promise<void>(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',()=>resolve());});await backend.stop();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('once-pagination-'));await fs.rm(dir,{recursive:true,force:true});
}
