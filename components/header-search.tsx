'use client';
import {uiCopy} from '@/lib/ui-i18n';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {ArrowUpRight,Search,TrendingUp,RotateCcw} from 'lucide-react';
import {languageArticleHref as articleHref,languageBrowseHref as browseHref} from '@/lib/language-selection';
import {categoryName} from '@/lib/i18n';
import type {SearchStory} from '@/shared/search';
import {useSite} from './site-context';
import {Button} from './ui/button';
import {Popover,PopoverAnchor,PopoverContent} from './ui/popover';
import {Command,CommandInput,CommandList,CommandItem} from './ui/command';
import StoryImage from './story-image';

export default function HeaderSearch({genre}:{genre:string}){
  const {locale,t,language}=useSite(),router=useRouter(),pathname=usePathname(),search=useSearchParams();
  const committedQuery=search.get('q')||'',input=useRef<HTMLInputElement>(null),form=useRef<HTMLFormElement>(null),keyboardSelection=useRef(false);
  const [query,setQuery]=useState(committedQuery),[open,setOpen]=useState(false),[selected,setSelected]=useState('');
  const [result,setResult]=useState<{key:string;posts:SearchStory[];error:boolean;nextOffset:number|null}|null>(null);
  const [loadingMore,setLoadingMore]=useState(false),[moreError,setMoreError]=useState(false);
  const list=useRef<HTMLDivElement>(null),sentinel=useRef<HTMLDivElement>(null);
  const key=new URLSearchParams({language,genre,q:query.trim()}).toString();
  const loading=open&&result?.key!==key,posts=result?.key===key?result.posts:[];
  const ui=uiCopy(locale),label=query.trim()?ui.searchResults:ui.popularStories;
  function close(){setOpen(false);keyboardSelection.current=false;}
  useEffect(()=>{setQuery(committedQuery);setOpen(false);keyboardSelection.current=false;},[committedQuery,pathname,language,genre]);
  useEffect(()=>{
    if(!open)return;
    setResult(null);setMoreError(false);setLoadingMore(false);list.current?.scrollTo({top:0});
    const controller=new AbortController(),timeout=setTimeout(async()=>{
      try{const response=await fetch(`/api/search?${key}`,{signal:controller.signal});if(!response.ok)throw new Error('Search unavailable');const data=await response.json();if(!Array.isArray(data.posts))throw new Error('Invalid search results');if(!controller.signal.aborted)setResult({key,posts:data.posts,error:false,nextOffset:Number.isSafeInteger(data.nextOffset)&&data.nextOffset>0?data.nextOffset:null});}
      catch{if(!controller.signal.aborted)setResult({key,posts:[],error:true,nextOffset:null});}
    },query.trim()?180:0);
    return ()=>{clearTimeout(timeout);controller.abort();};
  },[open,key,query]);
  useEffect(()=>{
    if(!open||result?.key!==key||result.nextOffset===null||moreError||!list.current||!sentinel.current)return;
    const controller=new AbortController(),offset=result.nextOffset;let pending=false;
    const observer=new IntersectionObserver(entries=>{
      if(pending||!entries.some(entry=>entry.isIntersecting))return;
      pending=true;setLoadingMore(true);
      void (async()=>{
        try{
          const response=await fetch(`/api/search?${key}&offset=${offset}`,{signal:controller.signal});if(!response.ok)throw new Error('Search unavailable');const data=await response.json();if(!Array.isArray(data.posts))throw new Error('Invalid search results');
          if(controller.signal.aborted)return;
          setResult(current=>{if(current?.key!==key)return current;const seen=new Set(current.posts.map(post=>post.id)),added:SearchStory[]=[];for(const post of data.posts as SearchStory[])if(!seen.has(post.id)){seen.add(post.id);added.push(post);}return {...current,posts:[...current.posts,...added],nextOffset:added.length&&Number.isSafeInteger(data.nextOffset)&&data.nextOffset>offset?data.nextOffset:null};});
        }catch{if(!controller.signal.aborted)setMoreError(true);}
        finally{if(!controller.signal.aborted)setLoadingMore(false);}
      })();
    },{root:list.current,rootMargin:'0px 0px 80px 0px'});
    observer.observe(sentinel.current);
    return ()=>{controller.abort();observer.disconnect();};
  },[open,key,result?.key,result?.nextOffset,moreError]);
  const href=(post:SearchStory)=>articleHref(post,language,{genre,query});
  function submit(event?:FormEvent){
    event?.preventDefault();close();const nextQuery=query.trim();
    if(nextQuery===committedQuery.trim()||(!nextQuery&&pathname.split('/').filter(Boolean).length>1))return;
    router.push(browseHref(language,{genre,query:nextQuery}));
  }
  function keyDown(event:KeyboardEvent){
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){keyboardSelection.current=true;setOpen(true);}
    if(event.key==='Enter'){
      event.preventDefault();event.stopPropagation();
      const post=keyboardSelection.current&&open?posts.find(p=>p.id===selected):undefined;
      if(post){close();input.current?.blur();router.push(href(post));}else submit();
    }
  }
  return <Popover open={open} onOpenChange={value=>{setOpen(value);if(!value)keyboardSelection.current=false;}}><Command className="header-search" label={t.search} shouldFilter={false} value={selected} onValueChange={setSelected} onKeyDownCapture={keyDown} loop>
    <PopoverAnchor asChild><form ref={form} role="search" onSubmit={submit}>
      <CommandInput ref={input} appearance="search" action={<Button type="submit" variant="ghost" size="icon" aria-label={t.search}><Search size={17}/></Button>} autoComplete="off" maxLength={200} aria-label={t.search} aria-expanded={open} placeholder={t.search} value={query} onFocus={()=>setOpen(true)} onClick={()=>setOpen(true)} onValueChange={value=>{setQuery(value);setOpen(true);keyboardSelection.current=false;}}/>
    </form></PopoverAnchor>
    <PopoverContent className="search-suggestions" align="start" collisionPadding={16} aria-label={label} onOpenAutoFocus={event=>event.preventDefault()} onCloseAutoFocus={event=>event.preventDefault()} onInteractOutside={event=>{if(form.current?.contains(event.target as Node))event.preventDefault();}}>
      <div className="search-suggestions-heading"><TrendingUp size={15}/><span>{label}</span></div>
      <CommandList ref={list} aria-label={label} aria-busy={loading||loadingMore} className="search-suggestions-list">
        {posts.map(post=><CommandItem key={post.id} value={post.id} asChild onSelect={()=>{close();input.current?.blur();}}><Link className="search-suggestion" href={href(post)} onMouseDown={event=>event.preventDefault()}><StoryImage src={post.image} alt=""/><span className="search-suggestion-copy"><small>{categoryName(post.category,locale)}</small><strong>{post.title}</strong><span>{post.author}</span></span><ArrowUpRight size={16}/></Link></CommandItem>)}
        {result?.key===key&&result.nextOffset!==null&&<div ref={sentinel} className="search-load-more" aria-hidden="true"/>}
        {loadingMore&&<p className="search-suggestions-status" role="status">{t.loading}</p>}
        {moreError&&<div className="search-suggestions-status" role="alert">{t.requestError}<Button type="button" variant="ghost" size="icon" aria-label={t.requestError} onClick={()=>setMoreError(false)}><RotateCcw size={16}/></Button></div>}
      </CommandList>
      {(loading||!posts.length)&&<p className="search-suggestions-status" role="status">{loading?t.loading:result?.error?t.requestError:ui.searchEmpty}</p>}
    </PopoverContent>
  </Command></Popover>;
}
