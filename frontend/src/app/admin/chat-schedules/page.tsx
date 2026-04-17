'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Power, Clock } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/lib/hooks/use-toast';
import { adminChatApi, type ChatSchedule } from '@/lib/api/modules/admin-chat.api';
import type { ChatMode } from '@/lib/types/chat';
import { cn } from '@/lib/utils';

const DAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

const MODE_CLS: Record<ChatMode, string> = {
  ai: 'bg-purple-100 text-purple-700',
  human: 'bg-blue-100 text-blue-700',
  hybrid: 'bg-indigo-100 text-indigo-700',
  offline: 'bg-gray-100 text-gray-500',
};

const MODE_LABELS: Record<ChatMode, string> = {
  ai: 'AI',
  human: 'Nhan vien',
  hybrid: 'Ket hop',
  offline: 'Offline',
};

/** Convert "HH:mm" -> minutes tu 00:00 */
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Render timeline 7 days × 24h — moi slot 1h */
function WeekTimeline({ schedules }: { schedules: ChatSchedule[] }) {
  // Cell[day][hour] = schedule match uu tien cao nhat
  const grid: Array<Array<ChatSchedule | null>> = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => null),
  );

  const active = schedules.filter((s) => s.isActive).sort((a, b) => b.priority - a.priority);
  for (const sched of active) {
    const startH = Math.floor(toMinutes(sched.startTime) / 60);
    const endH = Math.ceil(toMinutes(sched.endTime) / 60);
    for (const day of sched.daysOfWeek) {
      for (let h = startH; h < endH && h < 24; h++) {
        if (!grid[day][h]) grid[day][h] = sched;
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Lich theo tuan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-0.5 text-[10px]">
            <div />
            {Array.from({ length: 24 }).map((_, h) => (
              <div key={h} className="text-center text-gray-400">
                {h}
              </div>
            ))}
            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
              <React.Fragment key={day}>
                <div className="pr-2 text-right font-medium text-gray-600">{DAY_LABELS[day]}</div>
                {grid[day].map((slot, h) => (
                  <div
                    key={h}
                    className={cn(
                      'h-5 rounded-sm',
                      slot ? MODE_CLS[slot.mode] : 'bg-gray-50 dark:bg-gray-800',
                    )}
                    title={slot ? `${slot.name} (${MODE_LABELS[slot.mode]})` : ''}
                  />
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {(Object.keys(MODE_LABELS) as ChatMode[]).map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <span className={cn('inline-block h-3 w-3 rounded-sm', MODE_CLS[m])} />
              <span>{MODE_LABELS[m]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Danh sach khung gio chatbot / staff */
export default function ChatSchedulesPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<ChatSchedule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminChatApi.listSchedules();
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setItems(data);
    } catch (err) {
      toast('Khong tai duoc', (err as Error).message, 'destructive');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminChatApi.deleteSchedule(deleteId);
      toast('Da xoa khung gio', undefined, 'success');
      setDeleteId(null);
      load();
    } catch (err) {
      toast('Xoa that bai', (err as Error).message, 'destructive');
    }
  };

  const toggleActive = async (row: ChatSchedule) => {
    try {
      await adminChatApi.updateSchedule(row.id, { isActive: !row.isActive });
      load();
    } catch (err) {
      toast('Cap nhat that bai', (err as Error).message, 'destructive');
    }
  };

  const columns: ColumnDef<ChatSchedule>[] = [
    {
      key: 'name',
      header: 'Ten',
      sortable: true,
      render: (row) => <p className="font-medium">{row.name}</p>,
    },
    {
      key: 'daysOfWeek',
      header: 'Ngay',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.daysOfWeek
            .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
            .map((d) => (
              <span key={d} className="inline-flex h-5 w-7 items-center justify-center rounded bg-gray-100 text-[10px] font-medium">
                {DAY_LABELS[d]}
              </span>
            ))}
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Khung gio',
      render: (row) => (
        <span className="font-mono text-xs">
          {row.startTime} — {row.endTime}
        </span>
      ),
    },
    {
      key: 'mode',
      header: 'Che do',
      render: (row) => (
        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', MODE_CLS[row.mode])}>
          {MODE_LABELS[row.mode]}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Uu tien',
      sortable: true,
    },
    {
      key: 'isActive',
      header: 'Trang thai',
      render: (row) => (
        <StatusBadge
          status={row.isActive ? 'active' : 'inactive'}
          label={row.isActive ? 'Dang bat' : 'Tat'}
        />
      ),
    },
  ];

  const actions: ActionDef<ChatSchedule>[] = [
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => router.push(`/admin/chat-schedules/${row.id}/edit`),
    },
    {
      label: 'Bat/Tat',
      icon: <Power className="h-4 w-4 mr-2" />,
      onClick: (row) => toggleActive(row),
    },
    {
      label: 'Xoa',
      icon: <Trash2 className="h-4 w-4 mr-2" />,
      variant: 'destructive',
      onClick: (row) => setDeleteId(row.id),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khung gio cham soc"
        description="Dinh nghia gio lam viec cua nhan vien va AI"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Cham soc khach hang' },
          { label: 'Khung gio' },
        ]}
        actions={
          <Button onClick={() => router.push('/admin/chat-schedules/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Them khung gio
          </Button>
        }
      />

      {!loading && items.length > 0 && <WeekTimeline schedules={items} />}

      <DataTable columns={columns} data={items} loading={loading} actions={actions} />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa khung gio"
        description="Ban co chac muon xoa khung gio nay?"
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
      />
    </div>
  );
}
