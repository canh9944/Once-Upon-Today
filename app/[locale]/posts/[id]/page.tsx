import {cache,Suspense} from 'react';
import {notFound} from 'next/navigation';
import {publicPost} from '@/lib/backend';
import {isLocale,formatDate} from '@/lib/i18n';
import {resolveLanguage,languageLocale} from '@/lib/language-selection';
import Article from '@/components/article';
import PostContent from '@/components/post-content';
import RelatedStories from '@/components/related-stories';

export const dynamic='force-dynamic';
type Params=Promise<{locale:string;id:string}>;
const getPost=cache(async(locale:string,id:string)=>{
  if(!isLocale(locale))notFound();
  const post=await publicPost(id);
  if(!post||post.language!==locale)notFound();return post;
});
export async function generateMetadata({params}:{params:Params}){
  const {locale,id}=await params;const post=await getPost(locale,id);
  return {title:post.title,description:post.excerpt,openGraph:{title:post.title,description:post.excerpt,type:'article',publishedTime:post.date,authors:[post.author],...(post.image?{images:[post.image]}:{})}};
}
export default async function Page({params,searchParams}:{params:Params;searchParams:Promise<{country?:string|string[];lang?:string|string[]}>}){
  const {locale,id}=await params;const post=await getPost(locale,id);if(!isLocale(locale))notFound();
  const query=await searchParams;const uiLocale=languageLocale(locale,resolveLanguage(locale,Array.isArray(query.lang)?query.lang[0]:query.lang,Array.isArray(query.country)?query.country[0]:query.country));
  return <Article post={post} displayDate={formatDate(post.date,uiLocale)} body={<PostContent post={post}/>} related={<Suspense fallback={null}><RelatedStories post={post} locale={uiLocale}/></Suspense>}/>;
}
