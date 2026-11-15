import assert from 'node:assert/strict';
import {countries} from '../shared/data';
import {categories} from '../shared/categories';
import {dictionary,categoryName,countryName,languageNames,locales,isLocale,formatDate} from '../lib/i18n';
import {authCopy} from '../lib/auth-i18n';
import {editorCopy} from '../lib/editor-i18n';
import {uiCopy} from '../lib/ui-i18n';
import {countryLocale,countryLocales,resolveCountry,browseHref} from '../lib/country-selection';

const keys=(object:object)=>Object.keys(object).sort();
const reference={main:keys(dictionary('en')),auth:keys(authCopy('en')),editor:keys(editorCopy('en')),ui:keys(uiCopy('en'))};
for(const locale of locales){
  assert.ok(isLocale(locale));assert.ok(languageNames[locale]);
  const sections={main:dictionary(locale),auth:authCopy(locale),editor:editorCopy(locale),ui:uiCopy(locale)};
  assert.notEqual(sections.main.login.toLowerCase(),sections.auth.signup.toLowerCase(),`${locale}: sign-in and sign-up need distinct labels`);
  for(const [name,copy] of Object.entries(sections)){
    assert.deepEqual(keys(copy),reference[name as keyof typeof reference],`${locale}: incomplete ${name} keys`);
    for(const [key,value] of Object.entries(copy)){
      assert.ok(typeof value==='string'&&value.trim(),`${locale}.${name}.${key} is empty`);
      assert.ok(!/\uFFFD|__[^_]+__/.test(value),`${locale}.${name}.${key} contains broken encoding/placeholders`);
    }
  }
  if(locale!=='en'){
    assert.notEqual(sections.main.country,dictionary('en').country,`${locale} uses English UI`);
    assert.notEqual(sections.auth.signup,authCopy('en').signup,`${locale} uses English auth`);
    assert.notEqual(sections.editor.upload,editorCopy('en').upload,`${locale} uses English editor`);
    assert.notEqual(sections.ui.popularStories,uiCopy('en').popularStories,`${locale} uses English search`);
  }
  for(const category of categories)assert.ok(categoryName(category,locale));
  assert.ok(formatDate('2026-11-15',locale));
  for(const country of countries){const name=countryName(country.code,locale);assert.ok(name&&(name!==country.code||country.code==='US-UK'),`${locale}: missing country label ${country.code}`);}
}
for(const country of countries){
  assert.ok(countryLocales[country.code],`Missing language mapping for ${country.code}`);
  const locale=countryLocale(country.code),href=browseHref(country.code);
  assert.ok(href.startsWith(`/${locale}?`));
  assert.equal(resolveCountry(locale,country.code),country.code);
}
for(const [country,locale] of Object.entries({JP:'ja',KR:'ko',TH:'th',NO:'nb',FI:'fi',GR:'el',CZ:'cs',UA:'uk',LU:'lb',MT:'mt',AD:'ca',ME:'sr-Latn',RU:'ru',TR:'tr'}))assert.equal(countryLocale(country),locale);
console.log(`PASS: ${countries.length} country mappings, ${locales.length} complete locale dictionaries, auth/editor/search/category labels, localized country names and date formatting.`);
