'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Save, Loader2 } from 'lucide-react';
import { FormField } from '@/components/shared/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/hooks/use-toast';
import type {
  ChatScenario,
  CreateScenarioInput,
  ScenarioTriggerType,
  ScenarioResponseType,
} from '@/lib/api/modules/admin-chat.api';

/** Zod schema — FE/BE validation phai dong bo */
export const scenarioSchema = z.object({
  name: z.string().min(2, 'Tối thiểu 2 ký tự').max(100, 'Tối đa 100 ký tự'),
  description: z.string().max(500).optional(),
  triggerType: z.enum(['keyword', 'intent', 'event', 'fallback', 'schedule']),
  triggerValue: z.string().min(1, 'Không được bỏ trống'),
  conditionsJson: z.string().optional(),
  response: z.string().min(1, 'Nội dung phản hồi bắt buộc').max(4000, 'Tối đa 4000 ký tự'),
  responseType: z.enum(['text', 'template', 'quick_reply', 'product', 'order']),
  followUpScenarioId: z.string().optional(),
  delayMs: z.coerce.number().int().min(0).max(300000).default(0),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  isActive: z.boolean(),
});

export type ScenarioFormValues = z.infer<typeof scenarioSchema>;

const TRIGGER_OPTIONS: Array<{ value: ScenarioTriggerType; label: string; hint: string }> = [
  { value: 'keyword', label: 'Từ khóa', hint: 'Danh sách từ khóa ngăn cách bằng dấu phẩy' },
  { value: 'intent', label: 'Intent (ý định)', hint: 'Mã intent do AI phân loại' },
  { value: 'event', label: 'Sự kiện', hint: 'Tên event (vd: cart.abandoned)' },
  { value: 'fallback', label: 'Fallback', hint: 'Không cần trigger value' },
  { value: 'schedule', label: 'Theo lịch', hint: 'Cron hoặc khung giờ' },
];

const RESPONSE_TYPE_OPTIONS: Array<{ value: ScenarioResponseType; label: string }> = [
  { value: 'text', label: 'Văn bản' },
  { value: 'template', label: 'Template (Handlebars)' },
  { value: 'quick_reply', label: 'Quick reply (JSON)' },
  { value: 'product', label: 'Product card' },
  { value: 'order', label: 'Order card' },
];

/** Render preview don gian — thay {{var}} bang mock value */
function renderPreview(template: string): string {
  const mock: Record<string, string> = {
    customer_name: 'Nguyen Van A',
    order_code: 'DH-123456',
    product_name: 'Sản phẩm mau',
    shop_name: 'Cua hang cua ban',
  };
  return template.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k) => mock[k] ?? `{{${k}}}`);
}

interface Props {
  /** undefined = create mode, co gia tri = edit mode */
  initial?: ChatScenario;
  onSubmit: (data: CreateScenarioInput) => Promise<ChatScenario | null>;
  scenarios?: ChatScenario[]; // dung cho select follow-up
}

/**
 * Form tao/sua scenario — dung chung cho new/edit page.
 * Tu viet state thay vi ValidatedForm vi co field "conditionsJson" phai parse -> JSON.
 */
export function ScenarioForm({ initial, onSubmit, scenarios = [] }: Props) {
  const router = useRouter();
  const [values, setValues] = React.useState<ScenarioFormValues>(() => ({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    triggerType: initial?.triggerType ?? 'keyword',
    triggerValue: initial?.triggerValue ?? '',
    conditionsJson: initial?.conditions ? JSON.stringify(initial.conditions, null, 2) : '',
    response: initial?.response ?? '',
    responseType: initial?.responseType ?? 'text',
    followUpScenarioId: initial?.followUpScenarioId ?? '',
    delayMs: initial?.delayMs ?? 0,
    priority: initial?.priority ?? 100,
    isActive: initial?.isActive ?? true,
  }));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const update = <K extends keyof ScenarioFormValues>(k: K, v: ScenarioFormValues[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const trigger = TRIGGER_OPTIONS.find((t) => t.value === values.triggerType);

  const handleSubmit = async () => {
    setErrors({});
    const parsed = scenarioSchema.safeParse(values);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const k = issue.path[0] as string;
        if (k) fe[k] = issue.message;
      });
      setErrors(fe);
      return;
    }

    // Parse conditions JSON
    let conditions: Record<string, unknown> | null = null;
    if (parsed.data.conditionsJson?.trim()) {
      try {
        conditions = JSON.parse(parsed.data.conditionsJson);
      } catch {
        setErrors({ conditionsJson: 'JSON khong hop le' });
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: CreateScenarioInput = {
        name: parsed.data.name,
        description: parsed.data.description,
        triggerType: parsed.data.triggerType,
        triggerValue: parsed.data.triggerValue,
        conditions,
        response: parsed.data.response,
        responseType: parsed.data.responseType,
        followUpScenarioId: parsed.data.followUpScenarioId || null,
        delayMs: parsed.data.delayMs,
        priority: parsed.data.priority,
        isActive: parsed.data.isActive,
      };
      const res = await onSubmit(body);
      if (res) {
        toast('Lưu thành công', undefined, 'success');
        router.push('/admin/chat-scenarios');
      }
    } catch (err) {
      toast('Lưu Thất bại', (err as Error).message, 'destructive');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Thong tin co ban */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Ten kich ban" error={errors.name} required>
              <Input
                value={values.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Vd: Chao khach moi"
              />
            </FormField>
            <FormField label="Mô tả" error={errors.description}>
              <Textarea
                rows={2}
                value={values.description ?? ''}
                onChange={(e) => update('description', e.target.value)}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Trigger */}
        <Card>
          <CardHeader>
            <CardTitle>Dieu kien kich hoat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Loại trigger" required>
              <Select
                value={values.triggerType}
                onValueChange={(v) => update('triggerType', v as ScenarioTriggerType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Gia tri trigger"
              error={errors.triggerValue}
              description={trigger?.hint}
              required={values.triggerType !== 'fallback'}
            >
              {values.triggerType === 'keyword' ? (
                <Textarea
                  rows={2}
                  value={values.triggerValue}
                  onChange={(e) => update('triggerValue', e.target.value)}
                  placeholder="chao, hello, xin chao"
                />
              ) : (
                <Input
                  value={values.triggerValue}
                  onChange={(e) => update('triggerValue', e.target.value)}
                />
              )}
            </FormField>

            <FormField
              label="Dieu kien bo sung (JSON)"
              error={errors.conditionsJson}
              description='Vd: {"timeOfDay": "morning", "isVip": true}'
            >
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={values.conditionsJson ?? ''}
                onChange={(e) => update('conditionsJson', e.target.value)}
                placeholder="{}"
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Response */}
        <Card>
          <CardHeader>
            <CardTitle>Phản hồi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Loại Phản hồi">
              <Select
                value={values.responseType}
                onValueChange={(v) => update('responseType', v as ScenarioResponseType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Nội dung Phản hồi"
              error={errors.response}
              description="Hỗ trợ bien {{customer_name}}, {{order_code}}, {{product_name}}..."
              required
            >
              <Textarea
                rows={6}
                value={values.response}
                onChange={(e) => update('response', e.target.value)}
                placeholder="Chao {{customer_name}}! Toi co the giup gi cho ban?"
              />
            </FormField>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-gray-500">Xem truoc</p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
                {values.response ? renderPreview(values.response) : <span className="text-gray-400">(trong)</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cau hinh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Kich ban tiep theo" description="Chay sau khi kich ban nay ket thuc">
              <Select
                value={values.followUpScenarioId || '__none__'}
                onValueChange={(v) => update('followUpScenarioId', v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Không --" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">-- Không --</SelectItem>
                  {scenarios
                    .filter((s) => s.id !== initial?.id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Do tre (ms)" error={errors.delayMs}>
              <Input
                type="number"
                min={0}
                max={300000}
                value={values.delayMs}
                onChange={(e) => update('delayMs', Number(e.target.value))}
              />
            </FormField>
            <FormField label="Do uu tien" error={errors.priority} description="So lon hon = uu tien hon">
              <Input
                type="number"
                min={0}
                max={1000}
                value={values.priority}
                onChange={(e) => update('priority', Number(e.target.value))}
              />
            </FormField>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              <div>
                <p className="text-sm font-medium">Kích hoạt</p>
                <p className="text-xs text-gray-500">Cho phep scenario chay</p>
              </div>
              <Switch checked={values.isActive} onCheckedChange={(c) => update('isActive', c)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Lưu
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => router.push('/admin/chat-scenarios')}>
            Huy
          </Button>
        </div>
      </div>
    </div>
  );
}
