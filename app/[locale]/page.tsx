import {notFound} from 'next/navigation';
import {publicPosts} from '@/lib/backend';
import {isLocale,formatDate} from '@/lib/i18n';
import {countryLocale,resolveCountry} from '@/lib/country-selection';
import Home from '@/components/home';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{country?:string|string[]}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const query=await searchParams;
  const country=resolveCountry(locale,Array.isArray(query.country)?query.country[0]:query.country),uiLocale=countryLocale(country);
  const posts=await publicPosts(country);
  return <Home key={country} posts={posts.filter(p=>p.published&&(country==='all'||p.country===country)).map(p=>({...p,displayDate:formatDate(p.date,uiLocale)}))}/>;
}
