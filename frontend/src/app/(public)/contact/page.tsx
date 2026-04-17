import type { Metadata } from 'next';
import { ContactClient } from './contact-client';

export const metadata: Metadata = {
  title: 'Lien he - WebTemplate',
  description:
    'Lien he voi WebTemplate — gui yeu cau, cau hoi hoac phan hoi cua ban.',
};

export default function ContactPage() {
  return <ContactClient />;
}
