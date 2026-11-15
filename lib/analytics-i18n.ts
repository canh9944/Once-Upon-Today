import copies from './translations/analytics.json';
import type {Locale} from './i18n';
export function analyticsCopy(locale:Locale){const base=locale==='fr-BE'?'fr':locale==='de-BE'?'de':locale==='nl-BE'?'nl':locale;return copies[base];}
