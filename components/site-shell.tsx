'use client';
import Link from 'next/link';
import {uiCopy} from '@/lib/ui-i18n';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useState,type ReactNode} from 'react';
import {ArrowUpRight,Globe2,Moon,SlidersHorizontal,Sun} from 'lucide-react';
import {brand,categories,categoryName,categoryValue,isLocale,languageNames,locales} from '@/lib/i18n';
import {countries} from '@/lib/data';
import {browseHref} from '@/lib/country-selection';
import {useSite} from './site-context';
import {AuthControl} from './auth-provider';
import HeaderSearch from './header-search';
import {SearchableSelect} from './ui/searchable-select';

// Editors retain an independent language control; public browsing uses CountrySelect.
export function LanguageSelect(){
  const {locale,t}=useSite(),router=useRouter(),pathname=usePathname();
  return <label className="language-select"><Globe2 size={15}/><span className="sr-only">{t.language}</span><select aria-label={t.language} value={locale} onChange={e=>{
    const next=e.target.value;if(isLocale(next))router.push(`/${next}${pathname.split('/')[2]==='admin'?'/'+pathname.split('/').slice(2).join('/'):''}`);
  }}>{locales.map(code=><option lang={code} key={code} value={code}>{languageNames[code]}</option>)}</select></label>;
}
export function Brand({footer=false}:{footer?:boolean}){const {country}=useSite();return <Link href={browseHref(country)} className={footer?'footer-logo once-brand':'logo once-brand'}><img className="brand-mark" src="/brand/mark.svg" alt="" width={48} height={48}/><span className="brand-wordmark">Once Upon<span className="brand-today">Today<span className="brand-dot">.</span></span></span></Link>;}

function HeaderFilters({children}:{children:ReactNode}){
  const {locale,t,country,countryLabels}=useSite(),router=useRouter(),search=useSearchParams();
  const query=search.get('q')||'';
  const rawGenre=categoryValue(search.get('genre')||'all'),genre=categories.some(c=>c===rawGenre)?rawGenre:'all';
  return <><Brand/>
    <HeaderSearch genre={genre}/>
    <div className="header-right"><div className="header-selections">
    <div className="header-country"><Globe2 size={18}/><span className="sr-only">{t.country}</span><SearchableSelect label={t.country} value={country} onChange={value=>router.push(browseHref(value))} options={[{value:'all',label:t.allCountries},...countries.map(c=>({value:c.code,label:c.flag+' '+countryLabels[c.code],keywords:c.name}))]} searchPlaceholder={uiCopy(locale).searchOptions} emptyMessage={uiCopy(locale).noOptions}/></div>
    <div className="header-genre"><span className="sr-only">{t.category}</span><SearchableSelect label={t.category} value={genre} onChange={value=>router.push(browseHref(country,{genre:value,query}))} options={[{value:'all',label:t.category+': '+t.all},...categories.map(c=>({value:c,label:categoryName(c,locale)}))]} searchPlaceholder={t.search} emptyMessage={t.empty}/></div>
    </div>{children}</div>
  </>;
}
export function SiteHeader(){
  const {locale,t,preferences,setPreferences}=useSite(),[settings,setSettings]=useState(false);
  return <><div className="topline">{t.tagline.toLocaleUpperCase(locale)}<span>{t.slow}</span></div><header className="header site-header"><div className="header-main"><HeaderFilters><div className="header-tools"><AuthControl locale={locale}/><button aria-label={t.theme} className="icon-btn" onClick={()=>setPreferences({...preferences,dark:!preferences.dark})}>{preferences.dark?<Sun size={19}/>:<Moon size={19}/>}</button><button aria-label={t.reading} aria-expanded={settings} className="icon-btn" onClick={()=>setSettings(!settings)}><SlidersHorizontal size={19}/></button></div></HeaderFilters>{settings&&<div className="settings"><strong>{t.reading}</strong><label>{t.font}<select value={preferences.font} onChange={e=>setPreferences({...preferences,font:e.target.value as typeof preferences.font})}><option value="sans">{uiCopy(locale).sans}</option><option value="serif">{uiCopy(locale).serif}</option><option value="mono">{uiCopy(locale).mono}</option></select></label><label>{t.size}: {preferences.size}px<input type="range" min="16" max="26" value={preferences.size} onChange={e=>setPreferences({...preferences,size:+e.target.value})}/></label><button onClick={()=>setSettings(false)}>{t.done}</button></div>}</div></header></>;
}
export function SiteFooter(){const {locale,t}=useSite();return <footer><Brand footer/><span>© 2026 {brand}. {t.copyright}</span><Link href={`/${locale}/admin`}>{t.editors}<ArrowUpRight size={14}/></Link></footer>;}
