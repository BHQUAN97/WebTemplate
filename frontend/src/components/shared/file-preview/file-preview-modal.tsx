'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Download, FileQuestion, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/utils/format';

// Lazy-load viewers — chi tai khi can
const PdfViewer = dynamic(
  () => import('./pdf-viewer').then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  },
);

const DocxViewer = dynamic(
  () => import('./docx-viewer').then((m) => m.DocxViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  },
);

const ImageViewer = dynamic(
  () => import('./image-viewer').then((m) => m.ImageViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ),
  },
);

export interface FilePreviewFile {
  url: string;
  mime_type: string;
  filename: string;
  size: number;
  alt_text?: string | null;
}

interface FilePreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: FilePreviewFile | null;
}

const DOCX_MIMES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

/**
 * Modal preview file — tu dong detect type de render viewer phu hop.
 */
export function FilePreviewModal({
  open,
  onClose,
  file,
}: FilePreviewModalProps) {
  if (!file) return null;

  const mime = file.mime_type || '';
  const isImage = mime.startsWith('image/');
  const isPdf = mime === 'application/pdf';
  const isDocx = DOCX_MIMES.includes(mime);
  const isVideo = mime.startsWith('video/');
  const isAudio = mime.startsWith('audio/');

  const renderBody = () => {
    if (isImage) return <ImageViewer url={file.url} alt={file.alt_text ?? ''} />;
    if (isPdf) return <PdfViewer url={file.url} />;
    if (isDocx) return <DocxViewer url={file.url} filename={file.filename} />;
    if (isVideo) {
      return (
        <div className="bg-black p-2 flex items-center justify-center">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={file.url}
            controls
            className="max-h-[70vh] max-w-full"
          />
        </div>
      );
    }
    if (isAudio) {
      return (
        <div className="p-8 flex flex-col items-center justify-center gap-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio src={file.url} controls className="w-full max-w-md" />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <FileQuestion className="h-16 w-16 text-gray-300 mb-3" />
        <p className="text-gray-600 mb-4">Khong ho tro preview loai file nay</p>
        <Button asChild>
          <a
            href={file.url}
            download={file.filename}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-4 w-4 mr-2" />
            Tai xuong
          </a>
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {file.filename}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {mime} · {formatFileSize(file.size)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a
                href={file.url}
                download={file.filename}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4 mr-2" />
                Tai ve
              </a>
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-hidden">{renderBody()}</div>
      </DialogContent>
    </Dialog>
  );
}
