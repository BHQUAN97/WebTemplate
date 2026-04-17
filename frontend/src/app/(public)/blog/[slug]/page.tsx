import type { Metadata, ResolvingMetadata } from 'next';
import { BlogPostClient } from './blog-post-client';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `${slug.replace(/-/g, ' ')} - Blog WebTemplate`,
    description: 'Doc bai viet chi tiet tren WebTemplate Blog',
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  return <BlogPostClient slug={slug} />;
}
