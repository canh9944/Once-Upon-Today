import type {Locale} from '@/shared/domain';
import {countryLocale,resolveCountry} from './country-selection';
import {languageGroup,normalizeLanguage,type LanguageSelection} from '@/shared/languages';

export function resolveLanguage(locale:Locale,value?:string|null,legacyCountry?:string|null):LanguageSelection{
  if(value==='all')return 'all';
  if(value)return normalizeLanguage(value)||'all';
  if(legacyCountry!==undefined&&legacyCountry!==null)return legacyCountry==='all'?'all':normalizeLanguage(countryLocale(resolveCountry(locale,legacyCountry)))||'all';
  return locale==='en'?'all':normalizeLanguage(locale)||'all';
}
export function languageLocale(routeLocale:Locale,selected:LanguageSelection):Locale{return selected==='all'?'en':languageGroup(routeLocale)===selected?routeLocale:selected;}
export function languageBrowseHref(language:LanguageSelection,filters:{genre?:string;query?:string}={}){
  const params=new URLSearchParams();if(language!=='all')params.set('lang',language);
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${language==='all'?'en':language}${params.size?'?'+params:''}`;
}
export function languageSwitchHref(pathname:string,search:string,language:LanguageSelection){
  const params=new URLSearchParams(search);
  // Article routes identify the original story language; lang controls the site UI.
  if(/^\/[^/]+\/posts\/[^/]+\/?$/.test(pathname)){
    params.set('lang',language);
    return `${pathname}?${params}`;
  }
  if(/^\/[^/]+\/(privacy-policy|terms-of-service|user-data-deletion)\/?$/.test(pathname)){
    params.set('lang',language);
    return `/${language==='all'?'en':language}/${pathname.split('/')[2]}?${params}`;
  }
  return languageBrowseHref(language,{genre:params.get('genre')||undefined,query:params.get('q')||undefined});
}
export function languageArticleHref(post:{id:string;language:Locale},language:LanguageSelection,filters:{genre?:string;query?:string}={}){
  const params=new URLSearchParams({lang:language});
  if(filters.genre&&filters.genre!=='all')params.set('genre',filters.genre);
  if(filters.query?.trim())params.set('q',filters.query.trim());
  return `/${post.language}/posts/${encodeURIComponent(post.id)}?${params}`;
}
