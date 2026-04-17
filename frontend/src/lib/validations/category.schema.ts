import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z
    .string({ error: 'Vui long nhap ten danh muc' })
    .min(1, 'Ten danh muc khong duoc de trong')
    .max(255, 'Ten danh muc khong vuot qua 255 ky tu'),
  slug: z.string().optional(),
  description: z.string().max(1000, 'Mo ta khong vuot qua 1000 ky tu').optional(),
  image_url: z.string().url('URL hinh anh khong hop le').optional().nullable(),
  parent_id: z.string().optional().nullable(),
  position: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export type CreateCategoryFormValues = z.infer<typeof createCategorySchema>;
