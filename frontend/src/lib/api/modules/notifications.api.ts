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

  /**
   * Danh dau tat ca da doc — backend canonical la PATCH
   * (POST alias duoc giu ben BE de tuong thich nguoc).
   */
  markAllRead() {
    return apiClient.patch<null>('/notifications/read-all');
  },

  /**
   * Xoa bulk tat ca notifications da doc cua user hien tai.
   * Tra ve so luong bi xoa.
   */
  deleteReadBulk() {
    return apiClient.delete<{ deletedCount: number }>('/notifications/read');
  },
};
