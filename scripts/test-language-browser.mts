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
    await expect(options).toHaveCount(languages.length+1);await expect(options.nth(1)).toHaveText('English');await expect(options.nth(2)).toHaveText('Vietnamese');
    assert.ok(!(await options.allTextContents()).some(label=>label.includes('United Kingdom')||label.includes('France')));
    await options.nth(1).click();await expect(page).toHaveURL(origin+'/en?lang=en');
    const english=all.filter(p=>matchesLanguage(p.language,'en'));
    if(english.length)await expect(page.locator('.title-button')).toHaveCount(Math.min(english.length,4)+Math.min(Math.max(0,english.length-4),viewport.width<768?6:12));else await expect(page.locator('.empty')).toBeVisible();
    const api=await page.request.get(origin+'/api/posts?language=nl');assert.equal(api.status(),200);assert.ok((await api.json()).posts.every((p:Post)=>matchesLanguage(p.language,'nl')));
    await page.goto(origin+'/nl?lang=nl');await expect(page).toHaveURL(origin+'/en?lang=nl');await expect(page.locator('html')).toHaveAttribute('lang','en');
    if(all.length){
      const post=all[0],path=`/${post.language==='vi'?'vi':'en'}/posts/${encodeURIComponent(post.id)}`;
      await page.goto(origin+path+'?lang=en&q=family');
      const title=await page.locator('.article-page h1').textContent();
      await page.locator('.header-language button').click();
      await options.filter({hasText:/^Vietnamese$/}).click();
      await expect(page).toHaveURL(origin+path+'?lang=vi&q=family');
      await expect(page.locator('html')).toHaveAttribute('lang','vi');
      await expect(page.locator('.article-page h1')).toHaveText(title!);
      await page.reload();await expect(page.locator('.article-page h1')).toHaveText(title!);
      await page.locator('.header-language button').click();await options.first().click();
      await expect(page).toHaveURL(origin+path+'?lang=all&q=family');
      await expect(page.locator('html')).toHaveAttribute('lang','en');
      await expect(page.locator('.article-page h1')).toHaveText(title!);
    }
    await page.goto(origin+'/vi');await page.locator('.header-language button').click();await expect(options.first()).toHaveText('Tất cả ngôn ngữ');
    await options.first().click();await expect(page).toHaveURL(origin+'/en');await expect(page.locator('.title-button')).toHaveCount(Math.min(all.length,4)+Math.min(Math.max(0,all.length-4),viewport.width<768?6:12));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: desktop/mobile All languages, unique language labels, language filtering including nl-BE, article/related/back state, i18n and no blur redirects.');
}finally{await browser.close();}
