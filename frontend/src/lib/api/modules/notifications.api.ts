import { apiClient } from '../client';
import type { Notification } from '@/lib/types';

export const notificationsApi = {
  getNotifications(params?: { page?: number; limit?: number }) {
    return apiClient.get<Notification[]>('/notifications', params as Record<string, number | undefined>);
  },

  getUnreadCount() {
    return apiClient.get<{ count: number }>('/notifications/unread-count');
  },

  markRead(id: string) {
    return apiClient.patch<Notification>(`/notifications/${id}/read`);
  },

  markAllRead() {
    return apiClient.post<null>('/notifications/read-all');
  },
};
