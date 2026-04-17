import { apiClient as api } from '../client';
import type { FAQ } from '@/lib/types';

export const faqApi = {
  getFaqs(params?: { search?: string; category?: string }) {
    return api.get<FAQ[]>('/faqs', params as Record<string, string | number | boolean | undefined>);
  },

  markHelpful(id: string, helpful: boolean) {
    return api.post<null>(`/faqs/${id}/feedback`, { helpful });
  },
};
