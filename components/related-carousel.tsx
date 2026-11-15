'use client';
import Link from 'next/link';
import {useId} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {languageArticleHref as articleHref} from '@/lib/language-selection';
import {categoryName} from '@/lib/i18n';
import {uiCopy} from '@/lib/ui-i18n';
import type {RelatedStory} from '@/shared/related-stories';
import {useSite} from './site-context';
import StoryImage from './story-image';
import {Carousel,CarouselContent,CarouselItem,CarouselPrevious,CarouselNext} from './ui/carousel';
import {Card,CardContent} from './ui/card';

export default function RelatedCarousel({posts}:{posts:(RelatedStory&{displayDate:string})[]}){
  const {language,locale}=useSite(),ui=uiCopy(locale),id=useId();
  if(!posts.length)return null;
  return <section className="related-stories" aria-labelledby={`${id}-title`}>
    <div className="related-heading"><div><h2 id={`${id}-title`}>{ui.relatedStories}</h2><p>{ui.relatedHint}</p></div></div>
    <Carousel className="related-carousel" opts={{align:'start',loop:false,breakpoints:{'(prefers-reduced-motion: reduce)':{duration:0}}}} aria-label={ui.relatedStories} aria-roledescription={ui.carouselLabel}>
      <div className="related-controls"><CarouselPrevious type="button" aria-label={ui.previousStories} aria-controls={`${id}-track`} className="static translate-x-0 translate-y-0"/><CarouselNext type="button" aria-label={ui.nextStories} aria-controls={`${id}-track`} className="static translate-x-0 translate-y-0"/></div>
      <CarouselContent id={`${id}-track`} className="related-track" role="list">
        {posts.map(post=><CarouselItem key={post.id} className="related-slide" role="listitem" aria-roledescription={undefined} lang={post.language}>
          <Card className="related-card"><Link href={articleHref(post,language)} className="related-card-link"><div className="related-image"><StoryImage src={post.image} alt=""/><span><ArrowUpRight size={18}/></span></div><CardContent className="related-copy"><span className="eyebrow" lang={locale}>{categoryName(post.category,locale)}</span><h3>{post.title}</h3><p>{post.excerpt}</p><div className="card-meta"><span>{post.author}</span><time dateTime={post.date} lang={locale}>{post.displayDate}</time></div></CardContent></Link></Card>
        </CarouselItem>)}
      </CarouselContent>
    </Carousel>
  </section>;
}
