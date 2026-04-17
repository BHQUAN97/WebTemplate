'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RichContentViewerProps {
  /** HTML content tu Tiptap (BE da sanitize) */
  content: string;
  className?: string;
}

/**
 * Render HTML content tu rich text editor — dung cho public pages.
 * Gia dinh BE da sanitize HTML truoc khi tra ve (DOMPurify / sanitize-html).
 */
export function RichContentViewer({
  content,
  className,
}: RichContentViewerProps) {
  if (!content) return null;
  return (
    <div
      className={cn('rich-content-viewer prose prose-sm md:prose-base max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
