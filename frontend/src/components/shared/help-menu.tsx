'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpCircle, BookOpen, MessageCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { resetTour } from '@/components/shared/onboarding-tour';
import { cn } from '@/lib/utils';

interface HelpMenuProps {
  className?: string;
}

/**
 * Xac dinh storageKey cua tour tuong ung voi path hien tai
 */
function getTourKeyForPath(pathname: string): string {
  if (pathname.startsWith('/admin')) return 'onboarding.admin.v1';
  if (pathname.startsWith('/checkout')) return 'onboarding.checkout.v1';
  return 'onboarding.dashboard.v1';
}

/**
 * Help menu — dropdown goc man hinh chua cac tuy chon ho tro:
 * xem lai huong dan tour, tai lieu FAQ, lien he ho tro.
 */
export function HelpMenu({ className }: HelpMenuProps) {
  const pathname = usePathname();

  const handleReplayTour = React.useCallback(() => {
    const key = getTourKeyForPath(pathname || '/');
    resetTour(key);
    // Reload de tour kich hoat lai
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, [pathname]);

  return (
    <div className={cn('fixed bottom-6 right-6 z-40 print:hidden', className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg"
            aria-label="Mo menu tro giup"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-56">
          <DropdownMenuItem onClick={handleReplayTour} className="cursor-pointer">
            <RotateCcw className="mr-2 h-4 w-4" />
            <span>Xem lai huong dan</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/faq">
              <BookOpen className="mr-2 h-4 w-4" />
              <span>Tai lieu</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/contact">
              <MessageCircle className="mr-2 h-4 w-4" />
              <span>Lien he ho tro</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
