import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {languages,matchesLanguage} from '../shared/languages';
import type {Post} from '../shared/data';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const all:Post[]=(await (await fetch(origin+'/api/posts')).json()).posts;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));await context.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({body:''}));
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/en');await expect(page.locator('.header-language button')).toContainText('All languages');
    await page.locator('.header-language button').click();
    const options=page.locator('.searchable-select-popover [role="option"]');
    await expect(options).toHaveCount(languages.length+1);await expect(options.nth(1)).toHaveText('English');await expect(options.nth(2)).toHaveText('Spanish');
    assert.ok(!(await options.allTextContents()).some(label=>label.includes('United Kingdom')||label.includes('France')));
    await options.nth(1).click();await expect(page).toHaveURL(origin+'/en?lang=en');
    const english=all.filter(p=>matchesLanguage(p.language,'en'));
    if(english.length)await expect(page.locator('.title-button')).toHaveCount(english.length);else await expect(page.locator('.empty')).toBeVisible();
    const api=await page.request.get(origin+'/api/posts?language=nl');assert.equal(api.status(),200);assert.ok((await api.json()).posts.every((p:Post)=>matchesLanguage(p.language,'nl')));
    await page.goto(origin+'/nl?lang=nl');await expect(page.locator('html')).toHaveAttribute('lang','nl');await expect(page.locator('.header-language button')).toContainText('Nederlands');
    const dutch=all.filter(p=>matchesLanguage(p.language,'nl'));
    if(dutch.length){
      await expect(page.locator('.title-button')).toHaveCount(dutch.length);await page.locator('.feature-copy .title-button').click();await expect(page.locator('.article-page')).toBeVisible();
      await expect(page).toHaveURL(/lang=nl/);await expect(page.locator('.header-language button')).toContainText(/Nederlands/);
      const articleUrl=page.url();await page.locator('.header-search input').click();await page.locator('.article-page h1').click();assert.equal(page.url(),articleUrl);
      await page.locator('.related-stories').waitFor();const relatedHref=await page.locator('.related-card-link').first().getAttribute('href');assert.ok(relatedHref?.includes('lang=nl'));
    }
    await page.goto(origin+'/vi');await page.locator('.header-language button').click();await expect(options.first()).toHaveText('Tất cả ngôn ngữ');
    await options.first().click();await expect(page).toHaveURL(origin+'/en');await expect(page.locator('.title-button')).toHaveCount(all.length);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: desktop/mobile All languages, unique language labels, language filtering including nl-BE, article/related/back state, i18n and no blur redirects.');
}finally{await browser.close();}
