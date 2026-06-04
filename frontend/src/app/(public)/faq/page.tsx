import type { Metadata } from 'next';
import { FaqClient } from './faq-client';

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp — Tech Store Demo',
  description:
    'Tim cau Trả lời cho nhung Câu hỏi thuong gap ve Sản phẩm, Đơn hàng, Thanh toán va Giao hàng.',
};

export default function FaqPage() {
  return <FaqClient />;
}
