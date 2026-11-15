import assert from 'node:assert/strict';
import {chromium,expect} from '@playwright/test';
import {countries} from '../shared/data';
import {categories} from '../shared/categories';
import {countryLocale,browseHref} from '../lib/country-selection';
import {dictionary,categoryName,countryName} from '../lib/i18n';
import {authCopy} from '../lib/auth-i18n';
import {uiCopy} from '../lib/ui-i18n';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors:string[]=[];let next=0,checked=0;
try{
  async function worker(){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    // Test local dialogs without opening production authentication.
    await context.route('https://www.googletagmanager.com/**',route=>route.fulfill({body:''}));
    await context.route('https://pagead2.googlesyndication.com/**',route=>route.fulfill({body:''}));
    await context.route('**/api/auth',route=>route.fulfill({json:{authenticated:false,user:null,googleEnabled:false}}));
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    while(next<countries.length){
      const country=countries[next++],locale=countryLocale(country.code),t=dictionary(locale),ui=uiCopy(locale),auth=authCopy(locale);
      const response=await page.goto(origin+browseHref(country.code));assert.equal(response?.status(),200,`${country.code} page failed`);
      await expect(page.locator('html')).toHaveAttribute('lang',locale);
      await expect(page.locator('.section-heading h1')).toContainText(t.stories);
      await expect(page.locator('.header-country button')).toContainText(countryName(country.code,locale));
      await page.locator('.header-genre button').click();
      await expect(page.locator('.searchable-select-popover [role="option"]')).toHaveCount(9);
      assert.deepEqual(await page.locator('.searchable-select-popover [role="option"]>span').allTextContents(),[`${t.category}: ${t.all}`,...categories.map(c=>categoryName(c,locale))]);
      await page.keyboard.press('Escape');
      await page.locator('.header-search input').click();
      await expect(page.locator('.search-suggestions-heading')).toHaveText(ui.popularStories);
      await page.locator('.header-search input').fill('zzzz-no-match-zzzz');
      await expect(page.locator('.search-suggestions-heading')).toHaveText(ui.searchResults);
      await expect(page.locator('.search-suggestions-status')).toHaveText(ui.searchEmpty,{timeout:20_000});
      await page.keyboard.press('Escape');
      await page.locator('.auth-login-trigger').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('tab',{name:auth.signup,exact:true})).toBeVisible();
      await expect(page.getByRole('dialog').getByLabel(ui.email,{exact:true})).toBeVisible();
      await page.keyboard.press('Escape');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${country.code}: horizontal overflow`);
      checked++;
    }
    await context.close();
  }
  await Promise.all([worker(),worker()]);
  for(const code of ['JP','KR','TH','GR','UA','TR','ME']){
    const locale=countryLocale(code),page=await browser.newPage({viewport:{width:375,height:812}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+browseHref(code));
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await page.locator('.header-genre button').click();
    await expect(page.locator('.searchable-select-popover [role="option"]')).toHaveCount(9);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${code}: mobile overflow`);
    await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log(`PASS: ${checked} country pages, localized HTML/header/category/search/auth dialogs; 7 mobile language layouts, no overflow or browser errors.`);
}finally{await browser.close();}
