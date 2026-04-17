import type { Metadata } from 'next';
import { BlogClient } from './blog-client';
import { brand } from '@/lib/config/brand';

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Blog - ${brand.name}`,
  description: `Doc nhung bai viet moi nhat ve xu huong, meo hay va tin tuc tu ${brand.name}.`,
  openGraph: {
    title: `Blog - ${brand.name}`,
    description: brand.description,
    url: `${brand.url}/blog`,
  },
};

export default function BlogPage() {
  return <BlogClient />;
}
