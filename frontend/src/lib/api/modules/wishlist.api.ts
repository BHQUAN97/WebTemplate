import { apiClient } from '../client';

export interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  images: { url: string; alt: string }[] | null;
  is_active: boolean;
}

export interface WishlistItem {
  id: string;
  product_id: string;
  added_at: string;
  product: WishlistProduct | null;
}

export const wishlistApi = {
  getWishlist() {
    return apiClient.get<WishlistItem[]>('/wishlist');
  },
  add(productId: string) {
    return apiClient.post<WishlistItem>(`/wishlist/${productId}`, {});
  },
  remove(productId: string) {
    return apiClient.delete<null>(`/wishlist/${productId}`);
  },
  check(productId: string) {
    return apiClient.get<{ inWishlist: boolean }>(`/wishlist/check/${productId}`);
  },
  getCount() {
    return apiClient.get<{ count: number }>('/wishlist/count');
  },
};
