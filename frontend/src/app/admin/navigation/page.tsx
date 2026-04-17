'use client';

import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Link as LinkIcon } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { useToast } from '@/lib/hooks/use-toast';
import type { ApiResponse } from '@/lib/types';
import type { NavigationGroup, NavigationItem } from '@/lib/api/modules/navigation.api';

const itemSchema = z.object({
  label: z.string().min(1, 'Nhan la bat buoc').max(100),
  url: z.string().min(1, 'URL la bat buoc'),
  icon: z.string().optional(),
  parent_id: z.string().optional().nullable(),
  sort_order: z.number().int().min(0),
  is_external: z.boolean(),
  is_active: z.boolean(),
});

type ItemForm = z.infer<typeof itemSchema>;

const emptyItem: ItemForm = {
  label: '',
  url: '',
  icon: '',
  parent_id: null,
  sort_order: 0,
  is_external: false,
  is_active: true,
};

/** Quan ly Navigation — header, footer, sidebar... */
export default function NavigationPage() {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ItemForm>(emptyItem);

  const { data: groupsData, loading: loadingGroups } = useApi<ApiResponse<NavigationGroup[]>>(
    '/admin/navigation/groups',
  );
  const groups = useMemo(() => groupsData?.data ?? [], [groupsData]);

  // Mac dinh chon group dau tien
  const activeGroup = selectedGroup ?? groups[0]?.id ?? null;

  const { data: itemsData, loading: loadingItems, refetch: refetchItems } = useApi<
    ApiResponse<NavigationItem[]>
  >(activeGroup ? `/admin/navigation/groups/${activeGroup}/items` : null);
  const items = itemsData?.data ?? [];

  const saveMutation = useMutation(
    editingId ? 'PATCH' : 'POST',
    editingId ? `/admin/navigation/items/${editingId}` : '/admin/navigation/items',
  );
  const deleteMutation = useMutation(
    'DELETE',
    deleteId ? `/admin/navigation/items/${deleteId}` : '',
  );
  const reorderMutation = useMutation(
    'POST',
    activeGroup ? `/admin/navigation/groups/${activeGroup}/reorder` : '',
  );

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyItem, sort_order: items.length });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (item: NavigationItem) => {
    setEditingId(item.id);
    setForm({
      label: item.label,
      url: item.url,
      icon: item.icon ?? '',
      parent_id: item.parent_id,
      sort_order: item.sort_order,
      is_external: item.is_external,
      is_active: item.is_active,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = itemSchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => {
        fe[e.path[0] as string] = e.message;
      });
      setErrors(fe);
      return;
    }
    const payload: Record<string, unknown> = { ...result.data, group_id: activeGroup };
    if (!payload.parent_id) delete payload.parent_id;
    const res = await saveMutation.mutate(payload);
    if (res) {
      setDialogOpen(false);
      refetchItems();
      toast(editingId ? 'Da cap nhat' : 'Da them muc', undefined, 'success');
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutate();
    setDeleteId(null);
    refetchItems();
  };

  const move = async (item: NavigationItem, direction: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((i) => i.id === item.id);
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= sorted.length) return;
    [sorted[idx], sorted[target]] = [sorted[target], sorted[idx]];
    const payload = sorted.map((it, i) => ({ id: it.id, sort_order: i, parent_id: it.parent_id }));
    await reorderMutation.mutate({ items: payload });
    refetchItems();
  };

  // Sort va group theo parent_id
  const topLevelItems = items
    .filter((i) => !i.parent_id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const childrenByParent = useMemo(() => {
    const m = new Map<string, NavigationItem[]>();
    items.forEach((i) => {
      if (i.parent_id) {
        const arr = m.get(i.parent_id) ?? [];
        arr.push(i);
        m.set(i.parent_id, arr);
      }
    });
    m.forEach((arr) => arr.sort((a, b) => a.sort_order - b.sort_order));
    return m;
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly Navigation"
        description="Cau hinh menu header, footer, sidebar..."
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Navigation' },
        ]}
        actions={
          activeGroup && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Them muc
            </Button>
          )
        }
      />

      {loadingGroups ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            Chua co navigation group nao. Vui long tao o backend seed.
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeGroup ?? groups[0].id} onValueChange={setSelectedGroup}>
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            {groups.map((g) => (
              <TabsTrigger key={g.id} value={g.id}>{g.name}</TabsTrigger>
            ))}
          </TabsList>

          {groups.map((g) => (
            <TabsContent key={g.id} value={g.id} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>{g.name}</CardTitle>
                  {g.description && <p className="text-sm text-gray-500">{g.description}</p>}
                </CardHeader>
                <CardContent>
                  {loadingItems ? (
                    <Skeleton className="h-40" />
                  ) : topLevelItems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">Chua co muc nao</p>
                  ) : (
                    <ul className="space-y-2">
                      {topLevelItems.map((item, idx) => (
                        <li key={item.id}>
                          <NavItemRow
                            item={item}
                            onEdit={openEdit}
                            onDelete={(id) => setDeleteId(id)}
                            onMoveUp={idx > 0 ? () => move(item, 'up') : undefined}
                            onMoveDown={
                              idx < topLevelItems.length - 1 ? () => move(item, 'down') : undefined
                            }
                          />
                          {childrenByParent.get(item.id)?.map((child) => (
                            <div key={child.id} className="ml-6 mt-2">
                              <NavItemRow item={child} onEdit={openEdit} onDelete={(id) => setDeleteId(id)} />
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Dialog them/sua item */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chinh sua muc menu' : 'Them muc menu'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Nhan" error={errors.label} required>
              <Input
                value={form.label}
                onChange={(e) => { setForm((p) => ({ ...p, label: e.target.value })); setErrors((p) => ({ ...p, label: '' })); }}
              />
            </FormField>
            <FormField label="URL" error={errors.url} required>
              <Input
                value={form.url}
                onChange={(e) => { setForm((p) => ({ ...p, url: e.target.value })); setErrors((p) => ({ ...p, url: '' })); }}
                placeholder="/about hoac https://..."
              />
            </FormField>
            <FormField label="Icon (ten lucide)">
              <Input
                value={form.icon ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                placeholder="VD: home, users, settings"
              />
            </FormField>
            <FormField label="Muc cha (parent)">
              <Select
                value={form.parent_id ?? 'none'}
                onValueChange={(v) => setForm((p) => ({ ...p, parent_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger><SelectValue placeholder="Khong co" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Khong co (muc chinh)</SelectItem>
                  {topLevelItems
                    .filter((i) => i.id !== editingId)
                    .map((i) => (
                      <SelectItem key={i.id} value={i.id}>{i.label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Thu tu sap xep">
              <Input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((p) => ({ ...p, sort_order: Number(e.target.value) }))}
              />
            </FormField>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Link ngoai</span>
              <Switch
                checked={form.is_external}
                onCheckedChange={(c) => setForm((p) => ({ ...p, is_external: c }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hien thi</span>
              <Switch
                checked={form.is_active}
                onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Huy</Button>
            <Button onClick={handleSave} disabled={saveMutation.loading}>
              {saveMutation.loading ? 'Dang luu...' : 'Luu'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Xoa muc menu"
        description="Xoa muc nay? Cac muc con cung se bi xoa."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}

interface NavItemRowProps {
  item: NavigationItem;
  onEdit: (item: NavigationItem) => void;
  onDelete: (id: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function NavItemRow({ item, onEdit, onDelete, onMoveUp, onMoveDown }: NavItemRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50">
      <div className="flex items-center gap-3 min-w-0">
        <LinkIcon className="h-4 w-4 text-gray-400 shrink-0" />
        <div className="min-w-0">
          <p className="font-medium truncate">{item.label}</p>
          <p className="text-xs text-gray-500 font-mono truncate">{item.url}</p>
        </div>
        {item.is_external && <Badge variant="secondary" className="text-xs">External</Badge>}
        {!item.is_active && <Badge variant="destructive" className="text-xs">An</Badge>}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" disabled={!onMoveUp} onClick={onMoveUp}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={!onMoveDown} onClick={onMoveDown}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
          <Trash2 className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    </div>
  );
}
