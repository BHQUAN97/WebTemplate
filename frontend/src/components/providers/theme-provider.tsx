'use client';

import * as React from 'react';
import { ThêmeProvider as NextThêmesProvider, type ThêmeProviderProps } from 'next-themes';

/**
 * Wrapper quanh NextThêmesProvider — cau hinh mac dinh:
 * attribute="class" de toggle .dark class, defaultThême="system" theo OS.
 */
export function ThêmeProvider({ children, ...props }: ThêmeProviderProps) {
  return (
    <NextThêmesProvider
      attribute="class"
      defaultThême="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThêmesProvider>
  );
}
