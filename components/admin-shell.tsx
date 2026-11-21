'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState,type ReactNode} from 'react';
import {ArrowLeft,ChartNoAxesCombined,FileText,LayoutDashboard,LogOut,Activity} from 'lucide-react';
import {useSite} from './site-context';
import {useAuth} from './auth-provider';
import {Brand,LanguageSelect} from './site-shell';
import {Button} from './ui/button';
import {Card} from './ui/card';
import {analyticsCopy} from '@/lib/analytics-i18n';
import {authCopy} from '@/lib/auth-i18n';

export default function AdminShell({children}:{children:ReactNode}){
  const {locale,t}=useSite(),{user,ready,openLogin,logout}=useAuth(),pathname=usePathname();
  const [error,setError]=useState(false);const base=`/${locale}/admin`;
  useEffect(()=>{if(ready&&!user)openLogin();},[ready,user,openLogin]);
  if(!ready)return <div className="login-shell">{t.loading}</div>;
  if(user?.role!=='admin')return <div className="login-shell"><Link href={`/${locale}`} className="back-link"><ArrowLeft size={16}/>{t.back}</Link><div className="login-language"><LanguageSelect/></div><Card className="login-card"><Brand/><div className="eyebrow">{t.editors}</div><h1>{authCopy(locale).loginContinue}</h1><p>{authCopy(locale).adminOnly}</p>{error&&<p className="error" role="alert">{t.requestError}</p>}<Button className="w-full" onClick={async()=>{try{if(user)await logout();openLogin();}catch{setError(true);}}}>{user?authCopy(locale).switchAccount:t.login}</Button></Card></div>;
  return <div className="admin-shell"><aside className="sidebar"><Brand/><span className="eyebrow">{t.editors}</span><Link className={pathname===base?'active':''} href={base}><LayoutDashboard size={19}/>{t.overview}</Link><Link className={pathname===base+'/traffic'?'active':''} aria-current={pathname===base+'/traffic'?'page':undefined} href={base+'/traffic'}><Activity size={19}/>{analyticsCopy(locale).ga4Traffic}</Link><Link className={pathname===base+'/revenue'?'active':''} aria-current={pathname===base+'/revenue'?'page':undefined} href={base+'/revenue'}><ChartNoAxesCombined size={19}/>{analyticsCopy(locale).revenue}</Link><Link className={pathname.startsWith(base+'/posts')?'active':''} href={base+'/posts'}><FileText size={19}/>{t.posts}</Link><Link href={`/${locale}`}><ArrowLeft size={19}/>{t.website}</Link><div className="admin-language"><LanguageSelect/></div><button className="logout" onClick={async()=>{try{await logout();}catch{setError(true);}}}><LogOut size={19}/>{t.logout}</button>{error&&<p className="error" role="alert">{t.requestError}</p>}</aside><main className="admin-main">{children}</main></div>;
}
