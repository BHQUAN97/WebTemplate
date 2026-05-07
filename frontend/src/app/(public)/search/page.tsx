import type { Metadata } from 'next';
import { SearchClient } from './search-client';

export const metadata: Metadata = {
  title: 'Tìm kiếm - WebTemplate',
  description: 'Tìm kiếm Sản phẩm va Bài viết tren WebTemplate.',
};

export default function SearchPage() {
  return <SearchClient />;
}
