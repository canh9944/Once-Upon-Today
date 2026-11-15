import {publicPosts} from '@/lib/backend';
import {formatDate,type Locale} from '@/lib/i18n';
import type {Post} from '@/shared/data';
import {relatedStories} from '@/shared/related-stories';
import RelatedCarousel from './related-carousel';

export default async function RelatedStories({post,locale}:{post:Post;locale:Locale}){
  try{
    const posts=relatedStories(post,await publicPosts());
    return <RelatedCarousel key={post.id} posts={posts.map(p=>({...p,displayDate:formatDate(p.date,locale)}))}/>;
  }catch{
    // Recommendations are optional; an unavailable list must not prevent reading the article.
    return null;
  }
}
