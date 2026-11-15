import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const enabled=process.env.TEST_ADSENSE_ENABLED==='true';
const publisher=process.env.NEXT_PUBLIC_ADSENSE_CLIENT||'ca-pub-7681125837419532';
for(const agent of ['Mediapartners-Google','Google-Display-Ads-Bot']){
  const response=await fetch(origin+'/en',{headers:{'User-Agent':agent}});
  assert.equal(response.status,200);
  assert.ok((await response.text()).includes(`<meta name="google-adsense-account" content="${publisher}"`));
}
const ads=await fetch(origin+'/ads.txt');assert.equal(ads.status,200);
assert.match(ads.headers.get('content-type'),/^text\/plain/);
assert.ok((await ads.text()).includes(publisher.replace('ca-','')));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const path of ['/en/privacy-policy','/en/terms-of-service','/en/user-data-deletion','/en?q=zzzz-no-stories-zzzz','/en/admin','/en/does-not-exist',...(enabled?[]:['/en'])]){
    const context=await browser.newContext();let loads=0;
    await context.route('https://pagead2.googlesyndication.com/**',route=>{loads++;return route.fulfill({body:''});});
    await context.route('https://www.googletagmanager.com/**',route=>route.fulfill({body:''}));
    const page=await context.newPage();await page.goto(origin+path);await page.waitForTimeout(500);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
    assert.equal(loads,0,`${path}: excluded pages must not load AdSense on fresh visits`);
    await context.close();
  }
  console.log('PASS: verification metadata and ads.txt retained; excluded pages and disabled serving do not request Google ads (requests mocked).');
}finally{await browser.close();}
