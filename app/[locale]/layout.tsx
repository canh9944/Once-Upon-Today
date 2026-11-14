import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
import {brand,countryName,dictionary,isLocale,locales,type Locale} from '@/lib/i18n';
import {countries} from '@/lib/data';
import {SiteProvider} from '@/components/site-context';
export async function generateMetadata({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const uiLocale=(await headers()).get('x-once-locale');
  return {description:dictionary(isLocale(uiLocale)?uiLocale:locale).intro,title:{default:brand,template:`%s | ${brand}`}};
}
export default async function LocaleLayout({children,params}:{children:React.ReactNode;params:Promise<{locale:string}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const countryLabels=Object.fromEntries(locales.map(l=>[l,Object.fromEntries(countries.map(c=>[c.code,countryName(c.code,l)]))])) as Record<Locale,Record<string,string>>;
  return <SiteProvider locale={locale} countryLabels={countryLabels}>{children}</SiteProvider>;
}
