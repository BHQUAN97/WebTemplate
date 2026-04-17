'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Rich text editor shell — se tich hop Tiptap sau
 * Hien tai dung textarea lam placeholder
 */
export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Nhap noi dung...',
  className,
  disabled = false,
}: RichTextEditorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Toolbar placeholder */}
      <div className="flex items-center gap-1 p-2 border border-gray-200 rounded-t-lg bg-gray-50">
        <span className="text-xs text-gray-400">
          Rich text editor — se tich hop Tiptap
        </span>
      </div>
      {/* Content area */}
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex min-h-[200px] w-full rounded-b-lg border border-t-0 border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
