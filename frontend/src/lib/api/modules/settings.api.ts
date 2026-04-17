import { apiClient } from '../client';
import type { Setting } from '@/lib/types';

export const settingsApi = {
  getSettings(group?: string) {
    return apiClient.get<Setting[]>('/settings', group ? { group } : undefined);
  },

  getPublicSettings() {
    return apiClient.get<Setting[]>('/settings/public');
  },

  updateSetting(key: string, value: string) {
    return apiClient.patch<Setting>(`/settings/${key}`, { value });
  },

  bulkUpdate(settings: Array<{ key: string; value: string }>) {
    return apiClient.post<Setting[]>('/settings/bulk', { settings });
  },
};
