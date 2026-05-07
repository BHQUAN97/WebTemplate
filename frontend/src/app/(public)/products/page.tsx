import type { Metadata } from 'next';
import { ProductsClient } from './products-client';
import { brand } from '@/lib/config/brand';

// ISR — refresh mo moi 5 phut
export const revalidate = 300;

export const metadata: Metadata = {
  title: `Sản phẩm - ${brand.name}`,
  description:
    'Khám pha bo suu tap Sản phẩm da dang voi gia tot nhat. Loc theo Danh mục, gia, Đánh giá.',
  openGraph: {
    title: `Sản phẩm - ${brand.name}`,
    description: brand.description,
    url: `${brand.url}/products`,
  },
};

export default function ProductsPage() {
  return <ProductsClient />;
}
