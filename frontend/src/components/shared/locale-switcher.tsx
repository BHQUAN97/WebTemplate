'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import { useUIStore } from '@/lib/stores/ui.store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const LOCALES = ['vi', 'en'] as const;
type LocaleCode = (typeof LOCALES)[number];

/**
 * Dropdown chuyen ngon ngu VI / EN.
 * - Set cookie NEXT_LOCALE de next-intl nhan dien o lan request sau
 * - Sync voi Zustand ui.store de cac component cu (dung locale field) cap nhat
 * - Refresh route de server components re-render voi messages moi
 */
export function LocaleSwitcher() {
  const locale = useLocale() as LocaleCode;
  const t = useTranslations('locale');
  const router = useRouter();
  const pathname = usePathname();
  const setLocale = useUIStore((s) => s.setLocale);
  const [isPending, startTransition] = useTransition();

  const handleChange = (next: LocaleCode) => {
    if (next === locale) return;

    // Luu vao cookie — next-intl se doc o request tiep theo
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;

    // Sync Zustand store
    setLocale(next);

    // Refresh pathname de re-render voi locale moi
    startTransition(() => {
      router.replace(pathname);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          className="gap-2"
          aria-label="Change language"
        >
          <Globe className="h-4 w-4" />
          <span className="uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => handleChange(code)}
            className={code === locale ? 'font-semibold' : ''}
          >
            {t(code)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
