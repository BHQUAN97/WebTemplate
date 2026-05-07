import type { Metadata } from 'next';
import { ContactClient } from './contact-client';

export const metadata: Metadata = {
  title: 'Lien he - WebTemplate',
  description:
    'Liên hệ với WebTemplate — gửi yêu cầu, câu hỏi hoặc phản hồi của bạn.',
};

export default function ContactPage() {
  return <ContactClient />;
}
