import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
import {isLocale} from '@/shared/domain';
import {legalCopy,policies,type Policy} from '@/lib/legal';
import {LegalShell} from '@/components/legal-shell';
import {DeleteAccount} from '@/components/delete-account';

type Props={params:Promise<{locale:string;policy:string}>};
async function content({params}:Props){
 const {locale,policy}=await params;if(!isLocale(locale)||!policies.includes(policy as Policy))notFound();
 const requested=(await headers()).get('x-once-locale'),displayLocale=isLocale(requested)?requested:locale;
 const copy=legalCopy(displayLocale);return {copy,page:copy.pages[policy as Policy],policy,displayLocale};
}
export async function generateMetadata(props:Props){const {page}=await content(props);return {title:page.title,description:page.intro};}
export default async function Page(props:Props){
 const {copy,page,policy,displayLocale}=await content(props);
 const actions={login:copy.login,deleteButton:copy.deleteButton,confirmTitle:copy.confirmTitle,confirmDescription:copy.confirmDescription,confirm:copy.confirm,cancel:copy.cancel,deleted:copy.deleted,deleteError:copy.deleteError,adminNotice:copy.adminNotice,remoteNotice:copy.remoteNotice,openProduction:copy.openProduction};
 return <LegalShell back={copy.back}><article className="legal-page" lang={displayLocale}><header className="legal-heading"><p className="eyebrow">Once Upon Today</p><h1>{page.title}</h1><p className="legal-updated">{copy.updated}: <time dateTime="2026-11-15">{new Intl.DateTimeFormat(displayLocale,{dateStyle:'long',timeZone:'UTC'}).format(new Date('2026-11-15T00:00:00Z'))}</time></p><p className="legal-lead">{page.intro}</p></header>{page.sections.map((section,index)=><section key={index}><h2>{section.title}</h2>{section.body.split('\n').map((text,i)=><p key={i}>{text}</p>)}</section>)}{policy==='user-data-deletion'&&<div className="legal-delete"><DeleteAccount copy={actions}/></div>}{policy==='privacy-policy'&&<section><h2>{copy.resources}</h2><ul><li><a href="https://policies.google.com/privacy">Google — Privacy Policy</a></li><li><a href="https://policies.google.com/technologies/partner-sites">Google — Partner sites</a></li><li><a href="https://myadcenter.google.com/">Google — My Ad Center</a></li><li><a href="https://www.facebook.com/privacy/policy/">Meta — Privacy Policy</a></li><li><a href="https://www.apple.com/legal/privacy/">Apple — Privacy Policy</a></li></ul></section>}</article></LegalShell>;
}
