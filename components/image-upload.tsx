'use client';
import {useId,useRef,useState} from 'react';
import {ImagePlus,LoaderCircle,Trash2} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {useSite} from './site-context';
import {editorCopy} from '@/lib/editor-i18n';
import {isImageSource,MAX_IMAGE_BYTES} from '@/lib/content';

export type ImageUploadProps={value:string;onChange:(url:string)=>void;label?:string;disabled?:boolean;onBusyChange?:(busy:boolean)=>void};
export default function ImageUpload({value,onChange,label,disabled=false,onBusyChange}:ImageUploadProps){
  const {locale}=useSite(),copy=editorCopy(locale),id=useId(),fileInput=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  async function upload(file:File|undefined){
    if(!file)return;setError('');
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setError(copy.uploadType);return;}
    if(file.size>MAX_IMAGE_BYTES){setError(copy.uploadSize);return;}
    setBusy(true);onBusyChange?.(true);
    try{
      const bitmap=await createImageBitmap(file);
      if(bitmap.width*bitmap.height>25_000_000){bitmap.close();throw new Error('uploadSize');}
      const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const context=canvas.getContext('2d');if(!context){bitmap.close();throw new Error('uploadFailed');}context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      const optimized=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('uploadFailed')),'image/webp',0.85));
      const body=new FormData();body.set('file',optimized,'upload.webp');const response=await fetch('/api/uploads',{method:'POST',body});const result=await response.json();if(!response.ok)throw new Error(result.code);onChange(result.url);}
    catch(e){const key=(e as Error).message;setError(key==='uploadSize'?copy.uploadSize:key==='uploadType'?copy.uploadType:copy.uploadFailed);}
    finally{setBusy(false);onBusyChange?.(false);if(fileInput.current)fileInput.current.value='';}
  }
  return <fieldset className="image-upload" disabled={disabled||busy}><legend>{label||copy.insertImage}</legend>
    {isImageSource(value)&&<div className="upload-preview"><img src={value} alt={copy.imageAlt}/><Button type="button" variant="outline" size="sm" onClick={()=>onChange('')}><Trash2 size={15}/>{copy.removeImage}</Button></div>}
    <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label={copy.upload} onChange={e=>void upload(e.target.files?.[0])}/>
    <Button type="button" variant="outline" onClick={()=>fileInput.current?.click()}>{busy?<LoaderCircle className="animate-spin"/>:<ImagePlus/>}{busy?copy.uploading:copy.upload}</Button><p className="auth-hint">{copy.uploadHint}</p>
    <Label htmlFor={id}>{copy.imageUrl}</Label><Input id={id} inputMode="url" value={value} placeholder="https://…" onChange={e=>onChange(e.target.value)} disabled={disabled||busy}/>
    {error&&<p className="error" role="alert">{error}</p>}
  </fieldset>;
}
