import type { MetadataRoute } from 'next';

/**
 * Robots.txt generator — chi dan cho cong cu tim kiem.
 *
 * Cho phep index toan bo public pages, chan cac duong dan nhay cam:
 *   - /admin, /dashboard: trang quan tri
 *   - /api: route API noi bo
 *   - /auth/: luong dang nhap/dang ky
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:6000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/api', '/auth/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
