import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {startTestBackend} from './test-backend.mjs';
import {categories} from '../shared/categories';
import {uiCopy} from '../lib/ui-i18n';

const dir=await fs.mkdtemp(path.join(os.tmpdir(),'once-pagination-')),origin='http://localhost:3112';
const posts=Array.from({length:23},(_,i)=>({id:`pagination-${i+1}`,title:`Pagination Story ${i+1}`,excerpt:'A story for pagination testing.',content:'Reading content for this story.',contentFormat:'text',country:'US',language:'en',category:categories[i<20?0:1],image:'',author:'Test Author',published:true,date:'2026-11-15'}));
await fs.writeFile(path.join(dir,'store.json'),JSON.stringify({posts}));
const backend=await startTestBackend({dir,origin,env:{SESSION_SECRET:'pagination-test-only-'.repeat(3)}});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3112'],{env:backend.env,stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert.ok(ready,output);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const [width,size] of [[1440,10],[390,5]]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));await context.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({body:''}));
  const ui=uiCopy('en'),titles=page.locator('.story-list .title-button'),pagination=page.getByRole('navigation',{name:ui.pagination}),next=pagination.getByRole('link',{name:ui.nextPage,exact:true}),previous=pagination.getByRole('link',{name:ui.previousPage,exact:true});
  await page.goto(origin+'/en?q=Pagination');await expect(titles).toHaveCount(size);await expect(previous).toHaveAttribute('aria-disabled','true');
  const firstTitles=await titles.allTextContents();await next.click();await expect(page).toHaveURL(origin+'/en?q=Pagination&page=2#stories');await expect(titles).toHaveCount(size);
  assert.ok((await titles.allTextContents()).every(title=>!firstTitles.includes(title)),'Pages must not repeat stories');
  await page.reload();await expect(titles).toHaveCount(size);await expect(pagination.locator('[aria-current="page"]')).toHaveText('2');
  await page.locator('.feature-copy .title-button').click();await expect(page.locator('.article-page')).toBeVisible();assert.equal(new URL(page.url()).searchParams.get('page'),'2');await page.locator('.article-back').click();await expect(titles).toHaveCount(size);assert.equal(new URL(page.url()).searchParams.get('page'),'2');
  await pagination.getByRole('link',{name:ui.page+' '+Math.ceil(23/size),exact:true}).click();await expect(titles).toHaveCount(3);await expect(next).toHaveAttribute('aria-disabled','true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Pagination must fit mobile');
  await page.goto(origin+'/en?page=999');await expect(titles).toHaveCount(3);
  await page.goto(origin+'/en?q=Pagination&page=2');await page.locator('.header-genre button').click();await page.locator('.searchable-select-popover [role="option"]').nth(1).click();await expect.poll(()=>new URL(page.url()).searchParams.has('page')).toBe(false);await expect(titles).toHaveCount(size);assert.equal(new URL(page.url()).searchParams.get('q'),'Pagination');
  await page.goto(origin+'/en?q=Story%2023');await expect(titles).toHaveCount(1);await expect(pagination).toHaveCount(0);
  await page.goto(origin+'/en?q=missing-story');await expect(page.locator('.empty')).toBeVisible();await expect(pagination).toHaveCount(0);
  await context.close();
 }
 console.log('PASS: 10 desktop / 5 mobile stories including featured, disjoint pages, last-page counts, URL/reload/back restoration, filter reset, invalid pages, empty/single-page state and mobile layout.');
}finally{
 await browser?.close();server.kill();await new Promise<void>(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',()=>resolve());});await backend.stop();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('once-pagination-'));await fs.rm(dir,{recursive:true,force:true});
}
