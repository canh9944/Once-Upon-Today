'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {brand,dictionary,isLocale} from '@/lib/i18n';
export default function NotFound(){const segment=usePathname().split('/')[1],locale=isLocale(segment)?segment:'en',t=dictionary(locale);return <main className="empty not-found"><p className="eyebrow">{brand}</p><h1>{t.notFound}</h1><p>{t.notFoundHint}</p><Link className="primary" href={`/${locale}`}>{t.back}</Link></main>;}
