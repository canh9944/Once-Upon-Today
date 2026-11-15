import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const publisher='ca-pub-7681125837419532';
for(const agent of ['Mediapartners-Google','Google-Display-Ads-Bot']){
  for(const path of ['/','/en','/vi']){
    const response=await fetch(origin+path,{headers:{'User-Agent':agent}});
    assert.equal(response.status,200,`${agent} cannot reach ${path}`);
    const html=await response.text(),head=html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1]||'';
    const scripts=head.match(/<script\b[^>]*\bsrc=["'][^"']*adsbygoogle\.js[^"']*["'][^>]*>/gi)||[];
    assert.equal(scripts.length,1,`${path}: AdSense must be an actual script in the initial head, not only a preload`);
    assert.ok(scripts[0].includes(`client=${publisher}`));
    assert.match(scripts[0],/\basync(?:\s|=|>)/);
    assert.match(scripts[0],/crossorigin="anonymous"/);
    assert.ok(head.includes(`<meta name="google-adsense-account" content="${publisher}"`));
  }
}
const ads=await fetch(origin+'/ads.txt');assert.equal(ads.status,200);
assert.match(ads.headers.get('content-type'),/^text\/plain/);
assert.equal((await ads.text()).trim(),'google.com, pub-7681125837419532, DIRECT, f08c47fec0942fa0');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const context=await browser.newContext();let loads=0;
  await context.route('https://pagead2.googlesyndication.com/**',route=>{loads++;return route.fulfill({body:''});});
  await context.route('https://www.googletagmanager.com/**',route=>route.fulfill({body:''}));
  const page=await context.newPage();await page.goto(origin+'/en');
  await expect(page.locator('head script#google-adsense')).toHaveCount(1);
  await page.locator('.feature-copy .title-button').click();await expect(page.locator('.article-page')).toBeVisible();
  await expect(page.locator('head script#google-adsense')).toHaveCount(1);assert.equal(loads,1);
  console.log('PASS: crawler-visible initial HTML script/meta, correct publisher, ads.txt and a single script load across navigation. Google requests mocked.');
}finally{await browser.close();}
