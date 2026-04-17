import { apiClient as api } from '../client';
import type { Review, PaginationParams } from '@/lib/types';

export const reviewsApi = {
  getProductReviews(productId: string, params?: PaginationParams) {
    return api.get<Review[]>(
      `/products/${productId}/reviews`,
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  createReview(data: {
    product_id: string;
    rating: number;
    title?: string;
    comment?: string;
  }) {
    return api.post<Review>('/reviews', data);
  },
};
