'use client';
import {uiCopy} from '@/lib/ui-i18n';
import {useEffect,useId,useState,type FormEvent} from 'react';
import {usePathname} from 'next/navigation';
import {LoaderCircle} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {PasswordInput} from '@/components/password-input';
import {authCopy} from '@/lib/auth-i18n';
import {brand,dictionary,type Locale} from '@/lib/i18n';

type Props={locale:Locale;open:boolean;onOpenChange:(open:boolean)=>void;onAuthenticated:()=>Promise<void>;googleEnabled:boolean;initialError?:string;initialTab:'login'|'signup';restoreFocus:()=>void};
export function AuthDialog({locale,open,onOpenChange,onAuthenticated,googleEnabled,initialError,initialTab,restoreFocus}:Props){
  const t=dictionary(locale),a=authCopy(locale),id=useId(),pathname=usePathname();
  const [tab,setTab]=useState('login'),[name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{if(open){setTab(initialTab);setError(initialError||'');}else{setPassword('');setConfirm('');setError('');}},[open,initialError,initialTab]);
  const message=(code:string)=>code in a?a[code as keyof typeof a]:code in t?t[code as keyof typeof t]:t.requestError;
  async function submit(e:FormEvent){
    e.preventDefault();setError('');if(tab==='signup'&&password!==confirm){setError('mismatch');return;}
    setBusy(true);try{const response=await fetch(tab==='signup'?'/api/auth/signup':'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,...(tab==='signup'?{name}:{})})});
      const data=await response.json();if(!response.ok){setError(data.code||'requestError');return;}await onAuthenticated();onOpenChange(false);
    }catch{setError('requestError');}finally{setBusy(false);}
  }
  async function google(){
    setBusy(true);setError('');try{const response=await fetch('/api/auth/google',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({locale,returnTo:pathname+window.location.search})});const data=await response.json();if(!response.ok){setError(data.code||'oauthFailed');return;}window.location.assign(data.url);}catch{setError('oauthFailed');}finally{setBusy(false);}
  }
  const fields=(signup:boolean)=><form onSubmit={submit} className="auth-form" aria-busy={busy}>
    {signup&&<div className="auth-field"><Label htmlFor={`${id}-name`}>{a.name}</Label><Input id={`${id}-name`} name="name" autoComplete="name" minLength={2} maxLength={80} required disabled={busy} value={name} onChange={e=>setName(e.target.value)}/></div>}
    <div className="auth-field"><Label htmlFor={`${id}-${tab}-email`}>{uiCopy(locale).email}</Label><Input id={`${id}-${tab}-email`} name="email" type="email" autoComplete="username" maxLength={254} required disabled={busy} value={email} onChange={e=>setEmail(e.target.value)}/></div>
    <div className="auth-field"><Label htmlFor={`${id}-${tab}-password`}>{t.password}</Label><PasswordInput id={`${id}-${tab}-password`} name="password" autoComplete={signup?'new-password':'current-password'} minLength={signup?12:undefined} maxLength={128} required disabled={busy} value={password} onChange={e=>setPassword(e.target.value)} showLabel={a.showPassword} hideLabel={a.hidePassword} aria-describedby={signup?`${id}-hint`:undefined}/>{signup&&<p id={`${id}-hint`} className="auth-hint">{a.passwordHint}</p>}</div>
    {signup&&<div className="auth-field"><Label htmlFor={`${id}-confirm`}>{a.confirmPassword}</Label><PasswordInput id={`${id}-confirm`} name="confirmPassword" autoComplete="new-password" maxLength={128} required disabled={busy} value={confirm} onChange={e=>setConfirm(e.target.value)} showLabel={a.showPassword} hideLabel={a.hidePassword}/></div>}
    {error&&<p className="error" role="alert">{message(error)}</p>}<Button type="submit" disabled={busy} className="w-full">{busy&&<LoaderCircle className="animate-spin"/>}{busy?t.loading:signup?a.signup:t.login}</Button>
  </form>;
  return <Dialog open={open} onOpenChange={value=>{if(!busy)onOpenChange(value);}}><DialogContent className="auth-dialog" closeLabel={t.close} onCloseAutoFocus={event=>{event.preventDefault();restoreFocus();}}><div className="auth-wordmark">{brand}<span>·</span></div><DialogHeader><DialogTitle>{tab==='signup'?a.signupTitle:t.welcome}</DialogTitle><DialogDescription>{tab==='signup'?a.signupHint:t.loginHint}</DialogDescription></DialogHeader>
    <Tabs value={tab} onValueChange={value=>{setTab(value);setError('');setPassword('');setConfirm('');}}><TabsList className="w-full" aria-label={a.account}><TabsTrigger value="login" disabled={busy}>{t.login}</TabsTrigger><TabsTrigger value="signup" disabled={busy}>{a.signup}</TabsTrigger></TabsList>
      <div className="auth-google"><Button variant="outline" type="button" className="w-full" disabled={busy||!googleEnabled} onClick={google}><GoogleIcon/>{a.google}</Button>{!googleEnabled&&<p className="auth-hint">{a.googleUnavailable}</p>}</div><div className="auth-divider"><span>{a.or}</span></div>
      <TabsContent value="login">{fields(false)}</TabsContent><TabsContent value="signup">{fields(true)}</TabsContent>
    </Tabs><p className="auth-note">{a.readerOnly}</p>
  </DialogContent></Dialog>;
}
function GoogleIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.91A6 6 0 0 1 6.09 12c0-.66.11-1.3.31-1.91v-2.6H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.51l3.34-2.6Z"/><path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.83 1.5L18.7 4.6A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.6A5.98 5.98 0 0 1 12 5.97Z"/></svg>;}
