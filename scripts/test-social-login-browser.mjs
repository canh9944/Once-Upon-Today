import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const locale of ['en','vi']){
  const page=await browser.newPage({viewport:{width:390,height:844}}),calls=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/api/auth**',async route=>{const request=route.request(),path=new URL(request.url()).pathname;if(path==='/api/auth'&&request.method()==='GET')return route.fulfill({json:{user:null,googleEnabled:true,facebookEnabled:true,appleEnabled:true}});if(request.method()==='POST'){calls.push({provider:path.split('/').at(-1),body:request.postDataJSON()});return route.fulfill({status:503,json:{code:'oauthFailed'}});}return route.continue();});
  await page.goto(`${origin}/${locale}?category=all`);await page.locator('.auth-login-trigger').click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  for(const provider of ['Google','Facebook','Apple']){const button=dialog.getByRole('button',{name:new RegExp(provider)});await expect(button).toBeEnabled();await button.click();await expect(dialog.getByRole('alert')).toBeVisible();assert.equal(calls.at(-1).provider,provider.toLowerCase());assert.equal(calls.at(-1).body.locale,locale);assert.equal(calls.at(-1).body.returnTo,`/${locale}?category=all`);assert.equal(new URL(page.url()).pathname,`/${locale}`);}
  assert.ok(await dialog.evaluate(el=>el.getBoundingClientRect().width<=window.innerWidth));assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: mobile English/Vietnamese social buttons, provider-specific requests, current-page return URLs and localized error display.');
}finally{await browser.close();}
