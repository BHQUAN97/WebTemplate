import type { Metadata } from 'next';
import { FaqClient } from './faq-client';

export const metadata: Metadata = {
  title: 'Cau hoi thuong gap - WebTemplate',
  description:
    'Tim cau tra loi cho nhung cau hoi thuong gap ve san pham, don hang, thanh toan va giao hang.',
};

export default function FaqPage() {
  return <FaqClient />;
}
