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

/** Quản lý Đánh giá (admin) */
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
      header: 'Sản phẩm',
      render: (row) => (
        <div>
          <p className="font-medium line-clamp-1">{row.product?.name ?? row.product_id}</p>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Người viết',
      render: (row) => row.user?.name ?? row.user?.email ?? '---',
    },
    {
      key: 'rating',
      header: 'Đánh giá',
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
      header: 'Nội dung',
      render: (row) => (
        <div className="max-w-xs">
          {row.title && <p className="font-medium text-sm truncate">{row.title}</p>}
          <p className="text-xs text-gray-500 line-clamp-2">{row.comment ?? '---'}</p>
        </div>
      ),
    },
    {
      key: 'is_approved',
      header: 'Trạng thái',
      render: (row) => (
        <Badge variant={row.is_approved ? 'success' : 'warning'}>
          {row.is_approved ? 'Đã duyệt' : 'Chờ duyệt'}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      sortable: true,
      render: (row) => formatDate(row.created_at),
    },
  ];

  const actions: ActionDef<Review>[] = [
    {
      label: 'Duyệt',
      icon: <Check className="h-4 w-4 mr-2" />,
      onClick: (row) => setApproveId(row.id),
      hidden: (row) => row.is_approved,
    },
    {
      label: 'Từ chối',
      icon: <X className="h-4 w-4 mr-2" />,
      onClick: (row) => setRejectId(row.id),
      hidden: (row) => !row.is_approved,
    },
    {
      label: 'Trả lời',
      icon: <MessageSquare className="h-4 w-4 mr-2" />,
      onClick: (row) => {
        setReplyReview(row);
        setReplyText('');
      },
    },
    {
      label: 'Xóa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  const handleApprove = async () => {
    await approveMutation.mutate();
    setApproveId(null);
    refetch();
    toast('Đã duyệt đánh giá', undefined, 'success');
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
      toast('Đã gửi phản hồi', undefined, 'success');
      setReplyReview(null);
      setReplyText('');
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý đánh giá"
        description="Duyệt và phản hồi đánh giá từ khách hàng"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Đánh giá' },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="pending">Chờ duyệt</SelectItem>
            <SelectItem value="approved">Đã duyệt</SelectItem>
            <SelectItem value="rejected">Từ chối</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Số sao" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả sao</SelectItem>
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
        searchPlaceholder="Tìm theo sản phẩm, user..."
        sort={sort}
        order={order}
        onSort={(s, o) => { setSort(s); setOrder(o); }}
        actions={actions}
      />

      {/* Dialog Phản hồi */}
      <Dialog open={!!replyReview} onOpenChange={(o) => !o && setReplyReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Phản hồi đánh giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-gray-50 p-3 rounded text-sm">
              <p className="font-medium">{replyReview?.title ?? `${replyReview?.rating} sao`}</p>
              <p className="text-gray-600 mt-1">{replyReview?.comment ?? '---'}</p>
            </div>
            <FormField label="Nội dung phản hồi" required>
              <Textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi..."
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyReview(null)}>Huỷ</Button>
            <Button onClick={handleReply} disabled={replyMutation.loading || !replyText.trim()}>
              {replyMutation.loading ? 'Đang gửi...' : 'Gửi phản hồi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!approveId}
        onOpenChange={(o) => !o && setApproveId(null)}
        title="Duyet Đánh giá"
        description="Cho phep hien thi Đánh giá nay cho moi nguoi xem?"
        onConfirm={handleApprove}
        confirmLabel="Duyet"
        variant="info"
        loading={approveMutation.loading}
      />

      <ConfirmDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        title="Từ chối Đánh giá"
        description="An Đánh giá nay khoi cong khai?"
        onConfirm={handleReject}
        confirmLabel="Từ chối"
        variant="warning"
        loading={rejectMutation.loading}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xóa Đánh giá"
        description="Xóa vĩnh viễn Đánh giá nay?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
