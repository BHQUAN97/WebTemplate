import type { Metadata } from 'next';
import { BlogPostClient } from './blog-post-client';
import { articlesApi } from '@/lib/api/modules/articles.api';
import { brand } from '@/lib/config/brand';
import type { Article } from '@/lib/types';

type Props = {
  params: Promise<{ slug: string }>;
};

export const revalidate = 300;

/**
 * Prerender top 20 articles moi nhat — fallback neu API loi.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const articles = await articlesApi.getPublished({ limit: 20 });
    const list = Array.isArray(articles) ? articles : [];
    return list
      .map((a: Article) => ({ slug: a.slug }))
      .filter((p): p is { slug: string } => typeof p.slug === 'string' && p.slug.length > 0);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const article = await articlesApi.getArticleBySlug(slug);
    if (article) {
      const title = `${article.title} - Blog ${brand.name}`;
      const description = article.excerpt ?? `${brand.name} - bai viet: ${article.title}`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `${brand.url}/blog/${article.slug}`,
          images: article.featured_image ? [{ url: article.featured_image }] : undefined,
          type: 'article',
        },
      };
    }
  } catch {
    // ignore
  }

  return {
    title: `${slug.replace(/-/g, ' ')} - Blog ${brand.name}`,
    description: 'Doc bai viet chi tiet tren ' + brand.name + ' Blog',
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostClient slug={slug} />;
}
