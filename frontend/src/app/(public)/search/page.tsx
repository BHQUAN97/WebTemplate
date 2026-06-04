import type { Metadata } from 'next';
import { SearchClient } from './search-client';

export const metadata: Metadata = {
  title: 'Tìm kiếm — Tech Store Demo',
  description: 'Tìm kiếm sản phẩm và bài viết trên Tech Store Demo.',
};

export default function SearchPage() {
  return <SearchClient />;
}
