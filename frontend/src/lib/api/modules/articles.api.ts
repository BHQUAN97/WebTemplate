import { apiClient } from '../client';
import type { Article, PaginationParams } from '@/lib/types';

export const articlesApi = {
  getArticles(params?: PaginationParams) {
    return apiClient.get<Article[]>('/articles', params as Record<string, string | number | boolean | undefined>);
  },

  getPublished(params?: PaginationParams) {
    return apiClient.get<Article[]>('/articles/published', params as Record<string, string | number | boolean | undefined>);
  },

  getArticleBySlug(slug: string) {
    return apiClient.get<Article>(`/articles/slug/${slug}`);
  },

  createArticle(data: Partial<Article>) {
    return apiClient.post<Article>('/articles', data);
  },

  updateArticle(id: string, data: Partial<Article>) {
    return apiClient.patch<Article>(`/articles/${id}`, data);
  },

  deleteArticle(id: string) {
    return apiClient.delete<null>(`/articles/${id}`);
  },

  publish(id: string) {
    return apiClient.post<Article>(`/articles/${id}/publish`);
  },

  unpublish(id: string) {
    return apiClient.post<Article>(`/articles/${id}/unpublish`);
  },
};
