import { apiClient as api } from '../client';

export interface SearchResult {
  type: 'product' | 'article';
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  price?: number;
  category?: string;
}

export const searchApi = {
  search(query: string, params?: { type?: string; page?: number; limit?: number }) {
    return api.get<SearchResult[]>('/search', {
      q: query,
      ...params,
    } as Record<string, string | number | boolean | undefined>);
  },
};
