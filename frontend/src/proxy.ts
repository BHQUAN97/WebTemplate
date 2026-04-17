import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Middleware next-intl — xu ly locale routing (cookie NEXT_LOCALE, prefix /en, ...)
const intlMiddleware = createIntlMiddleware(routing);

/**
 * Proxy (Next.js 16 — thay the middleware)
 * Chain 2 lop:
 *   1. Auth: bao ve /admin, /dashboard va redirect /login khi da dang nhap
 *   2. i18n: next-intl xu ly locale (cookie/prefix)
 * Response tra ve la merge cua ca hai.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Lop 1: auth guard ---
  const token =
    request.cookies.get('access_token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');

  const protectedPaths = ['/admin', '/dashboard'];
  const isProtected = protectedPaths.some((path) =>
    pathname.startsWith(path) ||
    routing.locales.some((l) => pathname.startsWith(`/${l}${path}`)),
  );

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const authPaths = ['/login', '/register'];
  const isAuthPage = authPaths.some((path) =>
    pathname.startsWith(path) ||
    routing.locales.some((l) => pathname.startsWith(`/${l}${path}`)),
  );

  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // --- Lop 2: next-intl locale middleware ---
  return intlMiddleware(request);
}

export const config = {
  // Match tat ca tru static files va api
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
