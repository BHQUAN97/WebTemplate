import type { Metadata } from 'next';
import { ProductsClient } from './products-client';
import { brand } from '@/lib/config/brand';

// ISR — refresh mo moi 5 phut
export const revalidate = 300;

export const metadata: Metadata = {
  title: `San pham - ${brand.name}`,
  description:
    'Kham pha bo suu tap san pham da dang voi gia tot nhat. Loc theo danh muc, gia, danh gia.',
  openGraph: {
    title: `San pham - ${brand.name}`,
    description: brand.description,
    url: `${brand.url}/products`,
  },
};

export default function ProductsPage() {
  return <ProductsClient />;
}
