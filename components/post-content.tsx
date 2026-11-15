import type {Post} from '@/lib/data';
import {sanitizeContent} from '@/lib/sanitize-content';
import {articleAdBreak,plainArticleAdBreak} from '@/shared/ad-placements';
import Ads from './ads';
import {Fragment} from 'react';
export default function PostContent({post}:{post:Post}){
  if(post.contentFormat==='html'){
    const html=sanitizeContent(post.content),split=articleAdBreak(html);
    return split===undefined?<div className="rich-content" dangerouslySetInnerHTML={{__html:html}}/>:<><div className="rich-content" dangerouslySetInnerHTML={{__html:html.slice(0,split)}}/><Ads key={post.id} placement="article-inline"/><div className="rich-content" dangerouslySetInnerHTML={{__html:html.slice(split)}}/></>;
  }
  const paragraphs=post.content.split(/\n+/).filter(Boolean),split=plainArticleAdBreak(paragraphs);
  return <>{paragraphs.map((p,i)=><Fragment key={i}><p>{p}</p>{i===split&&<Ads key={post.id} placement="article-inline"/>}</Fragment>)}</>;
}
