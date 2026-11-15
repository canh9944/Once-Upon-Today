'use client';
import Link from 'next/link';
import {useCallback,useEffect,useId,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import {articleHref} from '@/lib/country-selection';
import {categoryName} from '@/lib/i18n';
import {uiCopy} from '@/lib/ui-i18n';
import type {RelatedStory} from '@/shared/related-stories';
import {useSite} from './site-context';
import StoryImage from './story-image';

export default function RelatedCarousel({posts}:{posts:(RelatedStory&{displayDate:string})[]}){
  const {country,locale}=useSite(),ui=uiCopy(locale),id=useId(),track=useRef<HTMLDivElement>(null);
  const [edges,setEdges]=useState({start:true,end:true});
  const update=useCallback(()=>{const node=track.current;if(node)setEdges({start:node.scrollLeft<=3,end:node.scrollLeft+node.clientWidth>=node.scrollWidth-3});},[]);
  useEffect(()=>{
    const node=track.current;if(!node)return;
    update();const observer=new ResizeObserver(update);observer.observe(node);
    return ()=>observer.disconnect();
  },[posts,update]);
  function move(direction:number){
    const node=track.current;if(!node)return;
    const card=node.firstElementChild as HTMLElement|null;
    const step=card?card.getBoundingClientRect().width+parseFloat(getComputedStyle(node).columnGap||'0'):node.clientWidth;
    node.scrollBy({left:direction*step,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  if(!posts.length)return null;
  return <section className="related-stories" aria-labelledby={`${id}-title`} aria-roledescription={ui.carouselLabel}>
    <div className="related-heading"><div><h2 id={`${id}-title`}>{ui.relatedStories}</h2><p>{ui.relatedHint}</p></div><div className="related-controls"><button type="button" aria-label={ui.previousStories} aria-controls={`${id}-track`} disabled={edges.start} onClick={()=>move(-1)}><ArrowLeft size={18}/></button><button type="button" aria-label={ui.nextStories} aria-controls={`${id}-track`} disabled={edges.end} onClick={()=>move(1)}><ArrowRight size={18}/></button></div></div>
    <div ref={track} id={`${id}-track`} className="related-track" role="list" onScroll={update}>
      {posts.map(post=><article key={post.id} className="related-card" role="listitem" lang={post.language}>
        <Link href={articleHref(post,country)} className="related-card-link"><div className="related-image"><StoryImage src={post.image} alt=""/><span><ArrowUpRight size={18}/></span></div><div className="related-copy"><span className="eyebrow" lang={locale}>{categoryName(post.category,locale)}</span><h3>{post.title}</h3><p>{post.excerpt}</p><div className="card-meta"><span>{post.author}</span><time dateTime={post.date} lang={locale}>{post.displayDate}</time></div></div></Link>
      </article>)}
    </div>
  </section>;
}
