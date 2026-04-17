import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type Theme = 'light' | 'dark';
/**
 * Locale dong bo voi next-intl routing (src/i18n/routing.ts).
 * Nguon chinh la cookie NEXT_LOCALE (do next-intl quan ly);
 * store nay mirror lai de legacy component dung truc tiep co the cap nhat.
 * Khi thay doi locale, nen su dung <LocaleSwitcher /> de ca hai cung dong bo.
 */
type Locale = 'vi' | 'en';

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  locale: Locale;

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      locale: 'vi',

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => {
        // Cap nhat class tren <html> cho Tailwind dark mode
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle(
            'dark',
            theme === 'dark',
          );
        }
        set({ theme });
      },
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined'
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
      }),
    },
  ),
);
