'use client';
import {useState} from 'react';
import {Check,ChevronDown} from 'lucide-react';
import {normalizeSearch} from '@/shared/search';
import {Button} from './button';
import {Popover,PopoverContent,PopoverTrigger} from './popover';
import {Command,CommandInput,CommandList,CommandEmpty,CommandGroup,CommandItem} from './command';

export type SelectOption={value:string;label:string;keywords?:string};
type Props={value:string;options:SelectOption[];onChange:(value:string)=>void;label:string;searchPlaceholder:string;emptyMessage?:string;disabled?:boolean};

/** shadcn Combobox composition shared by the public filters and editorial forms. */
export function SearchableSelect({value,options,onChange,label,searchPlaceholder,emptyMessage='No results',disabled=false}:Props){
  const [open,setOpen]=useState(false);
  return <div className="searchable-select"><Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><Button type="button" variant="outline" role="combobox" className="searchable-select-trigger" aria-label={label} aria-expanded={open} disabled={disabled}><span>{options.find(option=>option.value===value)?.label||label}</span><ChevronDown size={14}/></Button></PopoverTrigger>
    <PopoverContent className="searchable-select-popover" align="start" collisionPadding={16}>
      <Command label={label} filter={(option,search,keywords)=>normalizeSearch(`${option} ${keywords?.join(' ')||''}`).includes(normalizeSearch(search))?1:0}>
        <div className="filter-search-field"><CommandInput appearance="search" aria-label={`${searchPlaceholder} ${label}`} placeholder={searchPlaceholder}/></div>
        <CommandList className="searchable-select-options" aria-label={label}><CommandEmpty>{emptyMessage}</CommandEmpty><CommandGroup>
          {options.map(option=><CommandItem key={option.value} value={option.value} keywords={[option.label,option.keywords||'']} className="searchable-select-option" onSelect={()=>{if(option.value!==value)onChange(option.value);setOpen(false);}}><span>{option.label}</span>{option.value===value&&<Check size={14}/>}</CommandItem>)}
        </CommandGroup></CommandList>
      </Command>
    </PopoverContent>
  </Popover></div>;
}
