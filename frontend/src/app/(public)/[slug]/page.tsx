import type { Metadata } from 'next';
import { CmsPageClient } from './cms-page-client';
import { pagesApi } from '@/lib/api/modules/pages.api';
import { brand } from '@/lib/config/brand';
import type { Page } from '@/lib/types';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

/**
 * Prerender top 20 CMS pages — fallback empty neu API loi.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const pages = await pagesApi.getPages();
    const list = Array.isArray(pages) ? pages : [];
    return list
      .map((p: Page) => ({ slug: p.slug }))
      .filter((p): p is { slug: string } => typeof p.slug === 'string' && p.slug.length > 0)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const page = await pagesApi.getPageBySlug(slug);
    if (page) {
      const title = page.meta_title ?? `${page.title} - ${brand.name}`;
      const description = page.meta_description ?? `${page.title} tren ${brand.name}`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `${brand.url}/${page.slug}`,
        },
      };
    }
  } catch {
    // ignore
  }

  return {
    title: `${slug.replace(/-/g, ' ')} - ${brand.name}`,
    description: `Xem trang ${slug} tren ${brand.name}`,
  };
}

/**
 * Dynamic CMS page — render content tu CMS data
 */
export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  return <CmsPageClient slug={slug} />;
}
