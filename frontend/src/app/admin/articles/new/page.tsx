'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, FileText } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useMutation } from '@/lib/hooks/use-api';
import { slugify } from '@/lib/utils/format';

const articleSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(255, 'Tối đa 255 ký tự'),
  slug: z.string().min(1, 'Slug la Bắt buộc'),
  content: z.string().min(1, 'Nội dung là bắt buộc'),
  excerpt: z.string().max(500, 'Tóm tắt tối đa 500 ký tự').optional(),
  featured_image: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED']),
  is_featured: z.boolean(),
  seo_title: z.string().max(70, 'SEO title tối đa 70 ký tự').optional(),
  seo_description: z.string().max(160, 'SEO description tối đa 160 ký tự').optional(),
});

type ArticleForm = z.infer<typeof articleSchema>;

/** Tạo Bài viết moi */
export default function NewArticlePage() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<ArticleForm>({
    title: '', slug: '', content: '', excerpt: '',
    featured_image: null, status: 'DRAFT', is_featured: false,
    seo_title: '', seo_description: '',
  });

  const createMutation = useMutation('POST', '/admin/articles');

  useEffect(() => {
    if (form.title) {
      setForm((p) => ({ ...p, slug: slugify(form.title) }));
    }
  }, [form.title]);

  const updateField = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    const data = { ...form, status };
    const result = articleSchema.safeParse(data);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const res = await createMutation.mutate(result.data);
    if (res) router.push('/admin/articles');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viết bài mới"
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Bài viết', href: '/admin/articles' },
          { label: 'Viết bài mới' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Nội dung chinh */}
          <Card>
            <CardHeader><CardTitle>Nội dung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Tiêu đề" error={errors.title} required>
                <Input
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Nhập tiêu đề bài viết"
                />
              </FormField>
              <FormField label="Slug" error={errors.slug} required>
                <Input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} />
              </FormField>
              <FormField label="Nội dung" error={errors.content} required>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => updateField('content', html)}
                  placeholder="Nhập nội dung bài viết..."
                />
              </FormField>
              <FormField label="Tóm tắt" error={errors.excerpt}>
                <Textarea
                  value={form.excerpt ?? ''}
                  onChange={(e) => updateField('excerpt', e.target.value)}
                  rows={3}
                  placeholder="Tóm tắt ngắn về bài viết"
                />
              </FormField>
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="SEO Title" error={errors.seo_title} description="Tối đa 70 ký tự">
                <Input
                  value={form.seo_title ?? ''}
                  onChange={(e) => updateField('seo_title', e.target.value)}
                  maxLength={70}
                />
              </FormField>
              <FormField label="SEO Description" error={errors.seo_description} description="Tối đa 160 ký tự">
                <Textarea
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
          {/* Ảnh dai dien */}
          <Card>
            <CardHeader><CardTitle>Ảnh dai dien</CardTitle></CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-gray-400 text-sm">Click de chon anh dai dien</p>
                <Button type="button" variant="outline" className="mt-3" size="sm">Chon anh</Button>
              </div>
            </CardContent>
          </Card>

          {/* Tuy chon */}
          <Card>
            <CardHeader><CardTitle>Tuy chon</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bài viết noi bat</span>
                <Switch checked={form.is_featured} onCheckedChange={(c) => updateField('is_featured', c)} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={createMutation.loading}
              onClick={() => handleSubmit('PUBLISHED')}
            >
              <Save className="h-4 w-4 mr-2" />
              {createMutation.loading ? 'Đang lưu...' : 'Xuất bản'}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={createMutation.loading}
              onClick={() => handleSubmit('DRAFT')}
            >
              <FileText className="h-4 w-4 mr-2" />
              Lưu Nháp
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/admin/articles')}
            >
              Huy
            </Button>
          </div>

          {createMutation.error && <p className="text-sm text-red-500">{createMutation.error}</p>}
        </div>
      </div>
    </div>
  );
}
