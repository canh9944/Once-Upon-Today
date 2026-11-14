import {countries} from './data';
import type {Locale} from './i18n';

// Multilingual countries use one default edition in the combined public selector.
const countryLocales:Partial<Record<string,Locale>>={
  VN:'vi',GB:'en',IE:'en',MT:'en',FR:'fr',MC:'fr',DE:'de',AT:'de',LI:'de',CH:'de',LU:'fr',
  ES:'es',AD:'es',IT:'it',SM:'it',VA:'it',PT:'pt',NL:'nl',PL:'pl',BE:'fr-BE',DK:'da',SE:'sv',FI:'sv',
};
const defaultCountries:Record<Locale,string>={en:'all',vi:'VN',fr:'FR',de:'DE',es:'ES',it:'IT',pt:'PT',nl:'NL',pl:'PL','fr-BE':'BE','nl-BE':'BE','de-BE':'BE',da:'DK',sv:'SE'};
export function resolveCountry(locale:Locale,value:string|null|undefined){
  if(value===undefined||value===null)return defaultCountries[locale];
  return value==='all'||countries.some(c=>c.code===value)?value:'all';
}
export function countryLocale(country:string):Locale{return country==='all'?'en':countryLocales[country]||'en';}
export function browseHref(country:string,filters:{genre?:string;query?:string}={}){
  const params=new URLSearchParams();if(country!=='all')params.set('country',country);
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${countryLocale(country)}${params.size?'?'+params.toString():''}`;
}
export function articleHref(post:{id:string;language:Locale},country:string,filters:{genre?:string;query?:string}={}){
  const params=new URLSearchParams({country});
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${post.language}/posts/${encodeURIComponent(post.id)}?${params.toString()}`;
}
