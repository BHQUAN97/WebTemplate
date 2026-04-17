import { apiClient } from '../client';

export interface TwoFactorSetupResponse {
  secret: string;
  qr_code: string; // data URL base64 SVG/PNG
  otpauth_url?: string;
}

export interface TwoFactorEnableResponse {
  backup_codes: string[];
}

export interface TwoFactorStatus {
  enabled: boolean;
  backup_codes_remaining?: number;
  last_used_at?: string | null;
}

export const twoFactorApi = {
  status() {
    return apiClient.get<TwoFactorStatus>('/auth/2fa/status');
  },

  // Buoc 1: khoi tao — BE sinh secret + QR code
  setup() {
    return apiClient.post<TwoFactorSetupResponse>('/auth/2fa/setup', {});
  },

  // Buoc 2: verify code 6 so de kich hoat — BE tra backup codes
  enable(code: string) {
    return apiClient.post<TwoFactorEnableResponse>('/auth/2fa/enable', {
      code,
    });
  },

  // Tat 2FA — yeu cau mat khau hien tai
  disable(password: string) {
    return apiClient.post<null>('/auth/2fa/disable', { password });
  },

  // Tao lai bo backup codes moi — invalidate codes cu
  regenerateBackupCodes(password: string) {
    return apiClient.post<{ backup_codes: string[] }>(
      '/auth/2fa/backup-codes/regenerate',
      { password },
    );
  },
};
