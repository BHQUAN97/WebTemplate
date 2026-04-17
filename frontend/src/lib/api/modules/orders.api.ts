import { apiClient } from '../client';
import type { Order, OrderStatus, PaginationParams } from '@/lib/types';

export const ordersApi = {
  getOrders(params?: PaginationParams) {
    return apiClient.get<Order[]>('/orders', params as Record<string, string | number | boolean | undefined>);
  },

  getOrder(id: string) {
    return apiClient.get<Order>(`/orders/${id}`);
  },

  createOrder(data: {
    items: Array<{ product_id: string; variant_id?: string; quantity: number }>;
    shipping_name: string;
    shipping_phone: string;
    shipping_address: string;
    shipping_city: string;
    shipping_district: string;
    shipping_ward: string;
    note?: string;
    payment_method: string;
  }) {
    return apiClient.post<Order>('/orders', data);
  },

  updateOrderStatus(id: string, status: OrderStatus) {
    return apiClient.patch<Order>(`/orders/${id}/status`, { status });
  },

  cancelOrder(id: string, reason?: string) {
    return apiClient.post<Order>(`/orders/${id}/cancel`, { reason });
  },
};
