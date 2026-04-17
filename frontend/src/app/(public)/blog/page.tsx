import type { Metadata } from 'next';
import { BlogClient } from './blog-client';

export const metadata: Metadata = {
  title: 'Blog - WebTemplate',
  description: 'Doc nhung bai viet moi nhat ve xu huong, meo hay va tin tuc tu WebTemplate.',
};

export default function BlogPage() {
  return <BlogClient />;
}
