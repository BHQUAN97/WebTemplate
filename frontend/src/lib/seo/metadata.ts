import type { Metadata } from 'next';
import { brand } from '@/lib/config/brand';

/**
 * buildMetadata — helper dung chung de sinh Metadata cho moi route.
 *
 * Tu dong dien:
 *  - title voi template tu brand
 *  - description fallback tu brand neu khong truyen
 *  - Open Graph tags day du
 *  - Twitter Card (summary_large_image)
 *  - canonical URL tu `path`
 */

export interface BuildMetadataInput {
  /** Tieu de trang — se duoc ghep template `%s | {brand.name}` tu root layout */
  title?: string;
  /** Mo ta — neu thieu, dung brand.description */
  description?: string;
  /** Path tuong doi (vd: `/products/abc`) — dung de build canonical va og:url */
  path: string;
  /** URL anh dai dien (tuong doi hoac absolute). Mac dinh `/og-default.png` */
  image?: string;
  /** Loai noi dung Open Graph — mac dinh `website` */
  type?: 'website' | 'article' | 'profile' | 'book';
}

/**
 * Chuyen path/anh tuong doi thanh absolute URL dua tren NEXT_PUBLIC_SITE_URL hoac brand.url.
 */
function absolute(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || brand.url || 'http://localhost:6000').replace(
    /\/$/,
    '',
  );
  const suffix = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${suffix}`;
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { title, description, path, image, type = 'website' } = input;

  const finalDescription = description ?? brand.description;
  const canonicalUrl = absolute(path);
  const imageUrl = absolute(image ?? '/og-default.png');
  const ogTitle = title ?? brand.name;

  return {
    title,
    description: finalDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: ogTitle,
      description: finalDescription,
      url: canonicalUrl,
      siteName: brand.name,
      type,
      locale: 'vi_VN',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: finalDescription,
      images: [imageUrl],
    },
  };
}
