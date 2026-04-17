import type { MetadataRoute } from 'next';

/**
 * Dynamic sitemap generator.
 *
 * Bao gom:
 *  - Cac trang tinh (home, about, contact, faq, blog, products)
 *  - Cac san pham lay tu API /api/products/sitemap
 *  - Cac bai viet lay tu API /api/articles/sitemap
 *
 * Neu API loi / khong kha dung, fallback ve mang rong — khong block build.
 */

type SitemapEntry = {
  slug: string;
  updatedAt?: string;
  lastModified?: string;
  updated_at?: string;
};

// Luon re-validate sitemap theo ISR ngan de cap nhat san pham moi
export const revalidate = 3600; // 1 gio

/**
 * Goi endpoint backend de lay danh sach slug — co timeout va error swallow.
 */
async function fetchSitemapEntries(path: string): Promise<SitemapEntry[]> {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${apiBase}${path}`, {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });

    clearTimeout(timeout);

    if (!res.ok) return [];

    const json: unknown = await res.json();

    // Chap nhan ca { data: [...] } hoac truc tiep [...]
    const data = Array.isArray(json)
      ? json
      : typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown }).data)
        ? ((json as { data: SitemapEntry[] }).data)
        : [];

    return data.filter(
      (item): item is SitemapEntry =>
        typeof item === 'object' && item !== null && typeof (item as SitemapEntry).slug === 'string',
    );
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:6000';
  const now = new Date();

  // Static pages — priority theo muc do quan trong
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/products`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
  ];

  // Dynamic pages — fetch song song
  const [products, articles] = await Promise.all([
    fetchSitemapEntries('/api/products/sitemap'),
    fetchSitemapEntries('/api/articles/sitemap'),
  ]);

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/products/${p.slug}`,
    lastModified: p.updatedAt ?? p.updated_at ?? p.lastModified ?? now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${baseUrl}/blog/${a.slug}`,
    lastModified: a.updatedAt ?? a.updated_at ?? a.lastModified ?? now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...productEntries, ...articleEntries];
}
