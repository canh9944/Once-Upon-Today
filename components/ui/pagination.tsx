import * as React from 'react';
import Link from 'next/link';
import {ChevronLeft,ChevronRight,MoreHorizontal} from 'lucide-react';
import {cn} from '@/lib/utils';
import {buttonVariants,type ButtonProps} from './button';

// shadcn/ui Pagination, using its documented Next.js Link adaptation.
function Pagination({className,...props}:React.ComponentProps<'nav'>){return <nav role="navigation" data-slot="pagination" className={cn('mx-auto flex w-full justify-center',className)} {...props}/>;}
function PaginationContent({className,...props}:React.ComponentProps<'ul'>){return <ul data-slot="pagination-content" className={cn('flex flex-row items-center gap-1',className)} {...props}/>;}
function PaginationItem(props:React.ComponentProps<'li'>){return <li data-slot="pagination-item" {...props}/>;}
type PaginationLinkProps={isActive?:boolean;size?:ButtonProps['size']} & React.ComponentProps<typeof Link>;
function PaginationLink({className,isActive,size='icon',...props}:PaginationLinkProps){return <Link aria-current={isActive?'page':undefined} data-slot="pagination-link" data-active={isActive} className={cn(buttonVariants({variant:isActive?'outline':'ghost',size}),className)} {...props}/>;}
function PaginationButton({className,isActive,...props}:React.ComponentProps<'button'> & {isActive?:boolean}){return <button type="button" aria-current={isActive?'page':undefined} data-slot="pagination-link" data-active={isActive} className={cn(buttonVariants({variant:isActive?'outline':'ghost',size:'icon'}),className)} {...props}/>;}
function PaginationPrevious({className,children,...props}:PaginationLinkProps){return <PaginationLink size="default" className={cn('gap-1 px-2.5',className)} {...props}><ChevronLeft/><span className="hidden sm:block">{children}</span></PaginationLink>;}
function PaginationNext({className,children,...props}:PaginationLinkProps){return <PaginationLink size="default" className={cn('gap-1 px-2.5',className)} {...props}><span className="hidden sm:block">{children}</span><ChevronRight/></PaginationLink>;}
function PaginationEllipsis({className,children,...props}:React.ComponentProps<'span'>){return <span data-slot="pagination-ellipsis" className={cn('flex size-9 items-center justify-center',className)} {...props}><MoreHorizontal className="size-4" aria-hidden="true"/><span className="sr-only">{children}</span></span>;}
export {Pagination,PaginationContent,PaginationItem,PaginationLink,PaginationButton,PaginationPrevious,PaginationNext,PaginationEllipsis};
