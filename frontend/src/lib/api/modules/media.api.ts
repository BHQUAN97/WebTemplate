import { apiClient } from '../client';
import type { MediaFile, PaginationParams } from '@/lib/types';

export const mediaApi = {
  uploadMedia(file: File, folder?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    return apiClient.upload<MediaFile>('/media/upload', formData);
  },

  getMedia(params?: PaginationParams & { folder?: string }) {
    return apiClient.get<MediaFile[]>('/media', params as Record<string, string | number | boolean | undefined>);
  },

  deleteMedia(id: string) {
    return apiClient.delete<null>(`/media/${id}`);
  },

  getFolders() {
    return apiClient.get<string[]>('/media/folders');
  },
};
