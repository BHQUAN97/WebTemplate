'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, FileText, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { FormField } from '@/components/shared/form-field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi, useMutation } from '@/lib/hooks/use-api';
import { slugify } from '@/lib/utils/format';
import type { ApiResponse, Article } from '@/lib/types';

const articleSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(255, 'Tối đa 255 ký tự'),
  slug: z.string().min(1, 'Slug là bắt buộc'),
  content: z.string().min(1, 'Nội dung là bắt buộc'),
  excerpt: z.string().max(500, 'Tóm tắt tối đa 500 ký tự').optional(),
  featured_image: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  is_featured: z.boolean(),
  seo_title: z.string().max(70, 'SEO title tối đa 70 ký tự').optional(),
  seo_description: z.string().max(160, 'SEO description tối đa 160 ký tự').optional(),
});

type ArticleForm = z.infer<typeof articleSchema>;

/** Chỉnh sửa bai viet */
export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState<ArticleForm>({
    title: '', slug: '', content: '', excerpt: '',
    featured_image: null, status: 'DRAFT', is_featured: false,
    seo_title: '', seo_description: '',
  });

  const { data, loading } = useApi<ApiResponse<Article>>(`/admin/articles/${id}`);
  const updateMutation = useMutation('PUT', `/admin/articles/${id}`);
  const deleteMutation = useMutation('DELETE', `/admin/articles/${id}`);

  useEffect(() => {
    if (data?.data) {
      const a = data.data;
      setForm({
        title: a.title, slug: a.slug, content: a.content,
        excerpt: a.excerpt ?? '', featured_image: a.featured_image,
        status: a.status, is_featured: false,
        seo_title: '', seo_description: '',
      });
    }
  }, [data]);

  const updateField = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => {
    setForm((p) => ({ ...p, [key]: value }));
    setErrors((p) => ({ ...p, [key]: '' }));
  };

  const handleSubmit = async (status: ArticleForm['status']) => {
    const payload = { ...form, status };
    const result = articleSchema.safeParse(payload);
    if (!result.success) {
      const fe: Record<string, string> = {};
      result.error.issues.forEach((e: any) => { fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    const res = await updateMutation.mutate(result.data);
    if (res) router.push('/admin/articles');
  };

  const handleDelete = async () => {
    const res = await deleteMutation.mutate();
    if (res !== null) router.push('/admin/articles');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chỉnh sửa: ${form.title || '...'}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/admin' },
          { label: 'Bài viết', href: '/admin/articles' },
          { label: 'Chỉnh sửa' },
        ]}
        actions={
          <Button variant="destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="h-4 w-4 mr-2" /> Xóa
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Nội dung</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField label="Tiêu đề" error={errors.title} required>
                <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
              </FormField>
              <FormField label="Slug" error={errors.slug} required>
                <Input value={form.slug} onChange={(e) => updateField('slug', e.target.value)} />
              </FormField>
              <FormField label="Nội dung" error={errors.content} required>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => updateField('content', html)}
                  placeholder="Nội dung bài viết..."
                />
              </FormField>
              <FormField label="Tóm tắt" error={errors.excerpt}>
                <Textarea
                  value={form.excerpt ?? ''}
                  onChange={(e) => updateField('excerpt', e.target.value)}
                  rows={3}
                />
              </FormField>
            </CardContent>
          </Card>

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

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Ảnh đại diện</CardTitle></CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <p className="text-gray-400 text-sm">Click để chọn ảnh đại diện</p>
                <Button type="button" variant="outline" className="mt-3" size="sm">Chọn ảnh</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Tùy chọn</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bài viết nổi bật</span>
                <Switch checked={form.is_featured} onCheckedChange={(c) => updateField('is_featured', c)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button className="w-full" disabled={updateMutation.loading} onClick={() => handleSubmit('PUBLISHED')}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.loading ? 'Đang lưu...' : 'Xuất bản'}
            </Button>
            <Button variant="outline" className="w-full" disabled={updateMutation.loading} onClick={() => handleSubmit('DRAFT')}>
              <FileText className="h-4 w-4 mr-2" /> Lưu nháp
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/admin/articles')}>
              Hủy
            </Button>
          </div>
          {updateMutation.error && <p className="text-sm text-red-500">{updateMutation.error}</p>}
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Xóa bài viết"
        description="Bạn có chắc chắn muốn xóa bài viết này?"
        onConfirm={handleDelete}
        confirmLabel="Xóa"
        variant="danger"
        loading={deleteMutation.loading}
      />
    </div>
  );
}
