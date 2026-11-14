'use client';
import Link from 'next/link';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,type FormEvent,type ReactNode} from 'react';
import {ArrowUpRight,Globe2,Moon,Search,SlidersHorizontal,Sun} from 'lucide-react';
import {brand,categories,categoryName,isLocale,languageNames,locales} from '@/lib/i18n';
import {countries} from '@/lib/data';
import {browseHref} from '@/lib/country-selection';
import {useSite} from './site-context';
import {AuthControl} from './auth-provider';
import {Button} from './ui/button';
import {Input} from './ui/input';

// Editors retain an independent language control; public browsing uses CountrySelect.
export function LanguageSelect(){
  const {locale,t}=useSite(),router=useRouter(),pathname=usePathname();
  return <label className="language-select"><Globe2 size={15}/><span className="sr-only">{t.language}</span><select aria-label={t.language} value={locale} onChange={e=>{
    const next=e.target.value;if(isLocale(next))router.push(`/${next}${pathname.split('/')[2]==='admin'?'/'+pathname.split('/').slice(2).join('/'):''}`);
  }}>{locales.map(code=><option lang={code} key={code} value={code}>{languageNames[code]}</option>)}</select></label>;
}
export function Brand({footer=false}:{footer?:boolean}){const {country}=useSite();return <Link href={browseHref(country)} className={footer?'footer-logo once-brand':'logo once-brand'}>Once Upon<span className="brand-today">Today<span className="brand-dot">.</span></span></Link>;}

function HeaderFilters({children}:{children:ReactNode}){
  const {locale,t,country,countryLabels}=useSite(),router=useRouter(),search=useSearchParams();
  const committedQuery=search.get('q')||'';
  const [query,setQuery]=useState(committedQuery);
  const rawGenre=search.get('genre')||'all',genre=categories.some(c=>c===rawGenre)?rawGenre:'all';
  useEffect(()=>{setQuery(committedQuery);},[committedQuery]);
  const submit=(event:FormEvent)=>{event.preventDefault();router.push(browseHref(country,{genre,query}));};
  return <><Brand/>
    <form role="search" className="header-search" onSubmit={submit}><Input type="search" aria-label={t.search} placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/><Button type="submit" variant="ghost" size="icon" aria-label={t.search}><Search size={17}/></Button></form>
    <div className="header-right"><div className="header-selections">
    <label className="header-country"><Globe2 size={18}/><span className="sr-only">{t.country}</span><select aria-label={t.country} value={country} onChange={e=>router.push(browseHref(e.target.value))}><option value="all">{t.allCountries}</option>{countries.map(c=><option key={c.code} value={c.code}>{c.flag} {countryLabels[c.code]}</option>)}</select></label>
    <label className="header-genre"><span className="sr-only">{t.category}</span><select aria-label={t.category} value={genre} onChange={e=>router.push(browseHref(country,{genre:e.target.value,query}))}><option value="all">{t.category}: {t.all}</option>{categories.map(c=><option key={c} value={c}>{categoryName(c,locale)}</option>)}</select></label>
    </div>{children}</div>
  </>;
}
export function SiteHeader(){
  const {locale,t,preferences,setPreferences}=useSite(),[settings,setSettings]=useState(false);
  return <><div className="topline">{t.tagline.toLocaleUpperCase(locale)}<span>{t.slow}</span></div><header className="header site-header"><div className="header-main"><HeaderFilters><div className="header-tools"><AuthControl locale={locale}/><button aria-label={t.theme} className="icon-btn" onClick={()=>setPreferences({...preferences,dark:!preferences.dark})}>{preferences.dark?<Sun size={19}/>:<Moon size={19}/>}</button><button aria-label={t.reading} aria-expanded={settings} className="icon-btn" onClick={()=>setSettings(!settings)}><SlidersHorizontal size={19}/></button></div></HeaderFilters>{settings&&<div className="settings"><strong>{t.reading}</strong><label>{t.font}<select value={preferences.font} onChange={e=>setPreferences({...preferences,font:e.target.value as typeof preferences.font})}><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label><label>{t.size}: {preferences.size}px<input type="range" min="16" max="26" value={preferences.size} onChange={e=>setPreferences({...preferences,size:+e.target.value})}/></label><button onClick={()=>setSettings(false)}>{t.done}</button></div>}</div></header></>;
}
export function SiteFooter(){const {locale,t}=useSite();return <footer><Brand footer/><span>© 2026 {brand}. {t.copyright}</span><Link href={`/${locale}/admin`}>{t.editors}<ArrowUpRight size={14}/></Link></footer>;}
