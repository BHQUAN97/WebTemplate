import { apiClient } from '../client';
import type { User, PaginationParams } from '@/lib/types';

export const usersApi = {
  getUsers(params?: PaginationParams) {
    return apiClient.get<User[]>('/users', params as Record<string, string | number | boolean | undefined>);
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
};
