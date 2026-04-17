'use client';

import * as React from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatFileSize } from '@/lib/utils/format';

interface ImageUploadProps {
  value?: string[];
  onChange?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Upload hinh anh drag-and-drop — ho tro nhieu file, preview, gioi han dung luong
 */
export function ImageUpload({
  value = [],
  onChange,
  onRemove,
  maxFiles = 5,
  maxSizeMB = 5,
  accept = 'image/*',
  className,
  disabled = false,
}: ImageUploadProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const [previews, setPreviews] = React.useState<string[]>(value);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);

    const files = Array.from(fileList);

    // Kiem tra so luong file
    if (previews.length + files.length > maxFiles) {
      setError(`Chi duoc upload toi da ${maxFiles} file`);
      return;
    }

    // Kiem tra dung luong
    const oversized = files.find((f) => f.size > maxSizeBytes);
    if (oversized) {
      setError(`File "${oversized.name}" vuot qua ${maxSizeMB}MB`);
      return;
    }

    // Tao preview
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
    onChange?.(files);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
    onRemove?.(index);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">
          Keo tha file vao day hoac <span className="text-blue-600 font-medium">chon file</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Toi da {maxFiles} file, moi file khong qua {maxSizeMB}MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
              <img
                src={src}
                alt={`Preview ${i + 1}`}
                className="w-full h-24 object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(i);
                  }}
                  className="absolute top-1 right-1 rounded-full bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
