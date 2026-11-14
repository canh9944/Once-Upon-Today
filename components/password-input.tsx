'use client';
import {useState,type ComponentProps} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
export function PasswordInput({showLabel,hideLabel,...props}:Omit<ComponentProps<typeof Input>,'type'>&{showLabel:string;hideLabel:string}){
  const [visible,setVisible]=useState(false);
  return <div className="password-field"><Input {...props} type={visible?'text':'password'} className="pr-12"/><Button type="button" variant="ghost" size="icon" className="password-toggle" aria-label={visible?hideLabel:showLabel} aria-pressed={visible} onClick={()=>setVisible(!visible)} disabled={props.disabled}>{visible?<EyeOff/>:<Eye/>}</Button></div>;
}
