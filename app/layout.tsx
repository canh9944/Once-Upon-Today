import './globals.css';
import {headers} from 'next/headers';
import {brand,isLocale} from '@/lib/i18n';
export const metadata = {title:{default:brand,template:`%s | ${brand}`},description:'Journeys, people and ideas worth sharing. Discover the world, one story at a time.'};
export default async function Layout({children}:{children:React.ReactNode}) {const value=(await headers()).get('x-once-locale');return <html lang={isLocale(value)?value:'en'} suppressHydrationWarning><body>{children}</body></html>; }
