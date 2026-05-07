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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/lib/hooks/use-toast';
import type {
  ChatSchedule,
  CreateScheduleInput,
} from '@/lib/api/modules/admin-chat.api';
import type { ChatMode } from '@/lib/types/chat';

/** Day-of-week mapping — 0=CN, 1=T2,...6=T7 (chuan JS Date.getDay) */
const DAYS = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 0, label: 'CN' },
];

const MODE_OPTIONS: Array<{ value: ChatMode; label: string }> = [
  { value: 'ai', label: 'AI tự động' },
  { value: 'human', label: 'Nhân viên' },
  { value: 'hybrid', label: 'Kết hợp' },
  { value: 'offline', label: 'Offline' },
];

export const scheduleSchema = z.object({
  name: z.string().min(2, 'Tối thiểu 2 Ký tự').max(100),
  daysOfWeek: z.array(z.number()).min(1, 'Chọn ít nhất 1 ngày'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Định dạng HH:mm'),
  mode: z.enum(['ai', 'human', 'hybrid', 'offline']),
  timezone: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(1000).default(100),
  fallbackMessage: z.string().max(500).optional(),
  isActive: z.boolean(),
});

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface Props {
  initial?: ChatSchedule;
  onSubmit: (data: CreateScheduleInput) => Promise<ChatSchedule | null>;
}

/**
 * Form tao/sua schedule — dung chung cho new/edit page.
 */
export function ScheduleForm({ initial, onSubmit }: Props) {
  const router = useRouter();
  const [values, setValues] = React.useState<ScheduleFormValues>(() => ({
    name: initial?.name ?? '',
    daysOfWeek: initial?.daysOfWeek ?? [1, 2, 3, 4, 5],
    startTime: initial?.startTime ?? '09:00',
    endTime: initial?.endTime ?? '18:00',
    mode: initial?.mode ?? 'human',
    timezone: initial?.timezone ?? 'Asia/Ho_Chi_Minh',
    priority: initial?.priority ?? 100,
    fallbackMessage: initial?.fallbackMessage ?? '',
    isActive: initial?.isActive ?? true,
  }));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  const update = <K extends keyof ScheduleFormValues>(k: K, v: ScheduleFormValues[K]) => {
    setValues((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const toggleDay = (day: number) => {
    setValues((p) => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(day) ? p.daysOfWeek.filter((d) => d !== day) : [...p.daysOfWeek, day],
    }));
  };

  const handleSubmit = async () => {
    setErrors({});
    const parsed = scheduleSchema.safeParse(values);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const k = issue.path[0] as string;
        if (k) fe[k] = issue.message;
      });
      setErrors(fe);
      return;
    }

    // Check startTime < endTime
    if (parsed.data.startTime >= parsed.data.endTime) {
      setErrors({ endTime: 'Giờ kết thúc phải sau giờ bắt đầu' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await onSubmit(parsed.data);
      if (res) {
        toast('Lưu thành công', undefined, 'success');
        router.push('/admin/chat-schedules');
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
        <Card>
          <CardHeader>
            <CardTitle>Thông tin khung giờ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Tên khung giờ" error={errors.name} required>
              <Input
                value={values.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="Vd: Giờ hành chính"
              />
            </FormField>

            <FormField label="Ngày trong tuần" error={errors.daysOfWeek} required>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const checked = values.daysOfWeek.includes(d.value);
                  return (
                    <label
                      key={d.value}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                        checked
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40'
                          : 'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggleDay(d.value)} />
                      <span>{d.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-2 flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => update('daysOfWeek', [1, 2, 3, 4, 5])}>
                  T2-T6
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => update('daysOfWeek', [0, 1, 2, 3, 4, 5, 6])}>
                  Tất cả
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => update('daysOfWeek', [0, 6])}>
                  Cuối tuần
                </Button>
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Giờ bắt đầu" error={errors.startTime} required>
                <Input
                  type="time"
                  value={values.startTime}
                  onChange={(e) => update('startTime', e.target.value)}
                />
              </FormField>
              <FormField label="Giờ kết thúc" error={errors.endTime} required>
                <Input
                  type="time"
                  value={values.endTime}
                  onChange={(e) => update('endTime', e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Timezone">
              <Input
                value={values.timezone ?? ''}
                onChange={(e) => update('timezone', e.target.value)}
                placeholder="Asia/Ho_Chi_Minh"
              />
            </FormField>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chế độ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Chế độ xử lý">
              <Select value={values.mode} onValueChange={(v) => update('mode', v as ChatMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Tin nhắn mặc định"
              error={errors.fallbackMessage}
              description="Hiện khi không có nhân viên online (nếu mode = offline)"
            >
              <Textarea
                rows={3}
                value={values.fallbackMessage ?? ''}
                onChange={(e) => update('fallbackMessage', e.target.value)}
                placeholder="Chúng tôi sẽ phản hồi trong giờ làm việc..."
              />
            </FormField>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Độ ưu tiên" error={errors.priority} description="Số lớn hơn = ưu tiên hơn">
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
                <p className="text-xs text-gray-500">Khung giờ có hiệu lực</p>
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
          <Button variant="ghost" className="w-full" onClick={() => router.push('/admin/chat-schedules')}>
            Hủy
          </Button>
        </div>
      </div>
    </div>
  );
}
