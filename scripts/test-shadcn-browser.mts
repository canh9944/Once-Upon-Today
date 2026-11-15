import {languages} from '../shared/languages';
import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {dictionary} from '../lib/i18n';
import {uiCopy} from '../lib/ui-i18n';
import type {Post} from '../shared/data';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000',t=dictionary('en'),ui=uiCopy('en');
const posts:Post[]=(await (await fetch(`${origin}/api/posts`)).json()).posts;
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    await context.route('https://www.googletagmanager.com/**',r=>r.fulfill({body:''}));
    await context.route('https://pagead2.googlesyndication.com/**',r=>r.fulfill({body:''}));
    await context.route('**/api/auth',route=>route.fulfill({json:{authenticated:false,user:null,googleEnabled:false}}));
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${origin}/en`);
    await page.locator('.feature-copy .title-button').click();await expect(page.locator('.article-page')).toBeVisible();
    const articleUrl=page.url(),input=page.locator('.header-search input');
    await input.click();await expect(page.locator('.search-suggestions')).toBeVisible();
    await page.locator('.article-page h1').click();await expect(page.locator('.search-suggestions')).toHaveCount(0);assert.equal(page.url(),articleUrl);
    await input.fill('');await input.press('Enter');assert.equal(page.url(),articleUrl);
    const target=posts.find(post=>!new URL(articleUrl).pathname.endsWith('/'+post.id))!;
    await input.fill(target.title);await expect(page.locator('.search-suggestion').first()).toBeVisible();
    await input.press('ArrowDown');await input.press('Enter');
    await expect(page.locator('.article-page h1')).toHaveText(target.title);
    await input.fill('');await input.press('Enter');
    await page.getByRole('button',{name:t.reading,exact:true}).click();
    await expect(page.locator('.reading-settings')).toBeVisible();
    await page.getByRole('combobox',{name:t.font,exact:true}).click();
    await page.getByRole('option',{name:ui.mono,exact:true}).click();
    await expect(page.locator('.reader-body')).toHaveCSS('font-family',/monospace/);
    const slider=page.getByRole('slider',{name:t.size,exact:true});
    await slider.focus();await slider.press('ArrowRight');
    await expect(slider).toHaveAttribute('aria-valuenow','19');
    await expect(page.locator('.reader-body')).toHaveCSS('font-size','19px');
    await page.getByRole('button',{name:t.done,exact:true}).click();await expect(page.locator('.reading-settings')).toHaveCount(0);
    await page.locator('.header-country button').click();
    await expect(page.locator('.searchable-select-popover [role="option"]')).toHaveCount(languages.length+1);
    await page.locator('.searchable-select-popover input').fill('English');
    await expect(page.locator('.searchable-select-popover [role="option"]')).toHaveCount(1);
    await page.locator('.searchable-select-popover input').press('Escape');
    assert.ok(page.url().includes('/posts/'),'Dismissing combobox must preserve article');
    await page.goto(`${origin}/vi`);
    await page.locator('.header-genre button').click();
    await page.locator('.searchable-select-popover input').fill('thu cung');
    await expect(page.locator('.searchable-select-popover [role="option"]')).toHaveCount(1);
    await page.locator('.searchable-select-popover input').press('Enter');
    await expect(page).toHaveURL(/genre=Pet\+and\+Animal\+Stories/);
    await expect(page.locator('.header-genre button')).toContainText('Câu chuyện về thú cưng và động vật');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow');
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: shadcn async search/keyboard selection, no blur redirects, country/category Combobox with unaccented search, reading Popover/Select/Slider and responsive layout.');
}finally{await browser.close();}
