import { apiClient } from '../client';

// Inventory item entity — quan ly ton kho SKU
export interface InventoryItem {
  id: string;
  product_id: string;
  product_name?: string;
  variant_id?: string | null;
  sku: string;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  last_updated?: string;
  created_at: string;
  updated_at: string;
}

export interface AdjustQuantityDto {
  quantity: number; // so luong moi (hoac delta, tuy BE)
  reason: string;
  note?: string;
}

export interface InventoryHistory {
  id: string;
  inventory_id: string;
  type: 'IN' | 'OUT' | 'ADJUST' | 'RESERVE' | 'RELEASE';
  quantity: number;
  reason: string | null;
  user_id: string | null;
  created_at: string;
}

export interface ListInventoryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
  low_stock?: boolean;
  out_of_stock?: boolean;
}

export const inventoryApi = {
  list(params?: ListInventoryParams) {
    return apiClient.get<InventoryItem[]>(
      '/admin/inventory',
      params as Record<string, string | number | boolean | undefined>,
    );
  },

  get(id: string) {
    return apiClient.get<InventoryItem>(`/admin/inventory/${id}`);
  },

  adjust(id: string, dto: AdjustQuantityDto) {
    return apiClient.post<InventoryItem>(`/admin/inventory/${id}/adjust`, dto);
  },

  history(id: string, params?: { page?: number; limit?: number }) {
    return apiClient.get<InventoryHistory[]>(
      `/admin/inventory/${id}/history`,
      params as Record<string, number | undefined>,
    );
  },

  stats() {
    return apiClient.get<{
      total_sku: number;
      low_stock_count: number;
      out_of_stock_count: number;
      total_value?: number;
    }>('/admin/inventory/stats');
  },
};
