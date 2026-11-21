import type {Locale} from './i18n';
import {contentLocale} from '../shared/domain';
import {normalizeCountry,isCountryCode} from '../shared/countries';

const defaultCountries:Record<Locale,string>={en:'all',vi:'VN'};
export function resolveCountry(locale:Locale,value:string|null|undefined){
  if(value===undefined||value===null)return defaultCountries[locale];
  return value==='all'||isCountryCode(value)?normalizeCountry(value):'all';
}
export function countryLocale(country:string):Locale{return normalizeCountry(country)==='VN'?'vi':'en';}
export function browseHref(country:string,filters:{genre?:string;query?:string}={}){
  country=normalizeCountry(country);
  const params=new URLSearchParams();if(country!=='all')params.set('country',country);
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${countryLocale(country)}${params.size?'?'+params.toString():''}`;
}
export function articleHref(post:{id:string;language:string},country:string,filters:{genre?:string;query?:string}={}){
  country=normalizeCountry(country);
  const params=new URLSearchParams({country});
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${contentLocale(post.language)}/posts/${encodeURIComponent(post.id)}?${params.toString()}`;
}
