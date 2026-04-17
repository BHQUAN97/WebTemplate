import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductVariant } from '@/lib/types';

export interface CartStoreItem {
  product: Product;
  variant: ProductVariant | null;
  quantity: number;
}

interface CartState {
  items: CartStoreItem[];
  promoCode: string | null;
  discountAmount: number;

  addItem: (product: Product, variant: ProductVariant | null, quantity?: number) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  updateQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  clearCart: () => void;
  setPromoCode: (code: string | null, discount: number) => void;

  // Computed
  getSubtotal: () => number;
  getTotal: () => number;
  getItemCount: () => number;
}

/**
 * Cart store — quan ly gio hang local, dong bo voi API khi can
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      discountAmount: 0,

      addItem: (product, variant, quantity = 1) =>
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) =>
              item.product.id === product.id &&
              (item.variant?.id ?? null) === (variant?.id ?? null),
          );

          if (existingIndex >= 0) {
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + quantity,
            };
            return { items: newItems };
          }

          return { items: [...state.items, { product, variant, quantity }] };
        }),

      removeItem: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (item) =>
              !(item.product.id === productId &&
                (item.variant?.id ?? null) === variantId),
          ),
        })),

      updateQuantity: (productId, variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter(
                (item) =>
                  !(item.product.id === productId &&
                    (item.variant?.id ?? null) === variantId),
              ),
            };
          }
          return {
            items: state.items.map((item) =>
              item.product.id === productId &&
              (item.variant?.id ?? null) === variantId
                ? { ...item, quantity }
                : item,
            ),
          };
        }),

      clearCart: () => set({ items: [], promoCode: null, discountAmount: 0 }),

      setPromoCode: (code, discount) =>
        set({ promoCode: code, discountAmount: discount }),

      getSubtotal: () =>
        get().items.reduce(
          (sum, item) =>
            sum + (item.variant?.price ?? item.product.price) * item.quantity,
          0,
        ),

      getTotal: () => {
        const subtotal = get().getSubtotal();
        return Math.max(0, subtotal - get().discountAmount);
      },

      getItemCount: () =>
        get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    {
      name: 'cart-storage',
    },
  ),
);
