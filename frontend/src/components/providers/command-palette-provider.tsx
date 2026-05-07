'use client';

import * as React from 'react';
import { CommandPalette } from '@/components/shared/command-palette';

/**
 * CommandPaletteProvider — wrapper render CommandPalette song song voi children.
 * Palette tu Quản lý open state qua keyboard shortcut va custom event,
 * nen provider khong can context.
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
