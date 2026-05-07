'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { slugify } from '@/lib/utils/format';
import type { ApiResponse, Product } from '@/lib/types';

const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm là bắt buộc').max(255, 'Tên sản phẩm tối đa 255 ký tự'),
  slug: z.string().min(1, 'Slug là bắt buộc'),
  short_description: z.string().max(500, 'Mô tả ngắn tối đa 500 ký tự').optional(),
  description: z.string().optional(),
  price: z.number({ error: 'Giá phải là số' }).min(0, 'Giá không được âm'),
  compare_at_price: z.number().min(0, 'Giá so sánh không được âm').optional().nullable(),
  cost_price: z.number().min(0, 'Giá vốn không được âm').optional().nullable(),
  category_id: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  seo_title: z.string().max(70, 'SEO title toi da 70 ky tu').optional(),
  seo_description: z.string().max(160, 'SEO description toi da 160 ky tu').optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  price: string;
  attributes: string;
}

/** Chỉnh sửa san pham */
export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<ProductFormData>({
    name: '', slug: '', short_description: '', description: '',
    price: 0, compare_at_price: null, cost_price: null,
    category_id: null, sku: '', is_active: true, is_featured: false,
    seo_title: '', seo_description: '',
  });
  const [variants, setVariants] = useState<VariantRow[]>([]);

  const { data, loading } = useApi<ApiResponse<Product>>(`/admin/products/${id}`);
  const updateMutation = useMutation('PUT', `/admin/products/${id}`);
  const deleteMutation = useMutation('DELETE', `/admin/products/${id}`);

  // Load du lieu san pham vao form
  useEffect(() => {
    if (data?.data) {
      const p = data.data;
      setForm({
        name: p.name, slug: p.slug,
        short_description: p.short_description ?? '',
        description: p.description ?? '',
        price: p.price,
        compare_at_price: p.compare_at_price,
        cost_price: p.cost_price,
        category_id: p.category_id,
        sku: p.sku ?? '',
        is_active: p.is_active,
        is_featured: p.is_featured,
        seo_title: '', seo_description: '',
      });
      if (p.variants) {
        setVariants(p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku ?? '',
          price: String(v.price),
          attributes: JSON.stringify(v.attributes),
        })));
      }
    }
  }, [data]);

  const updateField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: '', sku: '', price: '', attributes: '' }]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantRow, value: string) => {
    setVariants((prev) => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = productSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err: any) => {
        fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      ...result.data,
      variants: variants.filter((v) => v.name).map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku || null,
        price: parseFloat(v.price) || result.data.price,
        attributes: v.attributes ? JSON.parse(v.attributes) : {},
      })),
    };

    const res = await updateMutation.mutate(payload);
    if (res) router.push('/admin/products');
  };

  const handleDelete = async () => {
    const res = await deleteMutation.mutate();
    if (res !== null) router.push('/admin/products');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chỉnh sửa: ${form.name || '...'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Sản phẩm', href: '/admin/products' },
          { label: 'Chỉnh sửa' },
        ]}
        actions={
          <Button variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Thong tin co ban */}
            <Card>
              <CardHeader><CardTitle>Thông tin cơ bản</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Tên sản phẩm" error={errors.name} required htmlFor="name">
                  <Input id="name" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
                </FormField>
                <FormField label="Slug" error={errors.slug} required htmlFor="slug">
                  <Input id="slug" value={form.slug} onChange={(e) => updateField('slug', e.target.value)} />
                </FormField>
                <FormField label="Mô tả ngắn" error={errors.short_description} htmlFor="short_description">
                  <Textarea
                    id="short_description"
                    value={form.short_description ?? ''}
                    onChange={(e) => updateField('short_description', e.target.value)}
                    rows={2}
                  />
                </FormField>
                <FormField label="Mô tả chi tiết" error={errors.description} htmlFor="description">
                  <Textarea
                    id="description"
                    value={form.description ?? ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={6}
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Gia */}
            <Card>
              <CardHeader><CardTitle>Giá cả</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Giá bán" error={errors.price} required>
                    <Input type="number" value={form.price} onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)} />
                  </FormField>
                  <FormField label="Giá so sánh" error={errors.compare_at_price}>
                    <Input type="number" value={form.compare_at_price ?? ''} onChange={(e) => updateField('compare_at_price', e.target.value ? parseFloat(e.target.value) : null)} />
                  </FormField>
                  <FormField label="Giá vốn" error={errors.cost_price}>
                    <Input type="number" value={form.cost_price ?? ''} onChange={(e) => updateField('cost_price', e.target.value ? parseFloat(e.target.value) : null)} />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader><CardTitle>Hình ảnh</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-400 text-sm">Kéo thả hình ảnh vào đây hoặc click để chọn file</p>
                  <Button type="button" variant="outline" className="mt-3" size="sm">Chọn hình ảnh</Button>
                </div>
              </CardContent>
            </Card>

            {/* Bien the */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Biến thể sản phẩm</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" /> Thêm biến thể
                </Button>
              </CardHeader>
              <CardContent>
                {variants.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">Chưa có biến thể nào.</p>
                ) : (
                  <div className="space-y-3">
                    {variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <Input placeholder="Tên" value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} />
                        </div>
                        <div className="col-span-3">
                          <Input placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, 'sku', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                          <Input type="number" placeholder="Giá" value={v.price} onChange={(e) => updateVariant(i, 'price', e.target.value)} />
                        </div>
                        <div className="col-span-3">
                          <Input placeholder="Attributes" value={v.attributes} onChange={(e) => updateVariant(i, 'attributes', e.target.value)} />
                        </div>
                        <div className="col-span-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeVariant(i)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="SEO Title" error={errors.seo_title} description="Tối đa 70 ký tự">
                  <Input value={form.seo_title ?? ''} onChange={(e) => updateField('seo_title', e.target.value)} maxLength={70} />
                </FormField>
                <FormField label="SEO Description" error={errors.seo_description} description="Tối đa 160 ký tự">
                  <Textarea value={form.seo_description ?? ''} onChange={(e) => updateField('seo_description', e.target.value)} rows={3} maxLength={160} />
                </FormField>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Tổ chức</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Danh mục">
                  <Select value={form.category_id ?? ''} onValueChange={(val) => updateField('category_id', val || null)}>
                    <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Không có</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="SKU">
                  <Input value={form.sku ?? ''} onChange={(e) => updateField('sku', e.target.value)} />
                </FormField>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Trạng thái</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Đang bán</span>
                  <Switch checked={form.is_active} onCheckedChange={(c) => updateField('is_active', c)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nổi bật</span>
                  <Switch checked={form.is_featured} onCheckedChange={(c) => updateField('is_featured', c)} />
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={updateMutation.loading}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.loading ? 'Đang lưu...' : 'Cập nhật'}
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/admin/products')}>
                <X className="h-4 w-4 mr-2" /> Hủy
              </Button>
            </div>

            {updateMutation.error && <p className="text-sm text-red-500">{updateMutation.error}</p>}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Xóa sản phẩm"
        description="Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác."
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
