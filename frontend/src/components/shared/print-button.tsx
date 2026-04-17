'use client';

import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { printElement } from '@/lib/utils/export';

interface PrintButtonProps extends Omit<ButtonProps, 'onClick'> {
  label?: string;
  /** Optional DOM id cua element can in — neu bo qua se in toan trang */
  targetId?: string;
  /** Title cua print window (khi co targetId) */
  title?: string;
  children?: ReactNode;
}

/**
 * Nut in trang.
 * - Co `targetId` → mo window moi chi chua element do va print
 * - Khong co `targetId` → goi window.print() toan trang
 */
export function PrintButton({
  label = 'In',
  targetId,
  title,
  children,
  ...props
}: PrintButtonProps) {
  const handleClick = () => {
    if (targetId) {
      printElement(targetId, { title });
    } else {
      window.print();
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} {...props}>
      <Printer className="h-4 w-4 mr-2" />
      {children ?? label}
    </Button>
  );
}
