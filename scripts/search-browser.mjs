import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {startTestBackend} from './test-backend.mjs';
import Database from 'better-sqlite3';

const dir=await mkdtemp(path.join(tmpdir(),'once-search-'));
const origin='http://localhost:3102';
let browser,server,backend;
try{
  backend=await startTestBackend({dir,origin});
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','-p','3102'],{env:backend.env,stdio:['ignore','pipe','pipe']});
  let output='';
  server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
  let ready=false;
  for(let i=0;i<90;i++){
    try{if((await fetch(origin+'/en')).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(ready,output);
  const db=new Database(backend.env.DATABASE_PATH);
  const popular=db.prepare('SELECT id,title FROM posts WHERE published=1 ORDER BY date ASC LIMIT 1').get();
  for(let i=0;i<10;i++)db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(`search-view-${i}`,`search-visitor-${i}`,'view',popular.id,new Date().toISOString());
  db.prepare("INSERT INTO posts(id,title,excerpt,content,contentFormat,country,language,category,image,author,date,published) SELECT 'search-private-draft','Private search draft',excerpt,content,contentFormat,country,language,category,image,author,date,0 FROM posts LIMIT 1").run();
  db.close();
  const popularResponse=await (await fetch(origin+'/api/search')).json();
  assert.equal(popularResponse.posts[0].id,popular.id,'Popular suggestions must use actual views');
  assert.ok(popularResponse.posts.length<=6);
  assert.ok(!popularResponse.posts.some(p=>p.id==='search-private-draft'));
  assert.ok(!('content' in popularResponse.posts[0]),'Suggestions must not download full articles');
  const privateResponse=await (await fetch(origin+'/api/search?q=Private%20search%20draft')).json();
  assert.deepEqual(privateResponse.posts,[]);
  const unaccented=await (await fetch(origin+'/api/search?q=di%20cham')).json();
  assert.ok(unaccented.posts.some(p=>p.id==='kyoto'),'Vietnamese search must accept unaccented words');
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
    const context=await browser.newContext({viewport});
    await context.route('https://images.unsplash.com/**',route=>route.abort());
    const page=await context.newPage();
    await page.goto(origin+'/en');
    await page.locator('.feature-copy .title-button').click();
    await expect(page.locator('.article-page')).toBeVisible();
    const articleUrl=page.url(),search=page.locator('.header-search input');
    const navigations=[];
    page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});
    await search.click();
    await expect(page.locator('.search-suggestion').first()).toContainText(popular.title);
    await search.fill('Kyoto');
    await expect(page.locator('.search-suggestion')).toHaveCount(2);
    await expect(page.locator('.search-suggestion').first()).toContainText('Kyoto');
    await search.fill('zzzz-no-match-zzzz');
    await expect(page.locator('.search-suggestions-status')).toHaveText('No matching stories found.');
    await search.fill('Kyoto');
    await expect(page.locator('.search-suggestion')).toHaveCount(2);
    await search.press('Escape');await expect(page.locator('.search-suggestions')).toHaveCount(0);
    await search.click();await page.locator('.article-page h1').click();
    await expect(page.locator('.search-suggestions')).toHaveCount(0);
    await search.fill('draft search');await page.locator('.article-page h1').click();
    await search.fill('');await search.press('Enter');
    await page.locator('.header-search button').click();
    for(const selector of ['.header-country','.header-genre']){
      await page.locator(`${selector} button`).click();
      await page.locator(`${selector} input`).fill('');
      await page.locator('.article-page h1').click();
      await expect(page.locator(`${selector} [role="listbox"]`)).toHaveCount(0);
      await page.locator(`${selector} button`).click();
      await page.locator(`${selector} [role="option"][aria-selected="true"]`).click();
    }
    await page.waitForTimeout(500);
    assert.equal(page.url(),articleUrl);
    assert.deepEqual(navigations,[],'Focus, blur, empty submit and unchanged selections must not navigate');
    await search.fill('Kyoto');await search.press('Enter');
    await expect(page).toHaveURL(origin+'/en?q=Kyoto');
    await page.locator('.header-search input').fill('');
    await page.locator('.header-search input').press('Enter');
    await expect(page).toHaveURL(origin+'/en');
    await page.locator('.header-search input').click();
    await expect(page.locator('.search-suggestion').first()).toBeVisible();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Search suggestions must fit viewport');
    const suggestionHref=await page.locator('.search-suggestion').first().getAttribute('href');
    await page.locator('.search-suggestion').first().click();
    await expect(page).toHaveURL(origin+suggestionHref);
    await page.locator('.header-search input').fill('Kyoto');
    await expect(page.locator('.search-suggestion')).toHaveCount(2);
    const keyboardHref=await page.locator('.search-suggestion').first().getAttribute('href');
    await page.locator('.header-search input').press('ArrowDown');
    await expect(page.locator('.header-search input')).toHaveAttribute('aria-activedescendant',/.+/);
    await page.locator('.header-search input').press('Enter');
    await expect(page).toHaveURL(origin+keyboardHref);
    await context.close();
  }
  console.log('PASS: actual popularity ranking, published-only lightweight suggestions, unaccented Vietnamese search; desktop/mobile dropdown, live filtering, empty state, Escape, click/keyboard selection, no blur redirects, explicit search and clearing home search.');
}finally{
  await browser?.close();
  if(server){
    if(process.platform==='win32'){
      const stop=spawn('taskkill',['/pid',String(server.pid),'/t','/f'],{stdio:'ignore'});
      await new Promise(resolve=>stop.once('exit',resolve));
    }else server.kill();
    await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});
  }
  await backend?.stop();
  assert.equal(path.dirname(path.resolve(dir)),path.resolve(tmpdir()));
  assert.ok(path.basename(dir).startsWith('once-search-'));
  await rm(dir,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}
