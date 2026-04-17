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
        .catch(() => ({ message: 'Khong the tai du lieu' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};
