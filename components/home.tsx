'use client';
import {matchesLanguage} from '@/shared/languages';
import Link from 'next/link';
import {useEffect} from 'react';
import {useRouter,useSearchParams} from 'next/navigation';
import {ArrowUpRight,ArrowRight,Globe2,Bookmark} from 'lucide-react';
import {type Post} from '@/lib/data';
import {categories,categoryName,categoryValue} from '@/lib/i18n';
import {languageArticleHref as articleHref,languageBrowseHref as browseHref} from '@/lib/language-selection';
import {useSite,track} from './site-context';
import {SiteHeader,SiteFooter} from './site-shell';
import Ads from './ads';
import StoryImage from './story-image';
import {Button} from './ui/button';

// Intl/CLDR versions differ across Node and browsers; hydrate the server's labels exactly.
export default function Home({posts}:{posts:(Post&{displayDate:string})[]}){
  const {locale,t,saved,toggleSaved,language}=useSite(),router=useRouter(),search=useSearchParams();
  const rawCategory=categoryValue(search.get('genre')||'all');
  const category=categories.some(c=>c===rawCategory)?rawCategory:'all',query=search.get('q')||'';
  useEffect(()=>{track('view','home');},[]);
  const filtered=posts.filter(p=>matchesLanguage(p.language,language)&&(category==='all'||categoryValue(p.category)===category)&&`${p.title} ${p.excerpt}`.toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)));
  const reset=()=>{router.push(browseHref(language));};
  const featured=filtered[0];
  return <><SiteHeader/>
    <main className="container story-list"><section id="stories"><div className="section-heading"><h1>{t.stories}<span>{String(filtered.length).padStart(2,'0')}</span></h1></div>
        {featured?<><div className="featured"><Link className="feature-image" href={articleHref(featured,language,{genre:category,query})} aria-label={featured.title}><StoryImage src={featured.image} alt={featured.title} priority/><span className="photo-tag">{t.pick}</span><span className="round-arrow"><ArrowUpRight/></span></Link><div className="feature-copy"><div className="post-kicker"><span>{categoryName(featured.category,locale)}</span><span>•</span><span>{Math.max(1,Math.ceil(featured.content.split(/\s+/).length/200))} {t.minutes}</span></div><Link className="title-button" href={articleHref(featured,language,{genre:category,query})}><h2>{featured.title}</h2></Link><p>{featured.excerpt}</p><div className="author"><span className="avatar">{featured.author[0]}</span><div><strong>{featured.author}</strong><small>{featured.displayDate}</small></div><Button type="button" variant="ghost" size="icon" className="icon-btn ml-auto" aria-label={saved.includes(featured.id)?t.savedDone:t.save} aria-pressed={saved.includes(featured.id)} onClick={()=>toggleSaved(featured.id)}><Bookmark size={20} fill={saved.includes(featured.id)?'currentColor':'none'}/></Button></div><Link className="read-link" href={articleHref(featured,language,{genre:category,query})}>{t.read}<ArrowRight size={17}/></Link></div></div>
          <div className="card-grid">{filtered.slice(1).map(p=><article className="post-card" key={p.id}><Link className="card-image" href={articleHref(p,language,{genre:category,query})} aria-label={p.title}><StoryImage src={p.image} alt={p.title}/><span className="image-open"><ArrowUpRight size={20}/></span></Link><div className="post-kicker"><span>{categoryName(p.category,locale)}</span><span>•</span><span>{Math.max(1,Math.ceil(p.content.split(/\s+/).length/200))} {t.minutes}</span><Button type="button" variant="ghost" size="icon" aria-label={saved.includes(p.id)?t.savedDone:t.save} aria-pressed={saved.includes(p.id)} className="icon-btn ml-auto" onClick={()=>toggleSaved(p.id)}><Bookmark size={16} fill={saved.includes(p.id)?'currentColor':'none'}/></Button></div><Link className="title-button" href={articleHref(p,language,{genre:category,query})}><h3>{p.title}</h3></Link><p>{p.excerpt}</p><div className="card-meta">{p.author}<span>{p.displayDate}</span></div></article>)}</div></>:<div className="empty"><Globe2 size={40}/><h3>{t.empty}</h3><p>{t.emptyHint}</p><Button type="button" className="primary" onClick={reset}>{t.reset}</Button></div>}
      </section><Ads/><section className="closing"><img className="closing-art" src="/images/story-landscape.svg" alt="" width={1200} height={800} loading="lazy" decoding="async"/><div className="closing-copy"><span className="eyebrow">{t.closingLabel}</span><h2>{t.closing}</h2><p>{t.closingHint}</p><Button type="button" variant="outline" onClick={()=>{reset();document.getElementById('stories')?.scrollIntoView({behavior:'smooth'});}}>{t.continue}<ArrowUpRight size={18}/></Button></div></section>
    </main><SiteFooter/></>;
}
