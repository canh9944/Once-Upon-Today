'use client';
import Link from 'next/link';
import {useEffect,type ReactNode} from 'react';
import {ArrowLeft,Bookmark,Heart} from 'lucide-react';
import type {Post} from '@/lib/data';
import {brand,categoryName} from '@/lib/i18n';
import {useSite,track} from './site-context';
import {SiteHeader,SiteFooter} from './site-shell';
import Ads from './ads';
import {articleAdsEligible} from '@/shared/ad-placements';
import StoryImage from './story-image';
import {Button} from './ui/button';

export default function Article({post,displayDate,body,related}:{post:Post;displayDate:string;body:ReactNode;related?:ReactNode}){
  const {locale,t,preferences,saved,toggleSaved,liked,like,listHref}=useSite();
  useEffect(()=>{track('view',post.id);},[post.id]);
  return <><SiteHeader/><main className="article-container"><Link className="article-back" href={listHref}><ArrowLeft size={16}/>{t.back}</Link><article className="reader article-page" lang={post.language}>
    <StoryImage className="reader-cover" src={post.image} alt={post.title} priority/><div className="reader-body" style={{fontSize:preferences.size,fontFamily:preferences.font==='serif'?'Georgia, serif':preferences.font==='mono'?'monospace':'Arial, sans-serif'}}>
      <div className="eyebrow">{categoryName(post.category,locale)} · {brand}</div><h1>{post.title}</h1><div className="card-meta">{post.author} · <time dateTime={post.date}>{displayDate}</time></div><p className="reader-lead">{post.excerpt}</p>{body}<div className="reader-actions"><Button type="button" className="primary" disabled={liked.includes(post.id)} onClick={()=>like(post.id)}><Heart size={17}/>{liked.includes(post.id)?t.liked:t.like}</Button><Button type="button" variant="outline" aria-pressed={saved.includes(post.id)} onClick={()=>toggleSaved(post.id)}><Bookmark size={17} fill={saved.includes(post.id)?'currentColor':'none'}/>{saved.includes(post.id)?t.savedDone:t.save}</Button></div>
    </div></article>{articleAdsEligible(post.content)&&<Ads key={post.id} placement="article-end"/>}{related}</main><SiteFooter/></>;
}
