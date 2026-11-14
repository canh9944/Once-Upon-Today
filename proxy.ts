import {NextResponse, type NextRequest} from 'next/server';
import {isLocale} from './lib/i18n';
import {countryLocale,resolveCountry} from './lib/country-selection';
export function proxy(request:NextRequest){
  const segment=request.nextUrl.pathname.split('/')[1];
  const headers=new Headers(request.headers);
  const routeLocale=isLocale(segment)?segment:'en';
  const locale=request.nextUrl.pathname.split('/')[2]==='admin'?routeLocale:countryLocale(resolveCountry(routeLocale,request.nextUrl.searchParams.get('country')));
  headers.set('x-once-locale',locale);
  return NextResponse.next({request:{headers}});
}
export const config={matcher:['/((?!api|_next/static|_next/image|favicon.ico).*)']};
