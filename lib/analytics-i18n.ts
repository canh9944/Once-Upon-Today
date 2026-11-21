import copies from './translations/analytics.json';
import type {Locale} from './i18n';
export function analyticsCopy(locale:Locale){
  return copies[locale];
}
