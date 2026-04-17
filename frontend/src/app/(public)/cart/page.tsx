import type { Metadata } from 'next';
import { CartClient } from './cart-client';

export const metadata: Metadata = {
  title: 'Gio hang - WebTemplate',
  description: 'Xem va quan ly gio hang cua ban.',
};

export default function CartPage() {
  return <CartClient />;
}
