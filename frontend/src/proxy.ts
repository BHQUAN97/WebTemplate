import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

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
 * Auth gate: /admin, /dashboard, /profile, /settings yeu cau cookie refreshToken.
 * Da login → redirect khoi trang auth.
 *
 * Locale handling: xu ly client-side qua next-intl provider (KHONG dung middleware
 * rewrite vi cau truc app/ khong dung [locale] segment — middleware se gay 404 tat
 * ca route trong (auth)/(public)/(dashboard)).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  return NextResponse.next();
}

export const config = {
  // Match tat ca tru static files va api
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
