import { apiClient } from '../client';
import type { User, PaginationParams } from '@/lib/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token =
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const usersApi = {
  getUsers(params?: PaginationParams) {
    return apiClient.get<User[]>(
      '/users',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  getUser(id: string) {
    return apiClient.get<User>(`/users/${id}`);
  },

  createUser(data: Partial<User> & { password: string }) {
    return apiClient.post<User>('/users', data);
  },

  updateUser(id: string, data: Partial<User>) {
    return apiClient.patch<User>(`/users/${id}`, data);
  },

  deleteUser(id: string) {
    return apiClient.delete<null>(`/users/${id}`);
  },

  getProfile() {
    return apiClient.get<User>('/users/profile');
  },

  updateProfile(data: Partial<User>) {
    return apiClient.patch<User>('/users/profile', data);
  },

  /**
   * Lấy notification preferences của user hiện tại từ server.
   * Dùng để sync qua nhiều thiết bị.
   */
  getUserPreferences() {
    return apiClient.get<Record<string, boolean>>('/users/me/preferences');
  },

  /**
   * Cập nhật preferences — chỉ gửi các field muốn thay đổi (merge phía BE).
   */
  updateUserPreferences(prefs: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    marketingEmails?: boolean;
    orderUpdates?: boolean;
    securityAlerts?: boolean;
  }) {
    return apiClient.patch<Record<string, boolean>>(
      '/users/me/preferences',
      prefs,
    );
  },

  /**
   * GDPR — tai xuong toan bo du lieu ca nhan cua user duoi dang JSON/ZIP.
   */
  async exportUserData(id: string): Promise<Blob> {
    const res = await fetch(`${API_BASE_URL}/users/${id}/export`, {
      headers: getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ message: 'Không thể tải dữ liệu' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};
