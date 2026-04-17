import { apiClient } from '../client';
import type { MediaFile, PaginationParams } from '@/lib/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const mediaApi = {
  uploadMedia(file: File, folder?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) formData.append('folder', folder);
    return apiClient.upload<MediaFile>('/media/upload', formData);
  },

  getMedia(params?: PaginationParams & { folder?: string }) {
    return apiClient.get<MediaFile[]>(
      '/media',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  deleteMedia(id: string) {
    return apiClient.delete<null>(`/media/${id}`);
  },

  getFolders() {
    return apiClient.get<string[]>('/media/folders');
  },

  /**
   * Tai ZIP chua cac file duoc chon — dung cho bulk download.
   * Tra ve Blob de FE saveAs.
   */
  async downloadBulk(ids: string[]): Promise<Blob> {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('access_token') ||
          sessionStorage.getItem('access_token')
        : null;

    const res = await fetch(`${API_BASE_URL}/media/download/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Tai ZIP that bai' }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.blob();
  },
};
