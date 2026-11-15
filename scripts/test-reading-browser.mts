import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {uiCopy} from '../lib/ui-i18n';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const posts=(await (await fetch(`${origin}/api/posts`)).json()).posts;
assert.ok(posts.length>3,'Need at least four published posts for carousel navigation');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const viewport of [{width:1440,height:1000},{width:375,height:812}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'});
    await context.route('https://www.googletagmanager.com/**',route=>route.fulfill({body:''}));
    await context.route('https://pagead2.googlesyndication.com/**',route=>route.fulfill({body:''}));
    await context.route('**/api/auth',route=>route.fulfill({json:{authenticated:false,user:null,googleEnabled:false}}));
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${origin}/en`);
    await page.locator('.feature-copy .title-button').click();
    const articleUrl=page.url(),currentId=decodeURIComponent(new URL(articleUrl).pathname.split('/').at(-1)!);
    const related=page.locator('.related-stories'),track=page.locator('.related-track');
    await expect(related).toBeVisible({timeout:20_000});
    await expect(page.locator('.related-card')).toHaveCount(Math.min(posts.length-1,8));
    const links=await page.locator('.related-card-link').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')!));
    assert.ok(links.every(href=>!new URL(href,origin).pathname.endsWith(`/${currentId}`)));
    assert.equal(new Set(links).size,links.length);
    await related.scrollIntoViewIfNeeded();
    await expect.poll(()=>page.locator('.site-header').evaluate(node=>Math.round(node.getBoundingClientRect().top))).toBe(0);
    assert.equal(await page.locator('.site-header').evaluate(node=>getComputedStyle(node).position),'sticky');
    const previous=page.getByRole('button',{name:uiCopy('en').previousStories,exact:true}),next=page.getByRole('button',{name:uiCopy('en').nextStories,exact:true});
    await expect(previous).toBeDisabled();await expect(next).toBeEnabled();
    await next.click();await expect.poll(()=>track.evaluate(node=>-new DOMMatrix(getComputedStyle(node).transform).m41)).toBeGreaterThan(30);
    await previous.click();await expect.poll(()=>track.evaluate(node=>-new DOMMatrix(getComputedStyle(node).transform).m41)).toBeLessThan(3);
    await page.locator('.related-card-link').last().evaluate(node=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',code:'Tab',bubbles:true}));(node as HTMLElement).focus();});
    await expect.poll(()=>track.evaluate(node=>-new DOMMatrix(getComputedStyle(node).transform).m41)).toBeGreaterThan(30);
    await expect(next).toBeDisabled();
    const target=page.locator('.related-card-link').last(),href=await target.getAttribute('href'),title=await target.locator('h3').innerText();
    await target.click();await expect(page).toHaveURL(origin+href);
    await expect(page.locator('.article-page h1')).toHaveText(title);
    await expect(page.locator('.related-stories')).toBeVisible({timeout:20_000});
    await page.locator('.related-stories').scrollIntoViewIfNeeded();
    await page.locator('.header-search input').click();
    await expect(page.locator('.search-suggestions')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.header-country button').click();await expect(page.locator('.searchable-select-popover [role="listbox"]')).toBeVisible();await page.keyboard.press('Escape');
    await page.locator('.auth-login-trigger').click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No page overflow from carousel/sticky header');
    assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: desktop/mobile related cards, exclusions, arrow and keyboard scrolling, end states, click-through, sticky header, search/country dropdowns and auth modal.');
}finally{await browser.close();}
