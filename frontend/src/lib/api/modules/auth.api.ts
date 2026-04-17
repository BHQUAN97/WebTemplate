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

export interface LoginPayload {
  email: string;
  password: string;
  /** TOTP 6 chu so hoac backup code 8 ky tu — BE yeu cau khi 2FA enabled */
  totp_code?: string;
  /** FE-only flag, BE co the ignore — dung de tinh thoi gian session */
  remember?: boolean;
}

export const authApi = {
  /**
   * Dang nhap. Neu BE tra error code TWO_FACTOR_REQUIRED → FE chuyen sang
   * trang /verify-2fa, user nhap code roi goi lai login voi totp_code.
   */
  login(payload: LoginPayload | string, password?: string) {
    // Back-compat: goi login(email, password) van work
    const body: LoginPayload =
      typeof payload === 'string'
        ? { email: payload, password: password ?? '' }
        : payload;
    return apiClient.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body,
      skipAuthRefresh: true,
    });
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

  /** Lay profile cua user dang dang nhap */
  me() {
    return apiClient.get<User>('/users/me');
  },

  /**
   * Verify 2FA trong flow login — FE goi lai /auth/login voi totp_code.
   * BE hien khong co endpoint rieng cho verify-login — dung login flow.
   */
  verify2fa(email: string, password: string, code: string) {
    return apiClient.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password, totp_code: code },
      skipAuthRefresh: true,
    });
  },

  /**
   * Resend 2FA code — BE co the chua co endpoint nay (TOTP thi khong can resend).
   * Giu de FE su dung neu BE sau nay them email OTP fallback.
   */
  resend2faCode() {
    return apiClient.post<null>('/auth/2fa/resend', {});
  },

  /** Xac thuc email tu token gui qua email */
  verifyEmail(token: string) {
    return apiClient.post<null>('/auth/verify-email', { token });
  },

  /** Gui lai email xac thuc */
  resendVerificationEmail(email: string) {
    return apiClient.post<null>('/auth/resend-verification', { email });
  },
};
