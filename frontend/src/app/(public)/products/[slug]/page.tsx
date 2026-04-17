import type { Metadata } from 'next';
import { ProductDetailClient } from './product-detail-client';
import { productsApi } from '@/lib/api/modules/products.api';
import { brand } from '@/lib/config/brand';
import type { Product } from '@/lib/types';

type Props = {
  params: Promise<{ slug: string }>;
};

// ISR — revalidate moi 5 phut
export const revalidate = 300;

/**
 * Prerender top 20 slug luc build — fallback empty neu API loi.
 */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const products = await productsApi.getProducts({ limit: 20 });
    const list = Array.isArray(products) ? products : [];
    return list
      .map((p: Product) => ({ slug: p.slug }))
      .filter((p): p is { slug: string } => typeof p.slug === 'string' && p.slug.length > 0);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  // Thu fetch product de sinh metadata chinh xac; fallback slug formatted.
  try {
    const product = await productsApi.getProductBySlug(slug);
    if (product) {
      const title = `${product.name} - ${brand.name}`;
      const description =
        product.short_description ??
        product.description?.slice(0, 160) ??
        `Chi tiet san pham ${product.name}`;
      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `${brand.url}/products/${product.slug}`,
          images: product.images?.[0]?.url ? [{ url: product.images[0].url }] : undefined,
        },
      };
    }
  } catch {
    // ignore
  }

  return {
    title: `${slug.replace(/-/g, ' ')} - ${brand.name}`,
    description: 'Xem chi tiet san pham tai ' + brand.name,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
