import {isLocale,locales,type Locale} from './domain';
import labels from './language-labels.json';

// Public language options follow the supported interface locales.
export const languages=locales;
export type Language=typeof languages[number];
export type LanguageSelection=Language|'all';
export function languageGroup(locale:string){return locale==='sr-Latn'?'sr':locale.split('-')[0];}
export function languageMembers(locale:string){const base=languageGroup(locale);return base==='fr'?['fr','fr-BE']:base==='de'?['de','de-BE']:base==='nl'?['nl','nl-BE']:base==='sr'?['sr','sr-Latn']:[base];}
export function matchesLanguage(actual:string,selected?:string){return !selected||selected==='all'||languageGroup(actual)===languageGroup(selected);}
export function isLanguageSelection(value:string):value is LanguageSelection{return value==='all'||languages.some(l=>l===value);}
export function normalizeLanguage(value:string):LanguageSelection|undefined{const base=languageGroup(value);return isLocale(value)&&isLanguageSelection(base)?base:undefined;}
export function languageLabel(language:Language,locale:Locale){return labels[locale][language];}
