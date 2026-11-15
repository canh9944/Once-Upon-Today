'use client';
import {adsenseClient,adsenseSlot} from '@/lib/adsense';
import {useEffect,useRef,useState} from 'react';
import {trafficSession} from '@/lib/traffic-client';
import {useSite} from './site-context';

const queued=new WeakSet<HTMLElement>();
let frame:number|undefined;
function requestAds(){
  if(frame!==undefined)return;
  frame=requestAnimationFrame(()=>{
    frame=undefined;
    // Initialize in DOM order: Google's queue always processes the next available ins.
    for(const element of document.querySelectorAll<HTMLElement>('ins.adsbygoogle[data-site-ad="true"]')){
      if(queued.has(element)||element.hasAttribute('data-adsbygoogle-status')||element.getBoundingClientRect().width<=0)continue;
      try{
        const win=window as unknown as {adsbygoogle:{push:(request:Record<string,never>)=>unknown}};
        win.adsbygoogle ||= [] as Record<string,never>[];
        win.adsbygoogle.push({});queued.add(element);
      }catch{ /* Keep reading available when the ad provider is blocked. */ }
    }
  });
}

export default function Ads({placement}:{placement:'home-feature'|'home-feed'|'article-inline'|'article-end'}){
  const {t,locale}=useSite(),container=useRef<HTMLElement>(null);
  const [ready,setReady]=useState(false),[channel,setChannel]=useState<string|undefined>();
  useEffect(()=>{let active=true;const session=trafficSession();if(session.source!=='facebook'||!session.fanpage){setReady(true);return;}void fetch('/api/analytics/channel?fanpage='+encodeURIComponent(session.fanpage),{signal:AbortSignal.timeout(2500)}).then(r=>r.ok?r.json():null).then(data=>{if(active&&typeof data?.channel==='string'&&/^\d{1,20}$/.test(data.channel))setChannel(data.channel);}).catch(()=>{}).finally(()=>{if(active)setReady(true);});return ()=>{active=false;};},[]);
  useEffect(()=>{
    if(!ready)return;
    const node=container.current;if(!node)return;
    const observer=new ResizeObserver(requestAds);observer.observe(node);requestAds();
    return ()=>observer.disconnect();
  },[ready]);
  return <aside ref={container} className="ad" data-ad-placement={placement} lang={locale} aria-label={t.ad}>
    <ins className="adsbygoogle" data-site-ad={ready?'true':'false'} data-ad-channel={channel} style={{display:'block'}} data-ad-client={adsenseClient} data-ad-slot={adsenseSlot} data-ad-format="auto" data-full-width-responsive="true"/>
  </aside>;
}
