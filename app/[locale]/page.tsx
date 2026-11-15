import {matchesLanguage} from '@/shared/languages';
import {notFound} from 'next/navigation';
import {publicPosts} from '@/lib/backend';
import {isLocale,formatDate} from '@/lib/i18n';
import {resolveLanguage,languageLocale} from '@/lib/language-selection';
import Home from '@/components/home';
export const dynamic='force-dynamic';
export default async function Page({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{country?:string|string[];lang?:string|string[]}>}){
  const {locale}=await params;if(!isLocale(locale))notFound();
  const query=await searchParams;
  const language=resolveLanguage(locale,Array.isArray(query.lang)?query.lang[0]:query.lang,Array.isArray(query.country)?query.country[0]:query.country),uiLocale=languageLocale(locale,language);
  const posts=await publicPosts(undefined,language);
  return <Home key={language} posts={posts.filter(p=>p.published&&matchesLanguage(p.language,language)).map(p=>({...p,displayDate:formatDate(p.date,uiLocale)}))}/>;
}
