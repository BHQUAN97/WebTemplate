'use client';

import { useState } from 'react';
import { Send, Bell, Eye, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { useToast } from '@/lib/hooks/use-toast';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse } from '@/lib/types';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  target_type: 'user' | 'tenant' | 'all';
  target_ids: string[] | null;
  link: string | null;
  delivered_count: number;
  read_count: number;
  created_at: string;
}

const sendSchema = z.object({
  target_type: z.enum(['user', 'tenant', 'all']),
  target_ids: z.string().optional(),
  type: z.string().min(1, 'Loai la bat buoc'),
  title: z.string().min(1, 'Tieu de la bat buoc').max(200),
  content: z.string().min(1, 'Noi dung la bat buoc'),
  link: z.string().optional(),
});

type SendForm = z.infer<typeof sendSchema>;

/** Quan ly Notifications (admin) — gui thong bao */
export default function AdminNotificationsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sendOpen, setSendOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<SendForm>({
    target_type: 'all',
    target_ids: '',
    type: 'SYSTEM',
    title: '',
    content: '',
    link: '',
  });

  const pagination = usePagination();

  const params: Record<string, string | number | boolean | undefined> = {
    page: pagination.page,
    limit: pagination.limit,
    search: search || undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
  };

  const { data, loading, refetch } = useApi<ApiResponse<AdminNotification[]>>(
    '/admin/notifications',
    params,
  );
  const items = data?.data ?? [];
  const totalPages = data?.pagination?.totalPages ?? 1;

  const sendMutation = useMutation('POST', '/admin/notifications');
  const deleteMutation = useMutation(
    'DELETE',
    deleteId ? `/admin/notifications/${deleteId}` : '',
  );

  const columns: ColumnDef<AdminNotification>[] = [
    {
      key: 'type',
      header: 'Loai',
      render: (row) => <Badge variant="secondary">{row.type}</Badge>,
    },
    {
      key: 'title',
      header: 'Tieu de',
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{row.content}</p>
        </div>
      ),
    },
    {
      key: 'target_type',
      header: 'Muc tieu',
      render: (row) => {
        const label =
          row.target_type === 'all' ? 'Tat ca'
          : row.target_type === 'tenant' ? 'Theo tenant'
          : 'Nguoi dung cu the';
        return <Badge variant="default">{label}</Badge>;
      },
    },
    {
      key: 'delivered_count',
      header: 'Da gui',
      render: (row) => row.delivered_count,
    },
    {
      key: 'read_count',
      header: 'Da doc',
      render: (row) => {
        const rate = row.delivered_count > 0 ? (row.read_count / row.delivered_count) * 100 : 0;
        return (
          <span>
            {row.read_count} <span className="text-xs text-gray-500">({rate.toFixed(0)}%)</span>
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Gui luc',
      render: (row) => formatDate(row.created_at),
    },
  ];

  const actions: ActionDef<AdminNotification>[] = [
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  const updateField = <K extends keyof SendForm>(key: K, value: SendForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const handleSend = async () => {
    const result = sendSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => {
        fe[e.path[0] as string] = e.message;
      });
      setErrors(fe);
      return;
    }
    const payload: Record<string, unknown> = {
      type: result.data.type,
      title: result.data.title,
      content: result.data.content,
      target_type: result.data.target_type,
    };
    if (result.data.link) payload.link = result.data.link;
    if (result.data.target_ids && result.data.target_type !== 'all') {
      payload.target_ids = result.data.target_ids.split(',').map((s) => s.trim()).filter(Boolean);
    }
    const res = await sendMutation.mutate(payload);
    if (res) {
      toast('Da gui thong bao', undefined, 'success');
      setSendOpen(false);
      setForm({
        target_type: 'all', target_ids: '', type: 'SYSTEM',
        title: '', content: '', link: '',
      });
      refetch();
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutate();
    setDeleteId(null);
    refetch();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thong bao he thong"
        description="Gui thong bao den nguoi dung"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Thong bao' },
        ]}
        actions={
          <Button onClick={() => setSendOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Gui thong bao
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 print:hidden">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Loai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca loai</SelectItem>
            <SelectItem value="SYSTEM">He thong</SelectItem>
            <SelectItem value="PROMOTION">Khuyen mai</SelectItem>
            <SelectItem value="ORDER">Don hang</SelectItem>
            <SelectItem value="SECURITY">Bao mat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        page={pagination.page}
        totalPages={totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Tim theo tieu de..."
        actions={actions}
      />

      {/* Dialog gui thong bao */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gui thong bao moi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <FormField label="Doi tuong nhan" error={errors.target_type} required>
              <Select
                value={form.target_type}
                onValueChange={(v) => updateField('target_type', v as SendForm['target_type'])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tat ca nguoi dung</SelectItem>
                  <SelectItem value="user">Nguoi dung cu the (ID)</SelectItem>
                  <SelectItem value="tenant">Theo tenant</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {form.target_type !== 'all' && (
              <FormField
                label="IDs (cach nhau dau phay)"
                error={errors.target_ids}
                description="VD: id1, id2, id3"
              >
                <Input
                  value={form.target_ids ?? ''}
                  onChange={(e) => updateField('target_ids', e.target.value)}
                />
              </FormField>
            )}

            <FormField label="Loai" error={errors.type} required>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM">He thong</SelectItem>
                  <SelectItem value="PROMOTION">Khuyen mai</SelectItem>
                  <SelectItem value="ORDER">Don hang</SelectItem>
                  <SelectItem value="SECURITY">Bao mat</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Tieu de" error={errors.title} required>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </FormField>

            <FormField label="Noi dung" error={errors.content} required>
              <Textarea
                rows={4}
                value={form.content}
                onChange={(e) => updateField('content', e.target.value)}
              />
            </FormField>

            <FormField label="Link dich (tuy chon)" error={errors.link}>
              <Input
                value={form.link ?? ''}
                onChange={(e) => updateField('link', e.target.value)}
                placeholder="/offers/summer-sale"
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendOpen(false)}>Huy</Button>
            <Button onClick={handleSend} disabled={sendMutation.loading}>
              <Bell className="h-4 w-4 mr-2" />
              {sendMutation.loading ? 'Dang gui...' : 'Gui'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xoa thong bao"
        description="Xoa thong bao nay khoi he thong?"
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
