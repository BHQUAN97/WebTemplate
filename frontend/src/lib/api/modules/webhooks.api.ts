import { apiClient } from '../client';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret?: string;
  is_active: boolean;
  max_retries: number;
  last_triggered_at: string | null;
  success_count: number;
  failure_count: number;
  success_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  status: 'success' | 'failed' | 'pending';
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

export interface CreateWebhookDto {
  url: string;
  events: string[];
  is_active?: boolean;
  max_retries?: number;
}

export type UpdateWebhookDto = Partial<CreateWebhookDto>;

export const webhooksApi = {
  list(params?: { page?: number; limit?: number; search?: string }) {
    return apiClient.get<Webhook[]>(
      '/admin/webhooks',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  get(id: string) {
    return apiClient.get<Webhook>(`/admin/webhooks/${id}`);
  },

  create(dto: CreateWebhookDto) {
    return apiClient.post<Webhook>('/admin/webhooks', dto);
  },

  update(id: string, dto: UpdateWebhookDto) {
    return apiClient.patch<Webhook>(`/admin/webhooks/${id}`, dto);
  },

  delete(id: string) {
    return apiClient.delete<null>(`/admin/webhooks/${id}`);
  },

  test(id: string) {
    return apiClient.post<{ success: boolean; response_status?: number }>(
      `/admin/webhooks/${id}/test`,
      {},
    );
  },

  toggle(id: string, is_active: boolean) {
    return apiClient.patch<Webhook>(`/admin/webhooks/${id}`, { is_active });
  },

  regenerateSecret(id: string) {
    return apiClient.post<{ secret: string }>(
      `/admin/webhooks/${id}/regenerate-secret`,
      {},
    );
  },

  deliveries(id: string, params?: { page?: number; limit?: number }) {
    return apiClient.get<WebhookDelivery[]>(
      `/admin/webhooks/${id}/deliveries`,
      params as Record<string, number | undefined>,
    );
  },

  retryDelivery(id: string, deliveryId: string) {
    return apiClient.post<WebhookDelivery>(
      `/admin/webhooks/${id}/deliveries/${deliveryId}/retry`,
      {},
    );
  },
};
