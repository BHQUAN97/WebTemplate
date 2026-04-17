import { apiClient as api } from '../client';
import type { Contact } from '@/lib/types';

export const contactsApi = {
  submit(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }) {
    return api.post<Contact>('/contacts', data);
  },
};
