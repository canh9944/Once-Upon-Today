import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});let scriptLoads=0;
    await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));
    await context.route('https://pagead2.googlesyndication.com/**',route=>{
      scriptLoads++;
      return route.fulfill({contentType:'application/javascript',body:`
        window.__adRequests=0;const pending=Array.isArray(window.adsbygoogle)?window.adsbygoogle:[];
        window.adsbygoogle={push:function(){const ins=document.querySelector('ins.adsbygoogle[data-site-ad="true"]:not([data-adsbygoogle-status])');if(!ins)throw new Error('Duplicate ad request');ins.setAttribute('data-adsbygoogle-status','done');ins.setAttribute('data-ad-status','filled');ins.style.height='250px';window.__adRequests++;}};
        pending.forEach(function(){window.adsbygoogle.push({});});
      `});
    });
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/en');
    await expect(page.locator('[data-ad-placement="home-feature"]')).toHaveCount(1);
    await expect(page.locator('[data-ad-placement="home-feed"]')).toHaveCount(1);
    await expect(page.locator('ins.adsbygoogle')).toHaveCount(2);
    for(const ins of await page.locator('ins.adsbygoogle').all()){
      await expect(ins).toHaveAttribute('data-ad-client','ca-pub-7681125837419532');await expect(ins).toHaveAttribute('data-ad-slot','9654708635');
      await expect(ins).toHaveAttribute('data-ad-format','auto');await expect(ins).toHaveAttribute('data-full-width-responsive','true');await expect(ins).toHaveAttribute('data-adsbygoogle-status','done');
    }
    const homeRequests=await page.evaluate(()=>(window as unknown as {__adRequests:number}).__adRequests);assert.equal(homeRequests,2);
    await page.locator('.feature-copy .title-button').click();await expect(page.locator('.article-page')).toBeVisible();
    await expect(page.locator('[data-ad-placement="article-end"]')).toHaveCount(1);
    await expect(page.locator('[data-ad-placement="article-inline"]')).toHaveCount(1);
    await expect.poll(()=>page.locator('ins.adsbygoogle[data-adsbygoogle-status="done"]').count()).toBe(2);
    assert.equal(await page.evaluate(()=>(window as unknown as {__adRequests:number}).__adRequests),4);
    assert.equal(scriptLoads,1,'Global loader must not be duplicated per placement or route');
    await page.setViewportSize({width:viewport.width-10,height:viewport.height});await page.waitForTimeout(150);
    assert.equal(await page.evaluate(()=>(window as unknown as {__adRequests:number}).__adRequests),4,'Resize must not request filled ads again');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.goto(origin+'/en?q=zzzz-no-stories-zzzz');await expect(page.locator('.empty')).toBeVisible();await expect(page.locator('ins.adsbygoogle')).toHaveCount(0);
    assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: responsive home and article placements, correct client/slot attributes, one initialization per unit, one global loader, no ads on empty results, no overflow. Google ads mocked.');
}finally{await browser.close();}
