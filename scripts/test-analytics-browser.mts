import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {chromium,expect} from '@playwright/test';
import {startTestBackend} from './test-backend.mjs';
import {categories} from '../shared/categories';
import {analyticsCopy} from '../lib/analytics-i18n';

const dir=await fs.mkdtemp(path.join(os.tmpdir(),'once-analytics-browser-')),origin='http://localhost:3116',a=analyticsCopy('en');
const posts=Array.from({length:6},(_,i)=>({id:`story-${i+1}`,title:`Story ${i+1}`,excerpt:'A family story.',content:'A family story. '.repeat(100),country:'NL',language:'en',category:categories[i%2],image:'',author:'Author',date:'2026-11-15',published:true}));await fs.writeFile(path.join(dir,'store.json'),JSON.stringify({posts}));
const backend=await startTestBackend({dir,origin,env:{SESSION_SECRET:'analytics-browser-secret-'.repeat(3),ADMIN_EMAIL:'admin@example.com',ADMIN_PASSWORD:'analytics-password',GOOGLE_CLIENT_ID:'test-client',GOOGLE_CLIENT_SECRET:'test-secret'}}),preload=pathToFileURL(path.resolve('scripts/mock-adsense.mjs')).href;
const server=spawn(process.execPath,['--import',preload,'node_modules/next/dist/bin/next','start','-p','3116'],{env:{...backend.env,MOCK_ADSENSE:'true'},stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 let ready=false;for(let i=0;i<60;i++){try{if((await fetch(origin+'/api/health')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}assert.ok(ready,output);
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000},extraHTTPHeaders:{'cf-ipcountry':'US'}}),page=await context.newPage(),errors:string[]=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));await context.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({body:'window.adsbygoogle=window.adsbygoogle||[];'}));
  const login=await context.request.post(origin+'/api/auth',{headers:{Origin:origin},data:{email:'admin@example.com',password:'analytics-password'}});assert.equal(login.status(),200);
  await page.goto(origin+'/en/admin');const panel=page.locator('.analytics-section');await expect(panel.getByRole('heading',{name:a.analytics})).toBeVisible();await panel.getByRole('tab',{name:a.fanpages,exact:true}).first().click();await panel.getByRole('button',{name:a.newPage,exact:true}).first().click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel(a.name,{exact:true}).fill('Family Page');await dialog.getByLabel(a.slug,{exact:true}).fill('family-page');await dialog.getByLabel(a.channel,{exact:true}).fill('111');await dialog.getByRole('button',{name:a.save,exact:true}).click();await expect(dialog).not.toBeVisible();
  await panel.locator('.analytics-link-builder [role="combobox"]').click();await page.getByRole('option',{name:'Family Page',exact:true}).click();await expect(panel.getByRole('textbox',{name:a.builder,exact:true})).toHaveValue(/fb_page=family-page/);
  await page.goto(origin+'/en?utm_source=facebook&utm_medium=social&fb_page=family-page&utm_campaign=test');await expect(page.locator('ins.adsbygoogle').first()).toHaveAttribute('data-ad-channel','111');await expect.poll(()=>backend.row("SELECT COUNT(*) count FROM traffic_views WHERE fanpage='family-page'").count).toBeGreaterThan(0);await page.locator('.feature-copy .title-button').click();await expect(page.locator('.article-page')).toBeVisible();await expect.poll(()=>backend.row("SELECT COUNT(*) count FROM traffic_views WHERE fanpage='family-page' AND postId<>'home'").count).toBeGreaterThan(0);
  await page.goto(origin+'/en/admin');await expect(panel).toBeVisible();await panel.getByRole('tab',{name:a.fanpages,exact:true}).first().click();await expect(panel.getByRole('cell',{name:'Family Page',exact:false}).first()).toBeVisible();
  await page.route('https://accounts.google.com/o/oauth2/v2/auth**',async route=>{const url=new URL(route.request().url());assert.equal(url.searchParams.get('scope'),'https://www.googleapis.com/auth/adsense.readonly');await route.fulfill({status:302,headers:{Location:origin+'/api/adsense/callback?code=test-code&state='+url.searchParams.get('state')}});});
  if(await panel.getByRole('button',{name:a.connect,exact:true}).count()){await panel.getByRole('button',{name:a.connect,exact:true}).click();await expect(panel.getByRole('button',{name:a.sync,exact:true})).toBeVisible();}
  await panel.getByRole('button',{name:a.sync,exact:true}).click();await expect(panel.locator('.stat-card').filter({hasText:a.estimated}).locator('strong')).toHaveText('$7.75');const revenue=panel.locator('.analytics-panel').last();await revenue.getByRole('tab',{name:a.fanpages,exact:true}).click();await expect(revenue.getByRole('cell',{name:'$3.00',exact:true})).toBeVisible();assert.ok(!(await page.content()).includes('test-refresh-token-private'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Dashboard must fit mobile');assert.equal(await revenue.evaluate(el=>el.scrollLeft),0,"Revenue panel must not clip its content after tab focus");await page.screenshot({path:`artifacts/admin-analytics-${width}.png`});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS: desktop/mobile dashboard, Fanpage creation and UTM builder, browser attribution across navigation, ad channel before initialization, read-only AdSense connect/sync, measured revenue and private tokens.');
}finally{await browser?.close();server.kill();await new Promise<void>(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',()=>resolve());});await backend.stop();assert.equal(path.dirname(path.resolve(dir)),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('once-analytics-browser-'));await fs.rm(dir,{recursive:true,force:true});}
