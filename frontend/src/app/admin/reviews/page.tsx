'use client';

import { useState } from 'react';
import { Check, X, MessageSquare, Trash2, Star } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { useToast } from '@/lib/hooks/use-toast';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse, Review } from '@/lib/types';

/** Quan ly danh gia (admin) */
export default function AdminReviewsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replyReview, setReplyReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    sort,
    order,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    rating: ratingFilter !== 'all' ? ratingFilter : undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<Review[]>>('/admin/reviews', params);
  const reviews = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const approveMutation = useMutation(
    'POST',
    approveId ? `/admin/reviews/${approveId}/approve` : '',
  );
  const rejectMutation = useMutation(
    'POST',
    rejectId ? `/admin/reviews/${rejectId}/reject` : '',
  );
  const deleteMutation = useMutation(
    'DELETE',
    deleteId ? `/admin/reviews/${deleteId}` : '',
  );
  const replyMutation = useMutation(
    'POST',
    replyReview ? `/admin/reviews/${replyReview.id}/reply` : '',
  );

  const columns: ColumnDef<Review>[] = [
    {
      key: 'product',
      header: 'San pham',
      render: (row) => (
        <div>
          <p className="font-medium line-clamp-1">{row.product?.name ?? row.product_id}</p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Nguoi viet',
      render: (row) => row.user?.name ?? row.user?.email ?? '---',
    },
    {
      key: 'rating',
      header: 'Danh gia',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < row.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'comment',
      header: 'Noi dung',
      render: (row) => (
        <div className="max-w-xs">
          {row.title && <p className="font-medium text-sm truncate">{row.title}</p>}
          <p className="text-xs text-gray-500 line-clamp-2">{row.comment ?? '---'}</p>
        </div>
      ),
    },
    {
      key: 'is_approved',
      header: 'Trang thai',
      render: (row) => (
        <Badge variant={row.is_approved ? 'success' : 'warning'}>
          {row.is_approved ? 'Da duyet' : 'Cho duyet'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Ngay tao',
      sortable: true,
      render: (row) => formatDate(row.created_at),
    },
  ];

  const actions: ActionDef<Review>[] = [
    {
      label: 'Duyet',
      icon: <Check className="h-4 w-4 mr-2" />,
      onClick: (row) => setApproveId(row.id),
      hidden: (row) => row.is_approved,
    },
    {
      label: 'Tu choi',
      icon: <X className="h-4 w-4 mr-2" />,
      onClick: (row) => setRejectId(row.id),
      hidden: (row) => !row.is_approved,
    },
    {
      label: 'Tra loi',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      onClick: (row) => {
        setReplyReview(row);
        setReplyText('');
      },
    },
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  const handleApprove = async () => {
    await approveMutation.mutate();
    setApproveId(null);
    refetch();
    toast('Da duyet danh gia', undefined, 'success');
  };

  const handleReject = async () => {
    await rejectMutation.mutate();
    setRejectId(null);
    refetch();
  };

  const handleDelete = async () => {
    await deleteMutation.mutate();
    setDeleteId(null);
    refetch();
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    const res = await replyMutation.mutate({ content: replyText });
    if (res) {
      toast('Da gui phan hoi', undefined, 'success');
      setReplyReview(null);
      setReplyText('');
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly danh gia"
        description="Duyet va phan hoi danh gia tu khach hang"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Danh gia' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca</SelectItem>
            <SelectItem value="pending">Cho duyet</SelectItem>
            <SelectItem value="approved">Da duyet</SelectItem>
            <SelectItem value="rejected">Tu choi</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="So sao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca sao</SelectItem>
            <SelectItem value="5">5 sao</SelectItem>
            <SelectItem value="4">4 sao</SelectItem>
            <SelectItem value="3">3 sao</SelectItem>
            <SelectItem value="2">2 sao</SelectItem>
            <SelectItem value="1">1 sao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={reviews}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo san pham, user..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      {/* Dialog phan hoi */}
      <Dialog open={!!replyReview} onOpenChange={(o) => !o && setReplyReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phan hoi danh gia</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium">{replyReview?.title ?? `${replyReview?.rating} sao`}</p>
              <p className="text-gray-600 mt-1">{replyReview?.comment ?? '---'}</p>
            </div>
            <FormField label="Noi dung phan hoi" required>
              <Textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhap noi dung phan hoi..."
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyReview(null)}>Huy</Button>
            <Button onClick={handleReply} disabled={replyMutation.loading || !replyText.trim()}>
              {replyMutation.loading ? 'Dang gui...' : 'Gui phan hoi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!approveId}
        onOpenChange={(o) => !o && setApproveId(null)}
        title="Duyet danh gia"
        description="Cho phep hien thi danh gia nay cho moi nguoi xem?"
        onConfirm={handleApprove}
        confirmLabel="Duyet"
        variant="info"
        loading={approveMutation.loading}
      />

      <ConfirmDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        title="Tu choi danh gia"
        description="An danh gia nay khoi cong khai?"
        onConfirm={handleReject}
        confirmLabel="Tu choi"
        variant="warning"
        loading={rejectMutation.loading}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xoa danh gia"
        description="Xoa vinh vien danh gia nay?"
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
