import type { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Thanh toán — Tech Store Demo',
  description: 'Hoan tat Đơn hàng cua ban.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
