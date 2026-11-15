'use client';
import {uiCopy} from '@/lib/ui-i18n';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useId,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {ArrowUpRight,Search,TrendingUp} from 'lucide-react';
import {articleHref,browseHref} from '@/lib/country-selection';
import {categoryName} from '@/lib/i18n';
import type {SearchStory} from '@/shared/search';
import {useSite} from './site-context';
import {Button} from './ui/button';
import {Input} from './ui/input';
import StoryImage from './story-image';

export default function HeaderSearch({genre}:{genre:string}){
  const {locale,t,country}=useSite(),router=useRouter(),pathname=usePathname(),search=useSearchParams();
  const committedQuery=search.get('q')||'',id=useId(),input=useRef<HTMLInputElement>(null);
  const [query,setQuery]=useState(committedQuery),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
  const [result,setResult]=useState<{key:string;posts:SearchStory[];error:boolean}|null>(null);
  const params=new URLSearchParams({country,genre,q:query.trim()}),key=params.toString();
  const loading=open&&result?.key!==key,posts=result?.key===key?result.posts:[];
  const ui=uiCopy(locale),label=query.trim()?ui.searchResults:ui.popularStories;
  useEffect(()=>{setQuery(committedQuery);setOpen(false);setActive(-1);},[committedQuery,pathname,country,genre]);
  useEffect(()=>{
    if(!open)return;
    const controller=new AbortController();
    const timeout=setTimeout(async()=>{
      try{
        const response=await fetch(`/api/search?${key}`,{signal:controller.signal});
        if(!response.ok)throw new Error('Search unavailable');
        const data=await response.json();
        if(!controller.signal.aborted)setResult({key,posts:data.posts,error:false});
      }catch{if(!controller.signal.aborted)setResult({key,posts:[],error:true});}
    },query.trim()?180:0);
    return ()=>{clearTimeout(timeout);controller.abort();};
  },[open,key,query]);
  const href=(post:SearchStory)=>articleHref(post,country,{genre,query});
  function submit(event:FormEvent){
    event.preventDefault();
    setOpen(false);setActive(-1);
    const nextQuery=query.trim();
    if(nextQuery===committedQuery.trim()||(!nextQuery&&pathname!==browseHref(country).split('?')[0]))return;
    router.push(browseHref(country,{genre,query:nextQuery}));
  }
  function keyDown(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==='Escape'){event.preventDefault();setOpen(false);setActive(-1);}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();setOpen(true);
      setActive(previous=>posts.length?(event.key==='ArrowDown'?(previous+1)%posts.length:(previous<=0?posts.length-1:previous-1)):-1);
    }
    if(event.key==='Enter'&&open&&active>=0&&posts[active]){event.preventDefault();setOpen(false);router.push(href(posts[active]));}
  }
  useEffect(()=>{if(active>=0)document.getElementById(`${id}-${active}`)?.scrollIntoView({block:'nearest'});},[active,id]);
  return <form role="search" className="header-search" onSubmit={submit} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget)){setOpen(false);setActive(-1);}}}>
    <Input ref={input} type="search" role="combobox" autoComplete="off" maxLength={200} aria-label={t.search} placeholder={t.search} aria-expanded={open} aria-controls={open?`${id}-results`:undefined} aria-autocomplete="list" aria-activedescendant={open&&active>=0&&posts[active]?`${id}-${active}`:undefined} value={query} onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);setActive(-1);}} onKeyDown={keyDown}/>
    <Button type="submit" variant="ghost" size="icon" aria-label={t.search}><Search size={17}/></Button>
    {open&&<div className="search-suggestions">
      <div className="search-suggestions-heading"><TrendingUp size={15}/><span>{label}</span></div>
      <div id={`${id}-results`} role="listbox" aria-label={label} aria-busy={loading} className="search-suggestions-list">
        {posts.map((post,index)=><Link key={post.id} id={`${id}-${index}`} role="option" aria-selected={active===index} className={`search-suggestion${active===index?' is-active':''}`} href={href(post)} onMouseDown={event=>event.preventDefault()} onMouseMove={()=>setActive(index)} onClick={()=>{setOpen(false);setActive(-1);input.current?.blur();}}>
          <StoryImage src={post.image} alt=""/><span className="search-suggestion-copy"><small>{categoryName(post.category,locale)}</small><strong>{post.title}</strong><span>{post.author}</span></span><ArrowUpRight size={16}/>
        </Link>)}
      </div>
      {(loading||!posts.length)&&<p className="search-suggestions-status" role="status">{loading?t.loading:result?.error?t.requestError:ui.searchEmpty}</p>}
    </div>}
  </form>;
}
