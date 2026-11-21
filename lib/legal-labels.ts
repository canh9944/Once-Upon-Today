import labels from './translations/legal-labels.json';
import type {Locale} from '@/shared/domain';
export function legalLabels(locale:Locale){
  return labels[locale];
}
