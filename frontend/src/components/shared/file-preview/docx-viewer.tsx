'use client';

import * as React from 'react';
import { Loader2, Download } from 'lucide-react';

interface DocxViewerProps {
  url: string;
  filename?: string;
}

/**
 * DOCX Preview — dung mammoth de convert DOCX -> HTML.
 * Dynamic import mammoth de tranh bundle lon khi khong can.
 */
export function DocxViewer({ url, filename }: DocxViewerProps) {
  const [html, setHtml] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadDoc() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();

        // Dynamic import mammoth — chi tai khi can
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) {
          setHtml(result.value);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Khong the hien thi DOCX');
          setLoading(false);
        }
      }
    }

    loadDoc();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-3">
        <p className="text-red-500 text-sm">
          Khong the hien thi DOCX: {error}
        </p>
        <a
          href={url}
          download={filename}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 underline text-sm"
        >
          <Download className="h-4 w-4" />
          Tai file ve
        </a>
      </div>
    );
  }

  return (
    <div className="max-h-[70vh] overflow-auto bg-white p-6">
      <div
        className="prose prose-sm md:prose-base max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
