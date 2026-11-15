import type {Locale} from './i18n';
import copies from './translations/ui.json';
export function uiCopy(locale:Locale){
  const base=locale==='fr-BE'?'fr':locale==='nl-BE'?'nl':locale==='de-BE'?'de':locale;
  return copies[base];
}
