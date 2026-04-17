import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions dong bo — luu state truc tiep
  setAuth: (user: User, token: string) => void;
  updateUser: (user: Partial<User>) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  getToken: () => string | null;

  // Actions bat dong bo — goi API
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

/**
 * Auth store — quan ly trang thai dang nhap, user info, token.
 * Persist vao sessionStorage (clear khi dong browser).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
        }
        set({ user, token, isAuthenticated: true });
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      setToken: (token) => {
        if (typeof window !== 'undefined') {
          if (token) localStorage.setItem('access_token', token);
          else localStorage.removeItem('access_token');
        }
        set({ token });
      },

      getToken: () => get().token,

      login: async (email, password) => {
        const { authApi } = await import('@/lib/api/modules/auth.api');
        const res = await authApi.login(email, password);
        const token = res.accessToken;
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', token);
        }
        set({ token, user: res.user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          const { authApi } = await import('@/lib/api/modules/auth.api');
          await authApi.logout();
        } catch {
          // Van clear state du API loi
        }
        if (typeof window !== 'undefined') {
          // Clean triet de — xoa token o ca 2 storage va flag remember
          localStorage.removeItem('access_token');
          sessionStorage.removeItem('access_token');
          localStorage.removeItem('remember_me');
          sessionStorage.removeItem('2fa_pending');
          // Clear cart cua user truoc khi logout — chong leak du lieu
          // sang user khac dung chung browser. Dynamic import tranh circular dep.
          try {
            const cartMod = await import('@/lib/stores/cart-store');
            cartMod.useCartStore.getState().clearCart?.();
          } catch {
            /* cart store optional */
          }
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshToken: async () => {
        try {
          const { authApi } = await import('@/lib/api/modules/auth.api');
          const res = await authApi.refreshToken();
          const token = res.accessToken;
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', token);
          }
          set({ token });
        } catch {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token');
          }
          set({ user: null, token: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'webtemplate-auth-v1',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? sessionStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
