import type { Metadata } from 'next';
import { CartClient } from './cart-client';

export const metadata: Metadata = {
  title: 'Giỏ hàng — Tech Store Demo',
  description: 'Xem va Quản lý Giỏ hàng cua ban.',
};

export default function CartPage() {
  return <CartClient />;
}
