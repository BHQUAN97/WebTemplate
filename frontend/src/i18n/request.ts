import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { routing } from './routing';

/**
 * Cau hinh server-side cho next-intl.
 * Uu tien locale theo thu tu:
 *   1. Cookie NEXT_LOCALE (user da chon)
 *   2. Accept-Language header (browser)
 *   3. defaultLocale (vi)
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const acceptLanguage = headerStore.get('accept-language') ?? '';

  // Detect tu Accept-Language neu khong co cookie
  const detected = acceptLanguage
    .split(',')
    .map((entry) => entry.split(';')[0].trim().toLowerCase().slice(0, 2))
    .find((code) => (routing.locales as readonly string[]).includes(code));

  const locale =
    cookieLocale && (routing.locales as readonly string[]).includes(cookieLocale)
      ? cookieLocale
      : (detected ?? routing.defaultLocale);

  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
