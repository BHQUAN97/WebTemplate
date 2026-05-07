import type { Metadata } from 'next';
import { FaqClient } from './faq-client';

export const metadata: Metadata = {
  title: 'Câu hỏi thuong gap - WebTemplate',
  description:
    'Tim cau Trả lời cho nhung Câu hỏi thuong gap ve Sản phẩm, Đơn hàng, Thanh toán va Giao hàng.',
};

export default function FaqPage() {
  return <FaqClient />;
}
