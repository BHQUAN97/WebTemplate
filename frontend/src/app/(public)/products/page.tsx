import type { Metadata } from 'next';
import { ProductsClient } from './products-client';

export const metadata: Metadata = {
  title: 'San pham - WebTemplate',
  description:
    'Kham pha bo suu tap san pham da dang voi gia tot nhat. Loc theo danh muc, gia, danh gia.',
};

export default function ProductsPage() {
  return <ProductsClient />;
}
