import { apiClient as api } from '../client';
import type { Page } from '@/lib/types';

export const pagesApi = {
  getPageBySlug(slug: string) {
    return api.get<Page>(`/pages/slug/${slug}`);
  },

  getPages() {
    return api.get<Page[]>('/pages');
  },
};
