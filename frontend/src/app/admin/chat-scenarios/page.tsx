'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, type ColumnDef, type ActionDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { toast } from '@/lib/hooks/use-toast';
import { adminChatApi, type ChatScenario, type ScenarioTriggerType } from '@/lib/api/modules/admin-chat.api';

const TRIGGER_LABELS: Record<ScenarioTriggerType, string> = {
  keyword: 'Tu khoa',
  intent: 'Intent',
  event: 'Su kien',
  fallback: 'Fallback',
  schedule: 'Lich',
};

/** Danh sach kich ban chatbot */
export default function ChatScenariosPage() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = React.useState<'all' | ScenarioTriggerType>('all');
  const [activeFilter, setActiveFilter] = React.useState<'all' | 'true' | 'false'>('all');
  const [items, setItems] = React.useState<ChatScenario[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminChatApi.listScenarios({
        type: typeFilter,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
      });
      const data = Array.isArray(res) ? res : (res?.data ?? []);
      setItems(data);
    } catch (err) {
      toast('Khong tai duoc', (err as Error).message, 'destructive');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, activeFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await adminChatApi.deleteScenario(deleteId);
      toast('Da xoa kich ban', undefined, 'success');
      setDeleteId(null);
      load();
    } catch (err) {
      toast('Xoa that bai', (err as Error).message, 'destructive');
    }
  };

  const toggleActive = async (row: ChatScenario) => {
    try {
      await adminChatApi.updateScenario(row.id, { isActive: !row.isActive });
      load();
    } catch (err) {
      toast('Cap nhat that bai', (err as Error).message, 'destructive');
    }
  };

  const columns: ColumnDef<ChatScenario>[] = [
    {
      key: 'name',
      header: 'Ten',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && (
            <p className="truncate text-xs text-gray-500">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'triggerType',
      header: 'Loai',
      render: (row) => (
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
          {TRIGGER_LABELS[row.triggerType]}
        </span>
      ),
    },
    {
      key: 'triggerValue',
      header: 'Gia tri',
      render: (row) => (
        <p className="max-w-[200px] truncate font-mono text-xs" title={row.triggerValue}>
          {row.triggerValue || '—'}
        </p>
      ),
    },
    {
      key: 'priority',
      header: 'Uu tien',
      sortable: true,
      render: (row) => <span>{row.priority}</span>,
    },
    {
      key: 'matchCount',
      header: 'Luot khop',
      render: (row) => <span className="text-gray-600">{row.matchCount ?? 0}</span>,
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

  const actions: ActionDef<ChatScenario>[] = [
    {
      label: 'Chinh sua',
      icon: <Pencil className="h-4 w-4 mr-2" />,
      onClick: (row) => router.push(`/admin/chat-scenarios/${row.id}/edit`),
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
        title="Kich ban chatbot"
        description="Quan ly cac kich ban tu dong phan hoi khach"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Cham soc khach hang' },
          { label: 'Kich ban' },
        ]}
        actions={
          <Button onClick={() => router.push('/admin/chat-scenarios/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Tao kich ban
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Loai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca loai</SelectItem>
            {Object.entries(TRIGGER_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as typeof activeFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trang thai" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tat ca</SelectItem>
            <SelectItem value="true">Dang bat</SelectItem>
            <SelectItem value="false">Tat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        actions={actions}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa kich ban"
        description="Ban co chac muon xoa kich ban nay? Hanh dong khong the hoan tac."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
      />
    </div>
  );
}
