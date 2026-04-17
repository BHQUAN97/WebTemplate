import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Middleware next-intl — xu ly locale routing (cookie NEXT_LOCALE, prefix /en, ...)
const intlMiddleware = createIntlMiddleware(routing);

/** Route yeu cau dang nhap */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/admin',
];

/** Route auth cong khai — da dang nhap thi redirect ve / */
const PUBLIC_AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-2fa',
  '/verify-email',
];

/**
 * Khop path voi 1 danh sach route, ho tro ca ban co prefix locale.
 */
function matchRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (r) =>
      pathname === r ||
      pathname.startsWith(r + '/') ||
      pathname.startsWith(r + '?') ||
      routing.locales.some(
        (l) =>
          pathname === `/${l}${r}` ||
          pathname.startsWith(`/${l}${r}/`) ||
          pathname.startsWith(`/${l}${r}?`),
      ),
  );
}

/**
 * Proxy (Next.js 16 — thay the middleware)
 * Chain 2 lop:
 *   1. Auth: gate /admin, /dashboard, /profile, /settings + redirect khoi trang auth neu da login
 *   2. i18n: next-intl xu ly locale (cookie/prefix)
 * Su dung cookie refreshToken (HttpOnly, BE set khi login) de detect session —
 * access_token co the chi luu client-side nen middleware khong doc duoc.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Lop 1: auth guard ---
  // Uu tien refreshToken (HttpOnly cookie BE set), fallback access_token cu
  const hasSession =
    !!request.cookies.get('refreshToken')?.value ||
    !!request.cookies.get('access_token')?.value ||
    !!request.headers.get('authorization');

  if (matchRoute(pathname, PROTECTED_ROUTES) && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set(
      'redirect',
      pathname + request.nextUrl.search,
    );
    return NextResponse.redirect(loginUrl);
  }

  if (matchRoute(pathname, PUBLIC_AUTH_ROUTES) && hasSession) {
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
