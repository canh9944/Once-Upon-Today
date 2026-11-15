import assert from 'node:assert/strict';
import {articleAdBreak,plainArticleAdBreak,articleAdsEligible} from '../shared/ad-placements';

const paragraph='<p>'+('A complete paragraph about family and everyday life. '.repeat(32))+'</p>';
const html='<h2>A story</h2>'+paragraph.repeat(4);
const split=articleAdBreak(html);assert.ok(split);assert.ok(html.slice(0,split).endsWith('</p>'));assert.equal(html.slice(0,split)+html.slice(split),html);
assert.equal(articleAdBreak('<p>A short story.</p>'),undefined);
assert.equal(articleAdBreak('<blockquote>'+paragraph.repeat(4)+'</blockquote>'),undefined,'Never insert an ad inside a quote');
assert.equal(articleAdBreak('<ul><li>'+paragraph.repeat(4)+'</li></ul>'),undefined,'Never split a list');
assert.equal(articleAdBreak('<pre>'+('Code '.repeat(1200))+'</pre>'),undefined);
assert.equal(articleAdBreak('<div>'+paragraph.repeat(4)),undefined,'Malformed fragments must keep their original rendering');
const paragraphs=Array.from({length:6},()=> 'A long story paragraph. '.repeat(50));
const plainSplit=plainArticleAdBreak(paragraphs);assert.ok(plainSplit!==undefined&&plainSplit>0&&plainSplit<paragraphs.length-1);
assert.equal(plainArticleAdBreak(['Short story']),undefined);
console.log('PASS: one mid-article ad at a complete paragraph, unchanged content, no split in quotes/lists/code, and no inline ads on short articles.');

assert.equal(articleAdsEligible("<p>Short</p>"),false);
assert.equal(articleAdsEligible('<img src="'+'x'.repeat(2000)+'">'),false);
assert.equal(articleAdsEligible("<p>"+"A".repeat(1600)+"</p>"),true);
