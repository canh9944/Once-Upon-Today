import type {Post} from '@/lib/data';
import {sanitizeContent} from '@/lib/sanitize-content';
export default function PostContent({post}:{post:Post}){
  return post.contentFormat==='html'?<div className="rich-content" dangerouslySetInnerHTML={{__html:sanitizeContent(post.content)}}/>:<>{post.content.split(/\n+/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</>;
}
