import {additionalLocales} from './additional-locales';
export const locales=['en','vi','fr','de','es','it','pt','nl','pl','fr-BE','nl-BE','de-BE','da','sv',...additionalLocales] as const;
export type Locale=typeof locales[number];
export const brand='Once Upon Today';
export function isLocale(value:unknown):value is Locale{return typeof value==='string'&&locales.includes(value as Locale);}
export type PublicUser={id:string;email:string;name:string;role:'admin'|'reader';provider:'credentials'|'google'};
