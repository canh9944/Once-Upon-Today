import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium,expect} from '@playwright/test';

const origin=process.env.TEST_ORIGIN||'http://localhost:3000';
const health=await (await fetch(`${origin}/api/health`)).json();
assert.equal(health.database,null,'API preview must not use a database');
assert.ok(health.contentSource);
const source=health.contentSource;
const [remote,local]=await Promise.all([fetch(`${source}/api/posts`).then(r=>r.json()),fetch(`${origin}/api/posts`).then(r=>r.json())]);
assert.deepEqual(local.posts.map(p=>p.id).sort(),remote.posts.map(p=>p.id).sort());
for(const post of local.posts){
  assert.ok(post.published);
  if(post.image)assert.ok(post.image.startsWith('https://'));
  assert.ok(!/(?:src=["'])\/api\/uploads\//.test(post.content),'Inline images must use the remote origin');
}
assert.equal((await fetch(`${origin}/api/posts`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
assert.equal((await fetch(`${origin}/api/stats`)).status,403);
assert.equal((await (await fetch(`${origin}/api/auth`)).json()).remoteOrigin,source);
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${origin}/en`);
  await expect(page.locator('.post-card')).toHaveCount(local.posts.length-1);
  const cover=page.locator('.feature-image img');
  await expect(cover).toHaveAttribute('src',new RegExp(`^${source.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/`));
  await expect.poll(()=>cover.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.locator('.header-search input').click();
  await expect(page.locator('.search-suggestion').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('.feature-copy .title-button').click();
  await expect(page.locator('.article-page')).toBeVisible();
  await expect.poll(()=>page.locator('.reader-cover').evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
for(const file of ['data/app.sqlite','data/app.sqlite-wal','data/app.sqlite-shm','backend/data/app.sqlite','data/remote'])assert.ok(!fs.existsSync(file),`${file} must not be recreated`);
console.log(`PASS: ${local.posts.length} live API posts, remote cover/inline images, search and article pages; no local database or remote writes.`);
