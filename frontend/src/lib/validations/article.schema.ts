import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z
    .string({ error: 'Vui long nhap tieu de bai viet' })
    .min(1, 'Tieu de bai viet khong duoc de trong')
    .max(255, 'Tieu de khong vuot qua 255 ky tu'),
  slug: z.string().optional(),
  excerpt: z.string().max(500, 'Tom tat khong vuot qua 500 ky tu').optional(),
  content: z
    .string({ error: 'Vui long nhap noi dung bai viet' })
    .min(1, 'Noi dung bai viet khong duoc de trong'),
  featured_image: z.string().url('URL hinh anh khong hop le').optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export type CreateArticleFormValues = z.infer<typeof createArticleSchema>;
