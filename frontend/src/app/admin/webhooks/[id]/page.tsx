'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Copy, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { useToast } from '@/lib/hooks/use-toast';
import { formatDate } from '@/lib/utils/format';
import type { ApiResponse } from '@/lib/types';
import type { Webhook, WebhookDelivery } from '@/lib/api/modules/webhooks.api';

const AVAILABLE_EVENTS = [
  'user.created',
  'user.updated',
  'user.deleted',
  'order.created',
  'order.updated',
  'order.paid',
  'order.cancelled',
  'product.created',
  'product.updated',
  'product.deleted',
  'payment.completed',
  'payment.failed',
];

const webhookSchema = z.object({
  url: z.string().url('URL khong hop le'),
  events: z.array(z.string()).min(1, 'Chon it nhat 1 su kien'),
  is_active: z.boolean(),
  max_retries: z.number().int().min(0).max(10),
});

type WebhookForm = z.infer<typeof webhookSchema>;

/** Chi tiet / Chinh sua webhook */
export default function WebhookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const isNew = id === 'new';
  const { toast } = useToast();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState<WebhookForm>({
    url: '',
    events: [],
    is_active: true,
    max_retries: 3,
  });

  const { data, loading } = useApi<ApiResponse<Webhook>>(
    isNew ? null : `/admin/webhooks/${id}`,
  );
  const deliveries = useApi<ApiResponse<WebhookDelivery[]>>(
    isNew ? null : `/admin/webhooks/${id}/deliveries`,
    { limit: 20 },
  );

  const saveMutation = useMutation(
    isNew ? 'POST' : 'PATCH',
    isNew ? '/admin/webhooks' : `/admin/webhooks/${id}`,
  );
  const deleteMutation = useMutation('DELETE', `/admin/webhooks/${id}`);
  const regenerateMutation = useMutation<unknown, { secret: string }>(
    'POST',
    `/admin/webhooks/${id}/regenerate-secret`,
  );

  useEffect(() => {
    if (data?.data) {
      const w = data.data;
      setForm({
        url: w.url,
        events: w.events ?? [],
        is_active: w.is_active,
        max_retries: w.max_retries ?? 3,
      });
    }
  }, [data]);

  const webhook = data?.data;

  const updateField = <K extends keyof WebhookForm>(key: K, value: WebhookForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const toggleEvent = (ev: string) => {
    setForm((p) => ({
      ...p,
      events: p.events.includes(ev) ? p.events.filter((e) => e !== ev) : [...p.events, ev],
    }));
    setErrors((p) => ({ ...p, events: '' }));
  };

  const handleSubmit = async () => {
    const result = webhookSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => {
        fe[e.path[0] as string] = e.message;
      });
      setErrors(fe);
      return;
    }
    const res = await saveMutation.mutate(result.data);
    if (res) {
      toast(isNew ? 'Da tao webhook' : 'Da luu', undefined, 'success');
      router.push('/admin/webhooks');
    }
  };

  const handleDelete = async () => {
    const res = await deleteMutation.mutate();
    if (res !== null) router.push('/admin/webhooks');
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Da copy', undefined, 'success');
    } catch {
      toast('Copy that bai', undefined, 'destructive');
    }
  };

  const handleRegenerate = async () => {
    const res = await regenerateMutation.mutate();
    if (res?.secret) {
      toast('Da tao secret moi', undefined, 'success');
    }
  };

  if (loading && !isNew) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'Tao webhook moi' : `Webhook: ${webhook?.url ?? '...'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Webhooks', href: '/admin/webhooks' },
          { label: isNew ? 'Tao moi' : 'Chi tiet' },
        ]}
        actions={
          !isNew && (
            <Button variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4 mr-2" /> Xoa
            </Button>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Cau hinh</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="URL" error={errors.url} required>
                <Input
                  value={form.url}
                  onChange={(e) => updateField('url', e.target.value)}
                  placeholder="https://example.com/webhook"
                />
              </FormField>

              <FormField label="So lan retry toi da" error={errors.max_retries}>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={form.max_retries}
                  onChange={(e) => updateField('max_retries', Number(e.target.value))}
                />
              </FormField>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium">Kich hoat</span>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(c) => updateField('is_active', c)}
                />
              </div>

              {!isNew && webhook?.secret && (
                <FormField label="Secret" description="Dung de verify chu ky HMAC">
                  <div className="flex gap-2">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value={webhook.secret}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => setShowSecret((s) => !s)}>
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button type="button" variant="outline" size="icon" onClick={() => handleCopy(webhook.secret!)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerate}
                      disabled={regenerateMutation.loading}
                      title="Tao secret moi"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </FormField>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Su kien lang nghe</CardTitle>
              {errors.events && <p className="text-sm text-red-500 mt-1">{errors.events}</p>}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {AVAILABLE_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.events.includes(ev)}
                      onCheckedChange={() => toggleEvent(ev)}
                    />
                    <span className="font-mono text-xs">{ev}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {!isNew && (
            <Card>
              <CardHeader><CardTitle>Lich su gui (20 gan nhat)</CardTitle></CardHeader>
              <CardContent>
                {deliveries.loading ? (
                  <Skeleton className="h-40" />
                ) : deliveries.data?.data?.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-500 border-b">
                        <tr>
                          <th className="py-2">Thoi gian</th>
                          <th>Event</th>
                          <th>Status</th>
                          <th>HTTP</th>
                          <th>Retry</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.data.data.map((d) => (
                          <tr key={d.id} className="border-b last:border-0">
                            <td className="py-2">{formatDate(d.created_at)}</td>
                            <td className="font-mono text-xs">{d.event}</td>
                            <td>
                              <Badge variant={d.status === 'success' ? 'success' : d.status === 'failed' ? 'destructive' : 'secondary'}>
                                {d.status}
                              </Badge>
                            </td>
                            <td>{d.response_status ?? '---'}</td>
                            <td>{d.retry_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Chua co delivery nao</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Thong ke</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Thanh cong</span>
                <span className="font-semibold text-green-600">{webhook?.success_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">That bai</span>
                <span className="font-semibold text-red-600">{webhook?.failure_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Lan cuoi</span>
                <span className="text-xs">
                  {webhook?.last_triggered_at ? formatDate(webhook.last_triggered_at) : 'Chua'}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={saveMutation.loading} onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.loading ? 'Dang luu...' : 'Luu'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/admin/webhooks')}>
              Huy
            </Button>
          </div>

          {saveMutation.error && (
            <p className="text-sm text-red-500">{saveMutation.error}</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Xoa webhook"
        description="Ban co chac chan muon xoa webhook nay?"
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
