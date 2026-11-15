'use client';
import {normalizeCountry} from '@/shared/countries';
import {uiCopy} from '@/lib/ui-i18n';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {ArrowLeft,LoaderCircle} from 'lucide-react';
import {countries,type Post} from '@/lib/data';
import {brand,categories,categoryName,categoryValue,languageNames,type Locale} from '@/lib/i18n';
import {countryLocale,resolveCountry} from '@/lib/country-selection';
import {editorCopy} from '@/lib/editor-i18n';
import {MAX_POST_CONTENT,textToHtml} from '@/lib/content';
import {useSite} from './site-context';
import {useAuth} from './auth-provider';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {SearchableSelect} from './ui/searchable-select';
import {Textarea} from './ui/textarea';
import {Card} from './ui/card';
import ImageUpload from './image-upload';
import RichTextEditor from './rich-text-editor';

type Form=Omit<Post,'date'|'id'>&{id?:string};
function blank(locale:Locale):Form{const selected=resolveCountry(locale,null),country=selected==='all'?'US-UK':selected;return {title:'',excerpt:'',content:'<p></p>',contentFormat:'html',country,language:countryLocale(country),category:categories[0],author:brand,image:'',published:true};}
export default function PostEditor({id}:{id?:string}){
  const {locale,t,countryLabels}=useSite(),copy=editorCopy(locale),{refresh}=useAuth(),router=useRouter();
  const [form,setForm]=useState<Form>(()=>blank(locale)),[loaded,setLoaded]=useState(!id),[busy,setBusy]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  useEffect(()=>{let current=true;setError('');setDirty(false);if(!id){setForm(blank(locale));setLoaded(true);return;}setLoaded(false);
    void fetch(`/api/posts/${encodeURIComponent(id)}`,{cache:'no-store'}).then(async r=>{if(r.status===401){await refresh();throw new Error();}if(!r.ok)throw new Error(r.status===404?'notFound':'requestError');return r.json();}).then(({post}:{post:Post})=>{if(current){setForm({...post,country:normalizeCountry(post.country),category:categoryValue(post.category),content:post.contentFormat==='html'?post.content:textToHtml(post.content),contentFormat:'html'});setLoaded(true);}}).catch(e=>{if(current)setError((e as Error).message==='notFound'?copy.notFound:t.requestError);});
    return()=>{current=false;};
  },[id,locale,refresh,copy.notFound,t.requestError]);
  useEffect(()=>{const listener=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',listener);return()=>window.removeEventListener('beforeunload',listener);},[dirty]);
  const update=<K extends keyof Form>(key:K,value:Form[K])=>{setForm(p=>({...p,[key]:value}));setDirty(true);};
  const contentChange=useCallback((content:string)=>{setForm(p=>({...p,content}));setDirty(true);},[]);
  const options=countries.flatMap(c=>{const languages:Locale[]=c.code==='BE'?['fr-BE','nl-BE','de-BE']:[countryLocale(c.code)];return languages.map(language=>({value:`${c.code}:${language}`,label:`${c.flag} ${countryLabels[c.code]} · ${languageNames[language]}`}));});
  const selected=`${form.country}:${form.language}`;if(!options.some(o=>o.value===selected))options.push({value:selected,label:`${countryLabels[form.country]} · ${languageNames[form.language]}`});
  async function submit(e:FormEvent){e.preventDefault();setError('');if(form.content.length>MAX_POST_CONTENT){setError(copy.tooLong);return;}setBusy(true);
    try{const response=await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});const result=await response.json();if(!response.ok){setError(result.code==='imageError'?t.imageError:t.validationError);return;}setDirty(false);router.push(`/${locale}/admin/posts`);}catch{setError(t.requestError);}finally{setBusy(false);}
  }
  return <><div className="admin-heading"><div><span className="eyebrow">{brand} / {t.editors}</span><h1>{id?t.editStory:t.newStory}</h1></div><Button asChild variant="outline"><Link href={`/${locale}/admin/posts`} onClick={e=>{if(dirty&&!confirm(copy.leave))e.preventDefault();}}><ArrowLeft/>{copy.back}</Link></Button></div>
    {error&&<p className="error" role="alert">{error}</p>}{!loaded?<p>{error?'':t.loading}</p>:<form onSubmit={submit} className="post-editor-page"><fieldset disabled={busy} className="post-editor-fields"><Card className="post-editor-main"><label>{t.title}<Input required maxLength={180} value={form.title} onChange={e=>update('title',e.target.value)}/></label><label>{t.excerpt}<Textarea required rows={3} maxLength={500} value={form.excerpt} onChange={e=>update('excerpt',e.target.value)}/></label><div className="post-content-field"><span>{t.content}</span><RichTextEditor key={id||'new'} value={form.content} onChange={contentChange} disabled={busy}/><p className="auth-hint">{copy.longHint}</p></div></Card>
      <div className="post-editor-settings"><Card className="post-editor-meta"><div className="searchable-select-field"><span>{copy.market}</span><SearchableSelect label={copy.market} value={selected} disabled={busy} onChange={value=>{const [country,language]=value.split(':');setForm(p=>({...p,country,language:language as Locale}));setDirty(true);}} options={options} searchPlaceholder={uiCopy(locale).searchOptions} emptyMessage={uiCopy(locale).noOptions}/></div><p className="auth-hint">{copy.marketHint}</p><div className="searchable-select-field"><span>{t.category}</span><SearchableSelect label={t.category} value={form.category} disabled={busy} onChange={value=>update('category',value)} options={categories.map(c=>({value:c,label:categoryName(c,locale)}))} searchPlaceholder={t.search} emptyMessage={t.empty}/></div><label>{t.author}<Input required maxLength={180} value={form.author} onChange={e=>update('author',e.target.value)}/></label><label className="checkbox-label"><input type="checkbox" checked={form.published} onChange={e=>update('published',e.target.checked)}/>{t.publishNow}</label></Card>
      <Card className="post-editor-meta"><ImageUpload value={form.image} onChange={value=>update('image',value)} label={t.image} onBusyChange={setUploading}/></Card><Button type="submit" className="w-full" disabled={busy||uploading}>{busy&&<LoaderCircle className="animate-spin"/>}{busy?t.loading:form.published?t.publish:t.saveDraft}</Button></div></fieldset></form>}
  </>;
}
