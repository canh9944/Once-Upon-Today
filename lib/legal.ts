import copies from './translations/legal.json';
import type {Locale} from '@/shared/domain';

export const policies=['privacy-policy','terms-of-service','user-data-deletion'] as const;
export type Policy=typeof policies[number];
export type LegalCopy=typeof copies.en;
export function legalCopy(locale:Locale):LegalCopy{
 const base=locale==='fr-BE'?'fr':locale==='de-BE'?'de':locale==='nl-BE'?'nl':locale;
 return (copies as Record<string,LegalCopy>)[base]||copies.en;
}
