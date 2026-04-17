'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useMutation } from '@/lib/hooks/use-api';
import { slugify } from '@/lib/utils/format';

// Zod schema voi thong bao tieng Viet
const productSchema = z.object({
  name: z.string().min(1, 'Ten san pham la bat buoc').max(255, 'Ten san pham toi da 255 ky tu'),
  slug: z.string().min(1, 'Slug la bat buoc'),
  short_description: z.string().max(500, 'Mo ta ngan toi da 500 ky tu').optional(),
  description: z.string().optional(),
  price: z.number({ error: 'Gia phai la so' }).min(0, 'Gia khong duoc am'),
  compare_at_price: z.number().min(0, 'Gia so sanh khong duoc am').optional().nullable(),
  cost_price: z.number().min(0, 'Gia von khong duoc am').optional().nullable(),
  category_id: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  seo_title: z.string().max(70, 'SEO title toi da 70 ky tu').optional(),
  seo_description: z.string().max(160, 'SEO description toi da 160 ky tu').optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface VariantRow {
  name: string;
  sku: string;
  price: string;
  attributes: string;
}

/** Tao san pham moi */
export default function NewProductPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ProductFormData>({
    name: '',
    slug: '',
    short_description: '',
    description: '',
    price: 0,
    compare_at_price: null,
    cost_price: null,
    category_id: null,
    sku: '',
    is_active: true,
    is_featured: false,
    seo_title: '',
    seo_description: '',
  });
  const [variants, setVariants] = useState<VariantRow[]>([]);

  const createMutation = useMutation('POST', '/admin/products');

  // Tu dong tao slug tu ten
  useEffect(() => {
    if (form.name) {
      setForm((prev) => ({ ...prev, slug: slugify(form.name) }));
    }
  }, [form.name]);

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
        const key = err.path[0] as string;
        fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const payload = {
      ...result.data,
      variants: variants.filter((v) => v.name).map((v) => ({
        name: v.name,
        sku: v.sku || null,
        price: parseFloat(v.price) || result.data.price,
        attributes: v.attributes ? JSON.parse(v.attributes) : {},
      })),
    };

    const res = await createMutation.mutate(payload);
    if (res) {
      router.push('/admin/products');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Them san pham moi"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'San pham', href: '/admin/products' },
          { label: 'Them moi' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cot chinh */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thong tin co ban */}
            <Card>
              <CardHeader><CardTitle>Thong tin co ban</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Ten san pham" error={errors.name} required htmlFor="name">
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Nhap ten san pham"
                  />
                </FormField>
                <FormField label="Slug" error={errors.slug} required htmlFor="slug">
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                  />
                </FormField>
                <FormField label="Mo ta ngan" error={errors.short_description} htmlFor="short_description">
                  <Textarea
                    id="short_description"
                    value={form.short_description ?? ''}
                    onChange={(e) => updateField('short_description', e.target.value)}
                    rows={2}
                    placeholder="Mo ta ngan gon ve san pham"
                  />
                </FormField>
                <FormField label="Mo ta chi tiet" error={errors.description} htmlFor="description">
                  <Textarea
                    id="description"
                    value={form.description ?? ''}
                    onChange={(e) => updateField('description', e.target.value)}
                    rows={6}
                    placeholder="Mo ta chi tiet san pham"
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Gia */}
            <Card>
              <CardHeader><CardTitle>Gia ca</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField label="Gia ban" error={errors.price} required htmlFor="price">
                    <Input
                      id="price"
                      type="number"
                      value={form.price}
                      onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
                    />
                  </FormField>
                  <FormField label="Gia so sanh" error={errors.compare_at_price} htmlFor="compare_at_price">
                    <Input
                      id="compare_at_price"
                      type="number"
                      value={form.compare_at_price ?? ''}
                      onChange={(e) => updateField('compare_at_price', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormField>
                  <FormField label="Gia von" error={errors.cost_price} htmlFor="cost_price">
                    <Input
                      id="cost_price"
                      type="number"
                      value={form.cost_price ?? ''}
                      onChange={(e) => updateField('cost_price', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {/* Media */}
            <Card>
              <CardHeader><CardTitle>Hinh anh</CardTitle></CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-400 text-sm">
                    Keo tha hinh anh vao day hoac click de chon file
                  </p>
                  <Button type="button" variant="outline" className="mt-3" size="sm">
                    Chon hinh anh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bien the */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bien the san pham</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                  <Plus className="h-4 w-4 mr-1" />
                  Them bien the
                </Button>
              </CardHeader>
              <CardContent>
                {variants.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Chua co bien the nao. Nhan &quot;Them bien the&quot; de tao.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {variants.map((v, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-3">
                          <Input
                            placeholder="Ten (VD: Do / L)"
                            value={v.name}
                            onChange={(e) => updateVariant(i, 'name', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder="SKU"
                            value={v.sku}
                            onChange={(e) => updateVariant(i, 'sku', e.target.value)}
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            type="number"
                            placeholder="Gia"
                            value={v.price}
                            onChange={(e) => updateVariant(i, 'price', e.target.value)}
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            placeholder='{"color":"red"}'
                            value={v.attributes}
                            onChange={(e) => updateVariant(i, 'attributes', e.target.value)}
                          />
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
                <FormField label="SEO Title" error={errors.seo_title} htmlFor="seo_title" description="Toi da 70 ky tu">
                  <Input
                    id="seo_title"
                    value={form.seo_title ?? ''}
                    onChange={(e) => updateField('seo_title', e.target.value)}
                    maxLength={70}
                  />
                </FormField>
                <FormField label="SEO Description" error={errors.seo_description} htmlFor="seo_description" description="Toi da 160 ky tu">
                  <Textarea
                    id="seo_description"
                    value={form.seo_description ?? ''}
                    onChange={(e) => updateField('seo_description', e.target.value)}
                    rows={3}
                    maxLength={160}
                  />
                </FormField>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* To chuc */}
            <Card>
              <CardHeader><CardTitle>To chuc</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField label="Danh muc" htmlFor="category_id">
                  <Select
                    value={form.category_id ?? ''}
                    onValueChange={(val) => updateField('category_id', val || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chon danh muc" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Khong co</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="SKU" htmlFor="sku">
                  <Input
                    id="sku"
                    value={form.sku ?? ''}
                    onChange={(e) => updateField('sku', e.target.value)}
                    placeholder="VD: SP-001"
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Trang thai */}
            <Card>
              <CardHeader><CardTitle>Trang thai</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Dang ban</span>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={(checked) => updateField('is_active', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Noi bat</span>
                  <Switch
                    checked={form.is_featured}
                    onCheckedChange={(checked) => updateField('is_featured', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button type="submit" className="w-full" disabled={createMutation.loading}>
                <Save className="h-4 w-4 mr-2" />
                {createMutation.loading ? 'Dang luu...' : 'Luu san pham'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push('/admin/products')}
              >
                <X className="h-4 w-4 mr-2" />
                Huy
              </Button>
            </div>

            {createMutation.error && (
              <p className="text-sm text-red-500">{createMutation.error}</p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
