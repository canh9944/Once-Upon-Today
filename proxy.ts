import {NextResponse, type NextRequest} from 'next/server';
import {isContentLanguage,isLocale} from './shared/domain';
import {resolveLanguage,languageLocale} from './lib/language-selection';
export function proxy(request:NextRequest){
  const segment=request.nextUrl.pathname.split('/')[1];
  if(isContentLanguage(segment)&&!isLocale(segment)){
    const target=request.nextUrl.clone();
    target.pathname='/en'+target.pathname.slice(segment.length+1);
    return NextResponse.redirect(target,308);
  }
  const headers=new Headers(request.headers);
  const routeLocale=isLocale(segment)?segment:'en';
  const locale=request.nextUrl.pathname.split('/')[2]==='admin'?routeLocale:languageLocale(routeLocale,resolveLanguage(routeLocale,request.nextUrl.searchParams.get('lang'),request.nextUrl.searchParams.get('country')));
  headers.set('x-once-locale',locale);
  return NextResponse.next({request:{headers}});
}
export const config={matcher:['/((?!api|_next/static|_next/image|favicon.ico).*)']};
