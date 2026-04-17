import type { Metadata, ResolvingMetadata } from 'next';
import { CmsPageClient } from './cms-page-client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, ' ')} - WebTemplate`,
    description: `Xem trang ${slug} tren WebTemplate`,
  };
}

/**
 * Dynamic CMS page — render content tu CMS data
 */
export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  return <CmsPageClient slug={slug} />;
}
