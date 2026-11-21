'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {LogIn,LogOut,UserRound} from 'lucide-react';
import type {PublicUser} from '@/lib/auth-types';
import {authCopy} from '@/lib/auth-i18n';
import {dictionary,type Locale} from '@/lib/i18n';
import {AuthDialog} from './auth-dialog';
import {Button} from './ui/button';

type AuthState={user:PublicUser|null;ready:boolean;localAuth:boolean;refresh:()=>Promise<void>;openLogin:(tab?:'login'|'signup')=>void;logout:()=>Promise<void>};
const Context=createContext<AuthState|null>(null);
export function AuthProvider({locale,children}:{locale:Locale;children:ReactNode}){
  const [user,setUser]=useState<PublicUser|null>(null),[ready,setReady]=useState(false),[localAuth,setLocalAuth]=useState(false),[open,setOpen]=useState(false),[googleEnabled,setGoogleEnabled]=useState(false),[facebookEnabled,setFacebookEnabled]=useState(false),[appleEnabled,setAppleEnabled]=useState(false),[initialError,setInitialError]=useState(''),[initialTab,setInitialTab]=useState<'login'|'signup'>('login');
  const router=useRouter();
  const returnFocus=useRef<HTMLElement|null>(null);
  const remoteOrigin=useRef<string|null>(null);
  const refresh=useCallback(async()=>{const response=await fetch('/api/auth',{cache:'no-store'});if(!response.ok)throw new Error();const data=await response.json();remoteOrigin.current=typeof data.remoteOrigin==='string'?data.remoteOrigin:null;setLocalAuth(data.authStorage==='memory');setUser(data.user);setGoogleEnabled(!!data.googleEnabled);setFacebookEnabled(!!data.facebookEnabled);setAppleEnabled(!!data.appleEnabled);setReady(true);},[]);
  useEffect(()=>{void refresh().catch(()=>setReady(true));},[refresh]);
  useEffect(()=>{const url=new URL(window.location.href);const error=url.searchParams.get('authError');if(error){setInitialError(['oauthFailed','accountExists','socialEmailMissing'].includes(error)?error:'oauthFailed');setOpen(true);url.searchParams.delete('authError');window.history.replaceState(null,'',url.pathname+url.search+url.hash);}},[]);
  const openLogin=useCallback((tab:'login'|'signup'='login')=>{if(remoteOrigin.current){window.location.assign(`${remoteOrigin.current}/${locale}/admin`);return;}returnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setInitialTab(tab);setInitialError('');setOpen(true);},[locale]);
  const logout=useCallback(async()=>{const response=await fetch('/api/auth',{method:'DELETE'});if(!response.ok)throw new Error();setUser(null);router.refresh();},[router]);
  return <Context.Provider value={{user,ready,localAuth,refresh,openLogin,logout}}>{children}<AuthDialog locale={locale} open={open} onOpenChange={setOpen} onAuthenticated={async()=>{await refresh();router.refresh();}} localAuth={localAuth} googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} appleEnabled={appleEnabled} initialError={initialError} initialTab={initialTab} restoreFocus={()=>{const target=returnFocus.current?.isConnected?returnFocus.current:document.querySelector<HTMLElement>('.account-control button, .auth-login-trigger, .sidebar button');target?.focus();}}/></Context.Provider>;
}
export function useAuth(){const context=useContext(Context);if(!context)throw new Error('AuthProvider is required');return context;}
export function AuthControl({locale}:{locale:Locale}){
  const {user,openLogin,logout}=useAuth(),t=dictionary(locale),a=authCopy(locale);const [busy,setBusy]=useState(false),[error,setError]=useState(false);
  if(!user)return <Button variant="outline" size="sm" className="auth-login-trigger" aria-label={t.login} onClick={()=>openLogin()}><LogIn/><span>{t.login}</span></Button>;
  return <div className="account-control"><span className="account-name" title={user.username??user.email??undefined}><UserRound size={14}/>{user.name}</span><Button type="button" size="icon" variant="ghost" aria-label={t.logout} title={t.logout} disabled={busy} onClick={async()=>{setBusy(true);setError(false);try{await logout();}catch{setError(true);}finally{setBusy(false);}}}><LogOut/></Button>{error&&<span role="alert" className="sr-only">{t.requestError}</span>}<span className="sr-only">{a.account}</span></div>;
}
