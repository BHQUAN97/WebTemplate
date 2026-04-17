import { apiClient as api } from '../client';

export interface CartResponse {
  id: string;
  items: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    quantity: number;
    price: number;
  }>;
}

export const cartApi = {
  getCart() {
    return api.get<CartResponse>('/cart');
  },

  addItem(data: { product_id: string; variant_id?: string; quantity: number }) {
    return api.post<CartResponse>('/cart/items', data);
  },

  updateItem(itemId: string, quantity: number) {
    return api.patch<CartResponse>(`/cart/items/${itemId}`, { quantity });
  },

  removeItem(itemId: string) {
    return api.delete<null>(`/cart/items/${itemId}`);
  },

  applyPromo(code: string) {
    return api.post<{ discount: number; message: string }>('/cart/promo', { code });
  },

  clearCart() {
    return api.delete<null>('/cart');
  },
};
