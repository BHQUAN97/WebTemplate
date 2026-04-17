import { apiClient } from '../client';
import type { Category, PaginationParams } from '@/lib/types';

export const categoriesApi = {
  getCategories(params?: PaginationParams) {
    return apiClient.get<Category[]>('/categories', params as Record<string, string | number | boolean | undefined>);
  },

  getCategoryTree() {
    return apiClient.get<Category[]>('/categories/tree');
  },

  createCategory(data: Partial<Category>) {
    return apiClient.post<Category>('/categories', data);
  },

  updateCategory(id: string, data: Partial<Category>) {
    return apiClient.patch<Category>(`/categories/${id}`, data);
  },

  deleteCategory(id: string) {
    return apiClient.delete<null>(`/categories/${id}`);
  },

  reorder(items: Array<{ id: string; position: number }>) {
    return apiClient.post<null>('/categories/reorder', { items });
  },
};
