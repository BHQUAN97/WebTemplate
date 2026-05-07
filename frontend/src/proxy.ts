import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

/** Route yêu cầu đăng nhập */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/settings',
  '/admin',
];

/** Route auth công khai — đã đăng nhập thì redirect về / */
const PUBLIC_AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-2fa',
  '/verify-email',
];

/**
 * Khớp path với 1 danh sách route, hỗ trợ cả bản có prefix locale.
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
 * Proxy (Next.js 16 — thay thế middleware)
 * Auth gate: /admin, /dashboard, /profile, /settings yêu cầu cookie refreshToken.
 * Đã login → redirect khỏi trang auth.
 *
 * Locale handling: xử lý client-side qua next-intl provider (KHÔNG dùng middleware
 * rewrite vì cấu trúc app/ không dùng [locale] segment — middleware sẽ gây 404 tất
 * cả route trong (auth)/(public)/(dashboard)).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ưu tiên refreshToken (HttpOnly cookie BE set), fallback access_token cũ
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

  return NextResponse.next();
}

export const config = {
  // Match tất cả trừ static files và api
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
