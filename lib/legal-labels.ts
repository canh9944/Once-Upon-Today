import labels from './translations/legal-labels.json';
import type {Locale} from '@/shared/domain';
export function legalLabels(locale:Locale){
 const base=locale==='fr-BE'?'fr':locale==='de-BE'?'de':locale==='nl-BE'?'nl':locale;
 return (labels as Record<string,typeof labels.en>)[base]||labels.en;
}
