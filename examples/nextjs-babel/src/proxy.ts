// TODO: abstract this away into @saykit/react/server, @saykit/next or something

import { type NextRequest, NextResponse } from 'next/server';
import saykitConfig from '../saykit.config';

export default function proxy(request: NextRequest) {
  let respondWith = NextResponse.next();

  const defaultLocale = saykitConfig.sourceLocale;
  let pathLocale = fromUrlPathname(request.nextUrl.pathname);
  if (pathLocale && !saykitConfig.locales.includes(pathLocale))
    pathLocale = undefined;

  if (pathLocale === defaultLocale) {
    // Redirect /{defaultLocale} to /
    request.nextUrl.pathname = request.nextUrl.pathname //
      .replace(`/${defaultLocale}`, '');
    respondWith = NextResponse.redirect(request.nextUrl);
  }
  //
  else if (!pathLocale) {
    let cookieLocale = fromRequestCookies(request.cookies) ?? defaultLocale;
    if (!saykitConfig.locales.includes(cookieLocale))
      cookieLocale = defaultLocale;

    request.nextUrl.pathname = `/${cookieLocale}${request.nextUrl.pathname}`;
    if (cookieLocale === defaultLocale) {
      // Rewrite / to /{defaultLocale}
      respondWith = NextResponse.rewrite(request.nextUrl);
    } else {
      // Redirect / to /{cookieLocale}
      respondWith = NextResponse.redirect(request.nextUrl);
    }
  }

  respondWith.cookies.set(
    'x-preferred-locale', //
    pathLocale ?? defaultLocale,
    { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax' },
  );

  return respondWith;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

const LOCALE = /^[a-z]{2,3}(-[A-Z][a-z]+)?(-[A-Z]{2}|\d{3})?$/;

function fromUrlPathname(pathname: string, partIndex = 0) {
  const value = pathname.split('/')[partIndex * 2 + 1];
  if (value?.match(LOCALE)) return value;
  return undefined;
}

function fromRequestCookies(
  cookies: NextRequest['cookies'],
  key = 'x-preferred-locale',
) {
  const value = cookies.get(key)?.value;
  if (value?.match(LOCALE)) return value;
  return undefined;
}
