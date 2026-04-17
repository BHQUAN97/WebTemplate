import { apiClient } from '../client';

export interface NavigationGroup {
  id: string;
  key: string; // VD: header, footer, sidebar
  name: string;
  description: string | null;
  items?: NavigationItem[];
  created_at: string;
  updated_at: string;
}

export interface NavigationItem {
  id: string;
  group_id: string;
  parent_id: string | null;
  label: string;
  url: string;
  icon: string | null;
  sort_order: number;
  is_external: boolean;
  is_active: boolean;
  children?: NavigationItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateGroupDto {
  key: string;
  name: string;
  description?: string;
}

export interface CreateItemDto {
  group_id: string;
  parent_id?: string | null;
  label: string;
  url: string;
  icon?: string;
  sort_order?: number;
  is_external?: boolean;
  is_active?: boolean;
}

export type UpdateItemDto = Partial<CreateItemDto>;

export const navigationApi = {
  listGroups() {
    return apiClient.get<NavigationGroup[]>('/admin/navigation/groups');
  },

  getGroup(id: string) {
    return apiClient.get<NavigationGroup>(`/admin/navigation/groups/${id}`);
  },

  createGroup(dto: CreateGroupDto) {
    return apiClient.post<NavigationGroup>('/admin/navigation/groups', dto);
  },

  updateGroup(id: string, dto: Partial<CreateGroupDto>) {
    return apiClient.patch<NavigationGroup>(
      `/admin/navigation/groups/${id}`,
      dto,
    );
  },

  deleteGroup(id: string) {
    return apiClient.delete<null>(`/admin/navigation/groups/${id}`);
  },

  listItems(groupId: string) {
    return apiClient.get<NavigationItem[]>(
      `/admin/navigation/groups/${groupId}/items`,
    );
  },

  createItem(dto: CreateItemDto) {
    return apiClient.post<NavigationItem>('/admin/navigation/items', dto);
  },

  updateItem(id: string, dto: UpdateItemDto) {
    return apiClient.patch<NavigationItem>(
      `/admin/navigation/items/${id}`,
      dto,
    );
  },

  deleteItem(id: string) {
    return apiClient.delete<null>(`/admin/navigation/items/${id}`);
  },

  reorder(groupId: string, items: Array<{ id: string; sort_order: number; parent_id?: string | null }>) {
    return apiClient.post<null>(
      `/admin/navigation/groups/${groupId}/reorder`,
      { items },
    );
  },
};
