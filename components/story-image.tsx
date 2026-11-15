'use client';
import {useState} from 'react';

const fallback='/images/story-landscape.svg';

/** Preserve editor images; missing or unavailable covers get a local illustration. */
export default function StoryImage({src,alt,className,priority=false}:{src?:string;alt:string;className?:string;priority?:boolean}){
  const [failedSrc,setFailedSrc]=useState<string>();
  const image=src?.trim();
  const resolved=!image||failedSrc===image?fallback:image;
  return <img className={className} src={resolved} alt={alt} width={1200} height={800} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} decoding="async" onError={resolved!==fallback?()=>setFailedSrc(image):undefined}/>;
}
