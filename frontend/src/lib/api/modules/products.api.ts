import { apiClient } from '../client';
import type { Product, PaginationParams } from '@/lib/types';

export const productsApi = {
  getProducts(params?: PaginationParams) {
    return apiClient.get<Product[]>('/products', params as Record<string, string | number | boolean | undefined>);
  },

  getProduct(id: string) {
    return apiClient.get<Product>(`/products/${id}`);
  },

  getProductBySlug(slug: string) {
    return apiClient.get<Product>(`/products/slug/${slug}`);
  },

  createProduct(data: Partial<Product>) {
    return apiClient.post<Product>('/products', data);
  },

  updateProduct(id: string, data: Partial<Product>) {
    return apiClient.patch<Product>(`/products/${id}`, data);
  },

  deleteProduct(id: string) {
    return apiClient.delete<null>(`/products/${id}`);
  },

  getFeatured() {
    return apiClient.get<Product[]>('/products/featured');
  },
};
