'use client';
import {uiCopy} from '@/lib/ui-i18n';
import {adsenseClient} from '@/lib/adsense';
import {useEffect,useRef} from 'react';
import {useSite} from './site-context';
export default function Ads(){const {t,locale}=useSite();const client=adsenseClient,slot=process.env.NEXT_PUBLIC_ADSENSE_SLOT;const pushed=useRef(false);useEffect(()=>{if(client&&slot&&!pushed.current){pushed.current=true;try{((window as unknown as {adsbygoogle:unknown[]}).adsbygoogle ||= []).push({});}catch{}}},[client,slot]);return <div className="ad"><span>{t.ad}</span>{client&&slot?<><ins className="adsbygoogle" style={{display:'block'}} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true"/></>:<p>{t.adHint}<small>Google AdSense · {uiCopy(locale).responsive}</small></p>}</div>}
