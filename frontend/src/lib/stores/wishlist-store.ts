import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/types';

interface WishlistState {
  items: Product[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  /** Lấy wishlist từ server và ghi đè local (gọi sau khi login) */
  syncFromServer: () => Promise<void>;
  /** Merge local localStorage items lên server (gọi ngay trước syncFromServer khi login) */
  mergeToServer: () => Promise<void>;
}

function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('access_token');
}

/**
 * Wishlist store — localStorage cho guest, server-side cho user đã đăng nhập.
 * Flow: login → mergeToServer() → syncFromServer()
 */
export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          if (state.items.some((item) => item.id === product.id)) return state;
          return { items: [...state.items, product] };
        });
        // Đồng bộ lên server nếu đã đăng nhập
        if (isLoggedIn()) {
          import('@/lib/api/modules/wishlist.api').then(({ wishlistApi }) => {
            wishlistApi.add(product.id).catch(() => {});
          });
        }
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
        // Xóa trên server nếu đã đăng nhập
        if (isLoggedIn()) {
          import('@/lib/api/modules/wishlist.api').then(({ wishlistApi }) => {
            wishlistApi.remove(productId).catch(() => {});
          });
        }
      },

      isInWishlist: (productId) =>
        get().items.some((item) => item.id === productId),

      clearWishlist: () => set({ items: [] }),

      mergeToServer: async () => {
        if (!isLoggedIn()) return;
        const localItems = get().items;
        if (localItems.length === 0) return;
        const { wishlistApi } = await import('@/lib/api/modules/wishlist.api');
        // Upload từng item lên server, bỏ qua conflict (đã tồn tại)
        await Promise.allSettled(localItems.map((p) => wishlistApi.add(p.id)));
      },

      syncFromServer: async () => {
        if (!isLoggedIn()) return;
        try {
          const { wishlistApi } = await import('@/lib/api/modules/wishlist.api');
          const res = await wishlistApi.getWishlist();
          const data = (res as any)?.data ?? res;
          const serverItems: Product[] = (data as any[])
            .filter((item) => item.product != null)
            .map((item) => ({
              id: item.product.id,
              name: item.product.name,
              slug: item.product.slug,
              price: item.product.price,
              compare_at_price: item.product.compare_at_price,
              images: item.product.images,
              is_active: item.product.is_active,
              // Trường bắt buộc của Product type — fill placeholder
              description: null,
              short_description: null,
              sku: null,
              cost_price: null,
              quantity: 0,
              is_featured: false,
              category_id: null,
              created_at: item.added_at,
              updated_at: item.added_at,
            }));
          set({ items: serverItems });
        } catch {
          // Giữ local data nếu server lỗi
        }
      },
    }),
    { name: 'wishlist-storage' },
  ),
);
