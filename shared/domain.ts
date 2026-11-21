import {additionalLocales} from './additional-locales';
export const contentLanguages=['en','vi','fr','de','es','it','pt','nl','pl','fr-BE','nl-BE','de-BE','da','sv',...additionalLocales] as const;
export type ContentLanguage=typeof contentLanguages[number];
export function isContentLanguage(value:unknown):value is ContentLanguage{return typeof value==='string'&&contentLanguages.includes(value as ContentLanguage);}
export const locales=['en','vi'] as const;
export type Locale=typeof locales[number];
export const brand='Once Upon Today';
export function isLocale(value:unknown):value is Locale{return typeof value==='string'&&locales.includes(value as Locale);}
export function contentLocale(language:string):Locale{return isLocale(language)?language:'en';}
export type PublicUser={id:string;email:string|null;username?:string|null;name:string;role:'admin'|'reader';provider:'credentials'|'google'|'facebook'|'apple'};
