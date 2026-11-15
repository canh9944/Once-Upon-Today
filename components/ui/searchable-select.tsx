'use client';
import {useId,useRef,useState,type KeyboardEvent} from 'react';
import {Check,ChevronDown} from 'lucide-react';
import {normalizeSearch} from '@/shared/search';

export type SelectOption={value:string;label:string;keywords?:string};
type Props={value:string;options:SelectOption[];onChange:(value:string)=>void;label:string;searchPlaceholder?:string;emptyMessage?:string;disabled?:boolean};
const normalize=normalizeSearch;

export function SearchableSelect({value,options,onChange,label,searchPlaceholder='Search…',emptyMessage='No results',disabled=false}:Props){
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),list=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[active,setActive]=useState(0);
  const filtered=options.filter(option=>normalize(`${option.label} ${option.value} ${option.keywords||''}`).includes(normalize(query.trim())));
  function close(restoreFocus=false){setOpen(false);if(restoreFocus)trigger.current?.focus();}
  function choose(next:string){if(next!==value)onChange(next);close(true);}
  function move(next:number){const index=Math.max(0,Math.min(filtered.length-1,next));setActive(index);list.current?.children[index]?.scrollIntoView({block:'nearest'});}
  function keyDown(event:KeyboardEvent){
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();move(active+(event.key==='ArrowDown'?1:-1));}
    if(event.key==='Enter'){event.preventDefault();if(filtered[active])choose(filtered[active].value);}
  }
  return <div className="searchable-select" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}>
    <button ref={trigger} type="button" className="searchable-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?`${id}-list`:undefined} disabled={disabled} onClick={()=>{setQuery('');setActive(0);setOpen(!open);}} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setQuery('');setActive(0);setOpen(true);}}}><span>{options.find(option=>option.value===value)?.label||label}</span><ChevronDown size={14}/></button>
    {open&&<div className="searchable-select-popover" onKeyDown={keyDown}>
      <input autoFocus role="combobox" aria-label={`${searchPlaceholder} ${label}`} aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list" aria-activedescendant={filtered[active]?`${id}-${active}`:undefined} placeholder={searchPlaceholder} value={query} onChange={event=>{setQuery(event.target.value);setActive(0);list.current?.scrollTo(0,0);}}/>
      <div ref={list} id={`${id}-list`} role="listbox" aria-label={label} className="searchable-select-options">
        {filtered.map((option,index)=><div id={`${id}-${index}`} key={option.value} role="option" aria-selected={option.value===value} className={`searchable-select-option ${index===active?'is-active':''}`} onMouseDown={event=>event.preventDefault()} onMouseMove={()=>setActive(index)} onClick={()=>choose(option.value)}><span>{option.label}</span>{option.value===value&&<Check size={14}/>}</div>)}
      </div>
      {!filtered.length&&<p className="searchable-select-empty" role="status">{emptyMessage}</p>}
    </div>}
  </div>;
}
