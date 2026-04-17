'use client';

import * as React from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Setup worker tu public folder (copy boi install script)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfViewerProps {
  url: string;
}

/**
 * PDF Viewer dung react-pdf.
 * - Prev/Next navigation giua cac trang
 * - Zoom in/out
 * - Lazy-render: chi render trang hien tai
 */
export function PdfViewer({ url }: PdfViewerProps) {
  const [numPages, setNumPages] = React.useState<number>(0);
  const [pageNumber, setPageNumber] = React.useState<number>(1);
  const [scale, setScale] = React.useState<number>(1);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  const onDocumentLoadSuccess = ({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err: Error) => {
    setLoading(false);
    setError(err.message || 'Khong the tai file PDF');
  };

  const goPrev = () => setPageNumber((p) => Math.max(1, p - 1));
  const goNext = () => setPageNumber((p) => Math.min(numPages || p, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3, +(s + 0.25).toFixed(2)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.25).toFixed(2)));

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 text-sm mb-3">Loi: {error}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline text-sm"
        >
          Tai file ve
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      {/* Controls */}
      <div className="sticky top-0 z-10 flex items-center justify-between w-full p-2 bg-gray-50 border-b border-gray-200 gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goPrev}
            disabled={pageNumber <= 1}
            title="Trang truoc"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-600 min-w-[60px] text-center">
            {pageNumber} / {numPages || '...'}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={goNext}
            disabled={pageNumber >= numPages}
            title="Trang sau"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            title="Thu nho"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500 min-w-[42px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            title="Phong to"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document */}
      <div className="w-full flex-1 overflow-auto bg-gray-100 p-4 flex justify-center">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          }
        >
          {!loading && (
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          )}
        </Document>
      </div>
    </div>
  );
}
