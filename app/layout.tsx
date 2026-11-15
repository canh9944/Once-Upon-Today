import './globals.css';
import {headers} from 'next/headers';
import Script from 'next/script';
import {brand,isLocale} from '@/lib/i18n';
import {adsenseClient} from '@/lib/adsense';
export const metadata = {title:{default:brand,template:`%s | ${brand}`},description:'Journeys, people and ideas worth sharing. Discover the world, one story at a time.'};
export default async function Layout({children}:{children:React.ReactNode}) {
  const value=(await headers()).get('x-once-locale');
  const tagsEnabled=process.env.NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ENABLED==='true';
  return <html lang={isLocale(value)?value:'en'} suppressHydrationWarning><head>
    <meta name="google-adsense-account" content={adsenseClient}/>
  </head><body>
    {tagsEnabled&&<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WXG86HT4" height="0" width="0" style={{display:'none',visibility:'hidden'}} title="Google Tag Manager"/></noscript>}
    {children}
    {tagsEnabled&&<><Script id="google-tag-manager-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
      window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
      window.gtag('js', new Date());
    `}</Script>
    <Script id="google-tag-manager" src="https://www.googletagmanager.com/gtm.js?id=GTM-WXG86HT4" strategy="afterInteractive" async/></>}
  </body></html>;
}
