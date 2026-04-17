import { apiClient } from '../client';
import type { User } from '@/lib/types';

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
}

export const authApi = {
  login(email: string, password: string) {
    return apiClient.post<LoginResponse>('/auth/login', { email, password });
  },

  register(data: { name: string; email: string; password: string }) {
    return apiClient.post<RegisterResponse>('/auth/register', data);
  },

  logout() {
    return apiClient.post<null>('/auth/logout');
  },

  refreshToken() {
    return apiClient.post<{ accessToken: string }>('/auth/refresh');
  },

  forgotPassword(email: string) {
    return apiClient.post<null>('/auth/forgot-password', { email });
  },

  resetPassword(token: string, password: string) {
    return apiClient.post<null>('/auth/reset-password', { token, password });
  },

  changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post<null>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },
};
