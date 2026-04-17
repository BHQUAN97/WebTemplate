'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { slugify } from '@/lib/utils/format';
import type { ApiResponse, Category } from '@/lib/types';

const categorySchema = z.object({
  name: z.string().min(1, 'Ten danh muc la bat buoc').max(100, 'Toi da 100 ky tu'),
  slug: z.string().min(1, 'Slug la bat buoc'),
  description: z.string().optional(),
  parent_id: z.string().optional().nullable(),
  type: z.string().min(1, 'Loai la bat buoc'),
  image_url: z.string().optional().nullable(),
  position: z.number().min(0, 'Thu tu khong duoc am'),
  is_active: z.boolean(),
});

type CategoryForm = z.infer<typeof categorySchema>;

const TYPES = [
  { value: 'product', label: 'San pham' },
  { value: 'article', label: 'Bai viet' },
  { value: 'faq', label: 'FAQ' },
  { value: 'general', label: 'Chung' },
];

/** Quan ly danh muc */
export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState('product');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<CategoryForm>({
    name: '', slug: '', description: '', parent_id: null,
    type: 'product', image_url: null, position: 0, is_active: true,
  });

  const { data, loading, refetch } = useApi<ApiResponse<Category[]>>('/admin/categories', { type: activeTab });
  const categories = data?.data ?? [];

  const saveMutation = useMutation(editingId ? 'PUT' : 'POST', editingId ? `/admin/categories/${editingId}` : '/admin/categories');
  const deleteMutation = useMutation('DELETE', `/admin/categories/${deleteId}`);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', slug: '', description: '', parent_id: null, type: activeTab, image_url: null, position: 0, is_active: true });
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description ?? '',
      parent_id: cat.parent_id, type: activeTab, image_url: cat.image_url,
      position: cat.position, is_active: cat.is_active,
    });
    setErrors({});
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const result = categorySchema.safeParse(form);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const res = await saveMutation.mutate(result.data);
    if (res) {
      setDialogOpen(false);
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutate();
    setDeleteId(null);
    refetch();
  };

  // Render danh muc (co indent theo level)
  const renderCategories = (items: Category[], level = 0): React.ReactNode => {
    return items.map((cat) => (
      <React.Fragment key={cat.id}>
        <TableRow>
          <TableCell>
            <span style={{ paddingLeft: `${level * 24}px` }} className="inline-flex items-center gap-1">
              {level > 0 && <span className="text-gray-300">&#x2514;</span>}
              {cat.name}
            </span>
          </TableCell>
          <TableCell className="text-gray-500">{cat.slug}</TableCell>
          <TableCell>
            <StatusBadge status={cat.is_active ? 'active' : 'inactive'} label={cat.is_active ? 'Hoat dong' : 'An'} />
          </TableCell>
          <TableCell>{cat.position}</TableCell>
          <TableCell>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(cat.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
        {cat.children && cat.children.length > 0 && renderCategories(cat.children, level + 1)}
      </React.Fragment>
    ));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quan ly danh muc"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Danh muc' },
        ]}
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Them danh muc
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {TYPES.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="rounded-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ten danh muc</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead>Thu tu</TableHead>
                  <TableHead className="w-24">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                      Chua co danh muc nao
                    </TableCell>
                  </TableRow>
                ) : (
                  renderCategories(categories)
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog tao/sua danh muc */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Chinh sua danh muc' : 'Them danh muc moi'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <FormField label="Ten danh muc" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) => {
                  setForm((p) => ({ ...p, name: e.target.value, slug: slugify(e.target.value) }));
                  setErrors((p) => ({ ...p, name: '' }));
                }}
              />
            </FormField>
            <FormField label="Slug" error={errors.slug} required>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
            </FormField>
            <FormField label="Mo ta" error={errors.description}>
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Loai" error={errors.type} required>
                <Select value={form.type} onValueChange={(val) => setForm((p) => ({ ...p, type: val }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Danh muc cha">
                <Select value={form.parent_id ?? 'none'} onValueChange={(val) => setForm((p) => ({ ...p, parent_id: val === 'none' ? null : val }))}>
                  <SelectTrigger><SelectValue placeholder="Khong co" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Khong co</SelectItem>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <FormField label="Thu tu sap xep" error={errors.position}>
              <Input type="number" value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: parseInt(e.target.value) || 0 }))} />
            </FormField>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Hoat dong</span>
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm((p) => ({ ...p, is_active: c }))} />
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
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Xoa danh muc"
        description="Ban co chac chan muon xoa danh muc nay? Cac danh muc con cung se bi anh huong."
        onConfirm={handleDelete}
        confirmLabel="Xoa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
