import type { Metadata } from 'next';
import { SearchClient } from './search-client';

export const metadata: Metadata = {
  title: 'Tim kiem - WebTemplate',
  description: 'Tim kiem san pham va bai viet tren WebTemplate.',
};

export default function SearchPage() {
  return <SearchClient />;
}
