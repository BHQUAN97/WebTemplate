import type { Metadata } from 'next';
import { CheckoutClient } from './checkout-client';

export const metadata: Metadata = {
  title: 'Thanh toan - WebTemplate',
  description: 'Hoan tat don hang cua ban.',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
