import type {Locale} from './i18n';
import copies from './translations/ui.json';
export function uiCopy(locale:Locale){
  return copies[locale];
}
