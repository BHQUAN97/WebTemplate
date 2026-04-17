'use client';

import { Printer } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

interface PrintButtonProps extends Omit<ButtonProps, 'onClick'> {
  label?: string;
}

/**
 * Nut in trang — goi window.print()
 */
export function PrintButton({ label = 'In', ...props }: PrintButtonProps) {
  return (
    <Button variant="outline" onClick={() => window.print()} {...props}>
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
