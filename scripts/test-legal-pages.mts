import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {locales} from '../shared/domain';
import {legalCopy,policies} from '../lib/legal';
import {legalLabels} from '../lib/legal-labels';

for(const locale of locales){
 const copy=legalCopy(locale);assert.ok(legalLabels(locale).privacy);
 for(const policy of policies){const page=copy.pages[policy];assert.ok(page.title&&page.intro);assert.equal(page.sections.length,legalCopy('en').pages[policy].sections.length);for(const section of page.sections)assert.ok(section.title.trim()&&section.body.trim());}
}
const origin=process.env.TEST_ORIGIN||'http://localhost:3000',browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:1000}}),page=await context.newPage();
  await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));await context.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({body:''}));
  for(const locale of ['en','vi'] as const)for(const policy of policies){
   const response=await page.goto(`${origin}/${locale}/${policy}`);assert.equal(response!.status(),200);
   await expect(page.locator('.legal-page h1')).toHaveText(legalCopy(locale).pages[policy].title);
   await expect(page).toHaveTitle(new RegExp(legalCopy(locale).pages[policy].title));
   await expect(page.locator('.footer-legal a')).toHaveCount(3);
   for(const slug of policies)await expect(page.locator(`.footer-legal a[href="/${locale}/${slug}"]`)).toBeVisible();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.goto(`${origin}/en/privacy-policy`);await page.locator('.header-language button').click();await page.locator('.searchable-select-popover [role="option"]').filter({hasText:/^Vietnamese$/}).click();
  await expect(page).toHaveURL(`${origin}/vi/privacy-policy?lang=vi`);await expect(page.locator('.legal-page h1')).toHaveText(legalCopy('vi').privacy);
  await context.close();
 }
 const page=await browser.newPage();let authenticated=true,deletions=0;
 await page.route('**/api/auth**',async route=>{
  if(route.request().method()==='GET')return route.fulfill({json:{user:authenticated?{id:'reader',email:'reader@example.com',name:'Reader',role:'reader',provider:'facebook'}:null}});
  assert.equal(new URL(route.request().url()).pathname,'/api/auth/account');assert.equal(route.request().method(),'DELETE');assert.deepEqual(route.request().postDataJSON(),{confirm:true});deletions++;authenticated=false;return route.fulfill({json:{ok:true}});
 });
 await page.goto(`${origin}/en/user-data-deletion`);await page.evaluate(()=>{localStorage.setItem('atlas-saved','["test"]');localStorage.setItem('atlas-liked','["test"]');localStorage.setItem('atlas-visitor','test');});
 const copy=legalCopy('en');await page.getByRole('button',{name:copy.deleteButton,exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();assert.equal(deletions,0);await page.getByRole('button',{name:copy.cancel,exact:true}).click();assert.equal(deletions,0);
 await page.getByRole('button',{name:copy.deleteButton,exact:true}).click();await page.getByRole('button',{name:copy.confirm,exact:true}).click();await expect(page.getByRole('status')).toHaveText(copy.deleted);assert.equal(deletions,1);
 assert.ok(await page.evaluate(()=>['atlas-saved','atlas-liked','atlas-visitor'].every(key=>localStorage.getItem(key)===null)));
 await page.close();
 console.log('PASS: 43 policy locales, three public pages/metadata/footer links, desktop/mobile layout, language switching and confirmed deletion UI with browser-data cleanup.');
}finally{await browser.close();}
