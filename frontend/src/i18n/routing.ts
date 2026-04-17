import { defineRouting } from 'next-intl/routing';

/**
 * Cau hinh routing da ngon ngu cho next-intl.
 * - vi la locale mac dinh (khong co prefix)
 * - en co prefix /en (as-needed)
 */
export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];
