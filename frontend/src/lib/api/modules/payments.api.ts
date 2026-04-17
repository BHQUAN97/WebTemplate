import { apiClient } from '../client';

/**
 * API module cho thanh toan — tao payment va lay chi tiet.
 * Backend wraps response trong { success, data, message }, tuong tu cac module khac.
 */
export const paymentsApi = {
  createPayment(
    orderId: string,
    method: 'cod' | 'bank_transfer' | 'vnpay' | 'momo' | 'stripe',
  ) {
    return apiClient.post<{
      payment: { id: string; status: string };
      payment_url: string | null;
    }>('/payments', { order_id: orderId, method });
  },

  getPayment(id: string) {
    return apiClient.get<{
      id: string;
      status: string;
      amount: number;
      currency: string;
      transaction_id?: string | null;
    }>(`/payments/${id}`);
  },
};
