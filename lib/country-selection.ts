import type {Locale} from './i18n';
import {normalizeCountry,isCountryCode} from '../shared/countries';

// Multilingual countries use one default edition in the combined public selector.
export const countryLocales:Record<string,Locale>={
  VN:'vi',JP:'ja',KR:'ko',TH:'th','US-UK':'en',US:'en','GB-ENG':'en',GB:'en',IE:'en',MT:'mt',FR:'fr',MC:'fr',DE:'de',AT:'de',LI:'de',CH:'de',LU:'lb',
  ES:'es',AD:'ca',IT:'it',SM:'it',VA:'it',PT:'pt',NL:'nl',PL:'pl',BE:'fr-BE',DK:'da',SE:'sv',FI:'fi',
  NO:'nb',IS:'is',GR:'el',CY:'el',CZ:'cs',SK:'sk',RO:'ro',MD:'ro',HU:'hu',UA:'uk',BG:'bg',HR:'hr',SI:'sl',EE:'et',LV:'lv',LT:'lt',
  AL:'sq',BA:'bs',BY:'be',ME:'sr-Latn',MK:'mk',RS:'sr',RU:'ru',TR:'tr',
};
const defaultCountries:Record<Locale,string>={en:'all',vi:'VN',fr:'FR',de:'DE',es:'ES',it:'IT',pt:'PT',nl:'NL',pl:'PL','fr-BE':'BE','nl-BE':'BE','de-BE':'BE',da:'DK',sv:'SE',ja:'JP',ko:'KR',th:'TH',nb:'NO',fi:'FI',is:'IS',el:'GR',cs:'CZ',sk:'SK',ro:'RO',hu:'HU',uk:'UA',bg:'BG',hr:'HR',sl:'SI',et:'EE',lv:'LV',lt:'LT',lb:'LU',mt:'MT',sq:'AL',ca:'AD',bs:'BA',be:'BY','sr-Latn':'ME',mk:'MK',sr:'RS',ru:'RU',tr:'TR'};
export function resolveCountry(locale:Locale,value:string|null|undefined){
  if(value===undefined||value===null)return defaultCountries[locale];
  return value==='all'||isCountryCode(value)?normalizeCountry(value):'all';
}
export function countryLocale(country:string):Locale{return country==='all'?'en':countryLocales[country]||'en';}
export function browseHref(country:string,filters:{genre?:string;query?:string}={}){
  country=normalizeCountry(country);
  const params=new URLSearchParams();if(country!=='all')params.set('country',country);
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${countryLocale(country)}${params.size?'?'+params.toString():''}`;
}
export function articleHref(post:{id:string;language:Locale},country:string,filters:{genre?:string;query?:string}={}){
  country=normalizeCountry(country);
  const params=new URLSearchParams({country});
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${post.language}/posts/${encodeURIComponent(post.id)}?${params.toString()}`;
}
