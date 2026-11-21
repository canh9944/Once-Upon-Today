import copies from './translations/legal.json';
import type {Locale} from '@/shared/domain';

export const policies=['privacy-policy','terms-of-service','user-data-deletion'] as const;
export type Policy=typeof policies[number];
export type LegalCopy=typeof copies.en;
export function legalCopy(locale:Locale):LegalCopy{
  return copies[locale];
}
