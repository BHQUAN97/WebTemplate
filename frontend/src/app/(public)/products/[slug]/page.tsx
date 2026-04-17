import type { Metadata, ResolvingMetadata } from 'next';
import { ProductDetailClient } from './product-detail-client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  // Co the fetch product data cho SEO
  return {
    title: `${slug.replace(/-/g, ' ')} - WebTemplate`,
    description: `Xem chi tiet san pham tai WebTemplate`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
