'use client';

import { useState } from 'react';
import { saveAs } from 'file-saver';
import {
  Upload,
  Grid,
  List,
  Trash2,
  Copy,
  X,
  Download,
  Eye,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FilePreviewModal } from '@/components/shared/file-preview/file-preview-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { mediaApi } from '@/lib/api/modules/media.api';
import { useToast } from '@/lib/hooks/use-toast';
import { formatFileSize, formatDate } from '@/lib/utils/format';
import type { ApiResponse, MediaFile } from '@/lib/types';

/** Thu vien media */
export default function MediaPage() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [altText, setAltText] = useState('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const pagination = usePagination({ initialLimit: 24 });

  const { data, loading, refetch } = useApi<ApiResponse<MediaFile[]>>(
    '/admin/media',
    {
      page: pagination.page,
      limit: pagination.limit,
      search: search || undefined,
    },
  );
  const files = data?.data ?? [];

  const deleteMutation = useMutation('DELETE', `/admin/media/${deleteId}`);

  const getMimeIcon = (mime: string) => {
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.includes('pdf')) return 'pdf';
    return 'file';
  };

  const getMimeBadgeVariant = (
    mime: string,
  ): 'default' | 'success' | 'warning' | 'secondary' => {
    if (mime.startsWith('image/')) return 'success';
    if (mime.startsWith('video/')) return 'warning';
    if (mime.includes('pdf')) return 'default';
    return 'secondary';
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutate();
    setDeleteId(null);
    if (selectedFile?.id === deleteId) setSelectedFile(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteId);
      return next;
    });
    refetch();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast('Da sao chep URL', undefined, 'success');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDownload = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkLoading(true);
    try {
      const blob = await mediaApi.downloadBulk(ids);
      saveAs(blob, `media-bundle-${Date.now()}.zip`);
      toast('Da tao ZIP', `${ids.length} file`, 'success');
    } catch (err) {
      toast('Tai ZIP that bai', (err as Error).message, 'destructive');
    } finally {
      setBulkLoading(false);
    }
  };

  const openPreview = (file: MediaFile) => {
    setPreviewFile(file);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thu vien media"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Media' },
        ]}
        actions={
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Tai len
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Input
          placeholder="Tim kiem file..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-sm"
        />
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
          <span className="text-sm text-blue-900">
            Da chon {selectedIds.size} file
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleBulkDownload}
              disabled={bulkLoading}
            >
              <Download className="h-4 w-4 mr-2" />
              {bulkLoading ? 'Dang tao ZIP...' : 'Tai ZIP'}
            </Button>
            <Button size="sm" variant="outline" onClick={clearSelection}>
              Bo chon
            </Button>
          </div>
        </div>
      )}

      {/* Upload dropzone */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">
          Keo tha file vao day hoac click de chon
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Ho tro: JPG, PNG, GIF, SVG, PDF, MP4 (toi da 10MB)
        </p>
      </div>

      <div className="flex gap-6">
        {/* File grid/list */}
        <div className="flex-1">
          {loading ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4'
                  : 'space-y-2'
              }
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className={
                    viewMode === 'grid'
                      ? 'h-32 w-full rounded-lg'
                      : 'h-14 w-full rounded'
                  }
                />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p>Chua co file nao</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`group relative rounded-lg border-2 overflow-hidden transition-all ${
                    selectedFile?.id === file.id
                      ? 'border-blue-500 ring-2 ring-blue-200'
                      : selectedIds.has(file.id)
                        ? 'border-blue-400'
                        : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(file.id)}
                      onCheckedChange={() => toggleSelect(file.id)}
                      className="bg-white/80"
                    />
                  </div>

                  {/* Preview button (overlay) */}
                  <button
                    type="button"
                    className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(file);
                    }}
                    title="Xem truoc"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </button>

                  <div
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedFile(file);
                      setAltText(file.alt_text ?? '');
                    }}
                    onDoubleClick={() => openPreview(file)}
                  >
                    <div className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                      {file.mime_type.startsWith('image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.url}
                          alt={file.alt_text ?? ''}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl text-gray-400">
                          {getMimeIcon(file.mime_type).charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">
                        {file.original_name}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </span>
                        <Badge
                          variant={getMimeBadgeVariant(file.mime_type)}
                          className="text-[10px] px-1 py-0"
                        >
                          {getMimeIcon(file.mime_type)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFile?.id === file.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  onClick={() => {
                    setSelectedFile(file);
                    setAltText(file.alt_text ?? '');
                  }}
                  onDoubleClick={() => openPreview(file)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(file.id)}
                      onCheckedChange={() => toggleSelect(file.id)}
                    />
                  </div>
                  <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {file.mime_type.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={file.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-gray-400">
                        {getMimeIcon(file.mime_type).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.original_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      openPreview(file);
                    }}
                    title="Xem truoc"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Badge variant={getMimeBadgeVariant(file.mime_type)}>
                    {getMimeIcon(file.mime_type)}
                  </Badge>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {formatDate(file.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedFile && (
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Chi tiet file</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Preview */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {selectedFile.mime_type.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedFile.url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-gray-400">
                      Preview
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Ten file</p>
                    <p className="font-medium truncate">
                      {selectedFile.original_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">URL</p>
                    <div className="flex items-center gap-1">
                      <p className="text-xs truncate flex-1">
                        {selectedFile.url}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyUrl(selectedFile.url)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-gray-500 text-xs">Kich thuoc</p>
                      <p>{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Ngay tai len</p>
                      <p>{formatDate(selectedFile.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    Alt text
                  </label>
                  <Input
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Mo ta hinh anh"
                    className="text-sm"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openPreview(selectedFile)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Xem truoc
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={() => setDeleteId(selectedFile.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xoa file
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa file"
        description="Ban co chac chan muon xoa file nay? Hanh dong nay khong the hoan tac."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />

      <FilePreviewModal
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />
    </div>
  );
}
