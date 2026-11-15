'use client';
import Link from 'next/link';
import {uiCopy} from '@/lib/ui-i18n';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useState,type ReactNode} from 'react';
import {Button} from './ui/button';
import {Label} from './ui/label';
import {Popover,PopoverContent,PopoverTrigger} from './ui/popover';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from './ui/select';
import {Slider} from './ui/slider';
import {ArrowUpRight,Globe2,Moon,SlidersHorizontal,Sun} from 'lucide-react';
import {brand,categories,categoryName,categoryValue,isLocale,languageNames,locales} from '@/lib/i18n';
import {languageBrowseHref as browseHref,languageSwitchHref} from '@/lib/language-selection';
import {languages,languageLabel,isLanguageSelection} from '@/shared/languages';
import {useSite} from './site-context';
import {AuthControl} from './auth-provider';
import HeaderSearch from './header-search';
import {SearchableSelect} from './ui/searchable-select';

// Editors retain an independent language control; public browsing uses CountrySelect.
export function LanguageSelect(){
  const {locale,t}=useSite(),router=useRouter(),pathname=usePathname();
  return <div className="language-select"><Globe2 size={15}/><Select value={locale} onValueChange={next=>{if(isLocale(next))router.push('/'+next+(pathname.split('/')[2]==='admin'?'/'+pathname.split('/').slice(2).join('/'):''));}}><SelectTrigger size="sm" aria-label={t.language}><SelectValue/></SelectTrigger><SelectContent position="popper">{locales.map(code=><SelectItem lang={code} key={code} value={code}>{languageNames[code]}</SelectItem>)}</SelectContent></Select></div>;
}
export function Brand({footer=false}:{footer?:boolean}){const {language}=useSite();return <Link href={browseHref(language)} className={footer?'footer-logo once-brand':'logo once-brand'}><img className="brand-mark" src="/brand/mark.svg" alt="" width={48} height={48}/><span className="brand-wordmark">Once Upon<span className="brand-today">Today<span className="brand-dot">.</span></span></span></Link>;}

function HeaderFilters({children}:{children:ReactNode}){
  const {locale,t,language}=useSite(),router=useRouter(),search=useSearchParams(),pathname=usePathname();
  const query=search.get('q')||'';
  const rawGenre=categoryValue(search.get('genre')||'all'),genre=categories.some(c=>c===rawGenre)?rawGenre:'all';
  return <><Brand/>
    <HeaderSearch genre={genre}/>
    <div className="header-right"><div className="header-selections">
    <div className="header-country header-language"><Globe2 size={18}/><span className="sr-only">{t.language}</span><SearchableSelect label={t.language} value={language} onChange={value=>{if(isLanguageSelection(value))router.push(languageSwitchHref(pathname,search.toString(),value)+window.location.hash,{scroll:false});}} options={[{value:'all',label:uiCopy(locale).allLanguages},...languages.map(code=>({value:code,label:languageLabel(code,locale),keywords:languageNames[code]+' '+code}))]} searchPlaceholder={uiCopy(locale).searchLanguage} emptyMessage={uiCopy(locale).noOptions}/></div>
    <div className="header-genre"><span className="sr-only">{t.category}</span><SearchableSelect label={t.category} value={genre} onChange={value=>router.push(browseHref(language,{genre:value,query}))} options={[{value:'all',label:t.category+': '+t.all},...categories.map(c=>({value:c,label:categoryName(c,locale)}))]} searchPlaceholder={uiCopy(locale).searchCategory} emptyMessage={uiCopy(locale).noOptions}/></div>
    </div>{children}</div>
  </>;
}
export function SiteHeader(){
  const {locale,t,preferences,setPreferences}=useSite(),[settings,setSettings]=useState(false),ui=uiCopy(locale);
  return <><div className="topline">{t.tagline.toLocaleUpperCase(locale)}<span>{t.slow}</span></div><header className="header site-header"><div className="header-main"><HeaderFilters><div className="header-tools"><AuthControl locale={locale}/><Button type="button" variant="ghost" size="icon" aria-label={t.theme} className="icon-btn" onClick={()=>setPreferences({...preferences,dark:!preferences.dark})}>{preferences.dark?<Sun size={19}/>:<Moon size={19}/>}</Button>
    <Popover open={settings} onOpenChange={setSettings}><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label={t.reading} className="icon-btn"><SlidersHorizontal size={19}/></Button></PopoverTrigger><PopoverContent align="end" className="reading-settings" aria-label={t.reading}><strong>{t.reading}</strong><div className="reading-setting"><Label>{t.font}</Label><Select value={preferences.font} onValueChange={font=>{if(font==='sans'||font==='serif'||font==='mono')setPreferences({...preferences,font});}}><SelectTrigger aria-label={t.font}><SelectValue/></SelectTrigger><SelectContent position="popper"><SelectItem value="sans">{ui.sans}</SelectItem><SelectItem value="serif">{ui.serif}</SelectItem><SelectItem value="mono">{ui.mono}</SelectItem></SelectContent></Select></div><div className="reading-setting"><Label>{t.size}: {preferences.size}px</Label><Slider min={16} max={26} step={1} value={[preferences.size]} aria-label={t.size} onValueChange={([size])=>setPreferences({...preferences,size})}/></div><Button type="button" variant="outline" onClick={()=>setSettings(false)}>{t.done}</Button></PopoverContent></Popover>
    </div></HeaderFilters></div></header></>;
}
export function SiteFooter(){const {locale,t}=useSite();return <footer><Brand footer/><span>© 2026 {brand}. {t.copyright}</span><Link href={`/${locale}/admin`}>{t.editors}<ArrowUpRight size={14}/></Link></footer>;}
