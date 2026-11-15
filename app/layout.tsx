import './globals.css';
import {headers} from 'next/headers';
import Script from 'next/script';
import {brand,isLocale} from '@/lib/i18n';
import {adsenseClient} from '@/lib/adsense';
export const metadata = {title:{default:brand,template:`%s | ${brand}`},description:'Journeys, people and ideas worth sharing. Discover the world, one story at a time.'};
export default async function Layout({children}:{children:React.ReactNode}) {
  const value=(await headers()).get('x-once-locale');
  return <html lang={isLocale(value)?value:'en'} suppressHydrationWarning><head>
    <meta name="google-adsense-account" content={adsenseClient}/>
    <script id="google-adsense" async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`} crossOrigin="anonymous"/>
  </head><body>
    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WXG86HT4" height="0" width="0" style={{display:'none',visibility:'hidden'}} title="Google Tag Manager"/></noscript>
    {children}
    <Script id="google-tag-manager-init" strategy="afterInteractive">{`
      window.dataLayer = window.dataLayer || [];
      window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
      window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
      window.gtag('js', new Date());
    `}</Script>
    <Script id="google-tag-manager" src="https://www.googletagmanager.com/gtm.js?id=GTM-WXG86HT4" strategy="afterInteractive" async/>
  </body></html>;
}
