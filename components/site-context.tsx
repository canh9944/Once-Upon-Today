'use client';
import {createContext,useContext,useEffect,useState,useCallback,type ReactNode} from 'react';
import {dictionary,type Locale,type Dictionary} from '@/lib/i18n';
import {AuthProvider} from './auth-provider';
import {usePathname,useSearchParams} from 'next/navigation';
import {resolveCountry} from '@/lib/country-selection';
import {resolveLanguage,languageLocale,languageBrowseHref} from '@/lib/language-selection';
import type {LanguageSelection} from '@/shared/languages';

type Preferences={dark:boolean;font:'sans'|'serif'|'mono';size:number};
type SiteState={locale:Locale;language:LanguageSelection;country:string;countryLabels:Record<string,string>;listHref:string;t:Dictionary;preferences:Preferences;setPreferences:(value:Preferences)=>void;saved:string[];toggleSaved:(id:string)=>void;liked:string[];like:(id:string)=>void;clearReaderData:()=>void};
const Context=createContext<SiteState|null>(null);
// Preserve the original storage keys so rebranding does not erase readers' preferences or bookmarks.
export function track(type:'view'|'like',postId:string){
  try{let visitor=localStorage.getItem('atlas-visitor');if(!visitor){visitor=crypto.randomUUID();localStorage.setItem('atlas-visitor',visitor);}
    void fetch('/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({visitor,type,postId})}).catch(()=>{});
  }catch{/* Reading remains available when browser storage is disabled. */}
}
function persist(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export function SiteProvider({locale:routeLocale,children,countryLabels}:{locale:Locale;children:ReactNode;countryLabels:Record<Locale,Record<string,string>>}){
  const search=useSearchParams(),pathname=usePathname();
  const country=resolveCountry(routeLocale,search.get('country'));
  const language=resolveLanguage(routeLocale,search.get('lang'),search.get('country'));
  const locale=pathname.split('/')[2]==='admin'?routeLocale:languageLocale(routeLocale,language);
  const listHref=languageBrowseHref(language,{genre:search.get('genre')||undefined,query:search.get('q')||undefined});
  const [preferences,setPreferences]=useState<Preferences>({dark:false,font:'sans',size:18});
  const [saved,setSaved]=useState<string[]>([]),[liked,setLiked]=useState<string[]>([]),[ready,setReady]=useState(false);
  // Root layouts persist during client navigation; keep lang in sync after switching editions.
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  useEffect(()=>{
    try{const p=JSON.parse(localStorage.getItem('atlas-preferences')||'{}');setPreferences({dark:p.dark===true,font:['sans','serif','mono'].includes(p.font)?p.font:'sans',size:Math.min(26,Math.max(16,Number(p.size)||18))});
      const bookmarks=JSON.parse(localStorage.getItem('atlas-saved')||'[]'),likes=JSON.parse(localStorage.getItem('atlas-liked')||'[]');
      if(Array.isArray(bookmarks))setSaved(bookmarks.filter(v=>typeof v==='string'));
      if(Array.isArray(likes))setLiked(likes.filter(v=>typeof v==='string'));
    }catch{}setReady(true);
  },[]);
  useEffect(()=>{if(ready){document.documentElement.dataset.theme=preferences.dark?'dark':'light';persist('atlas-preferences',preferences);}},[preferences,ready]);
  const toggleSaved=useCallback((id:string)=>setSaved(previous=>{const next=previous.includes(id)?previous.filter(x=>x!==id):[...previous,id];persist('atlas-saved',next);return next;}),[]);
  const clearReaderData=useCallback(()=>{setSaved([]);setLiked([]);for(const key of ['atlas-saved','atlas-liked','atlas-visitor'])try{localStorage.removeItem(key);}catch{}},[]);
  const like=useCallback((id:string)=>{setLiked(previous=>{if(previous.includes(id))return previous;const next=[...previous,id];persist('atlas-liked',next);return next;});track('like',id);},[]);
  return <Context.Provider value={{locale,language,country,countryLabels:countryLabels[locale],listHref,t:dictionary(locale),preferences,setPreferences,saved,toggleSaved,liked,like,clearReaderData}}><AuthProvider locale={locale}>{children}</AuthProvider></Context.Provider>;
}
export function useSite(){const context=useContext(Context);if(!context)throw new Error('SiteProvider is required');return context;}
