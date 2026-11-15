'use client';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
import {SiteHeader,SiteFooter} from './site-shell';
import {useSite} from './site-context';

export function LegalShell({children,back}:{children:ReactNode;back:string}){
 const {listHref}=useSite();
 return <><SiteHeader/><main className="legal-container"><Link href={listHref} className="article-back"><ArrowLeft size={16}/>{back}</Link>{children}</main><SiteFooter/></>;
}
