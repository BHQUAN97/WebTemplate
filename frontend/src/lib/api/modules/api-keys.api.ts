import { apiClient } from '../client';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string; // VD: wt_abc...
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyDto {
  name: string;
  scopes: string[];
  expires_at?: string | null;
}

export interface CreateApiKeyResponse {
  api_key: ApiKey;
  key: string; // full key — chi hien 1 lan khi tao
}

export const apiKeysApi = {
  list(params?: { page?: number; limit?: number; search?: string }) {
    return apiClient.get<ApiKey[]>(
      '/admin/api-keys',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  get(id: string) {
    return apiClient.get<ApiKey>(`/admin/api-keys/${id}`);
  },

  create(dto: CreateApiKeyDto) {
    return apiClient.post<CreateApiKeyResponse>('/admin/api-keys', dto);
  },

  revoke(id: string) {
    return apiClient.post<ApiKey>(`/admin/api-keys/${id}/revoke`, {});
  },

  regenerate(id: string) {
    return apiClient.post<CreateApiKeyResponse>(
      `/admin/api-keys/${id}/regenerate`,
      {},
    );
  },

  delete(id: string) {
    return apiClient.delete<null>(`/admin/api-keys/${id}`);
  },
};
