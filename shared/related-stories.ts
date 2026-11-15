import type {Post} from './data';
import {categories,categoryValue} from './categories';
import {matchesCountry} from './countries';
import {normalizeSearch} from './search';

export type RelatedStory=Pick<Post,'id'|'title'|'excerpt'|'image'|'author'|'category'|'language'|'date'>;
const words=(post:Post)=>new Set(normalizeSearch(`${post.title} ${post.excerpt}`).split(/[^\p{L}\p{N}]+/u).filter(word=>word.length>3));
export function relatedStories(current:Post,posts:Post[],limit=8):RelatedStory[]{
  const currentWords=words(current),category=categoryValue(current.category),seen=new Set([current.id]);
  const ranked=posts.filter(post=>{if(!post.published||seen.has(post.id))return false;seen.add(post.id);return true;}).map(post=>{
    const overlap=[...words(post)].filter(word=>currentWords.has(word)).length;
    const sameCategory=categories.some(c=>c===category)&&categoryValue(post.category)===category;
    return {post,score:(sameCategory?100:0)+Math.min(overlap,5)*2+(post.language===current.language?4:0)+(matchesCountry(post.country,current.country)?2:0)};
  }).sort((a,b)=>b.score-a.score||b.post.date.localeCompare(a.post.date)||a.post.id.localeCompare(b.post.id));
  return ranked.slice(0,Math.max(0,limit)).map(({post:{id,title,excerpt,image,author,category,language,date}})=>({id,title,excerpt,image,author,category,language,date}));
}
