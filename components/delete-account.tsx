'use client';
import {useEffect,useState} from 'react';
import {useAuth} from './auth-provider';
import {useSite} from './site-context';
import {Button} from './ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import type {LegalCopy} from '@/lib/legal';

type Copy=Pick<LegalCopy,'login'|'deleteButton'|'confirmTitle'|'confirmDescription'|'confirm'|'cancel'|'deleted'|'deleteError'|'adminNotice'|'remoteNotice'|'openProduction'>;
export function DeleteAccount({copy}:{copy:Copy}){
 const {user,ready,openLogin,refresh}=useAuth(),{locale,t,clearReaderData}=useSite();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false),[remote,setRemote]=useState<string|null>(null);
 useEffect(()=>{void fetch('/api/auth',{cache:'no-store'}).then(r=>r.json()).then(data=>{if(typeof data.remoteOrigin==='string')setRemote(data.remoteOrigin);}).catch(()=>{});},[]);
 async function remove(){
  setBusy(true);setError(false);
  try{
   const response=await fetch('/api/auth/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})});
   if(!response.ok)throw new Error();
   clearReaderData();
   setOpen(false);setDone(true);await refresh();
  }catch{setError(true);}finally{setBusy(false);}
 }
 if(done)return <p className="legal-notice" role="status">{copy.deleted}</p>;
 if(remote)return <div className="legal-notice"><p>{copy.remoteNotice}</p><Button asChild variant="outline"><a href={`${remote}/${locale}/user-data-deletion`}>{copy.openProduction}</a></Button></div>;
 if(!user)return <Button disabled={!ready} onClick={()=>openLogin()}>{copy.login}</Button>;
 if(user.id==='env-admin')return <p className="legal-notice">{copy.adminNotice}</p>;
 return <><Button variant="destructive" onClick={()=>{setError(false);setOpen(true);}}>{copy.deleteButton}</Button><Dialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><DialogContent closeLabel={t.close}><DialogHeader><DialogTitle>{copy.confirmTitle}</DialogTitle><DialogDescription>{copy.confirmDescription}</DialogDescription></DialogHeader>{error&&<p role="alert" className="error">{copy.deleteError}</p>}<div className="legal-actions"><Button variant="outline" disabled={busy} onClick={()=>setOpen(false)}>{copy.cancel}</Button><Button variant="destructive" disabled={busy} onClick={remove}>{copy.confirm}</Button></div></DialogContent></Dialog></>;
}
