import { z } from 'zod';

export const createProductSchema = z.object({
  name: z
    .string({ error: 'Vui long nhap ten san pham' })
    .min(1, 'Ten san pham khong duoc de trong')
    .max(255, 'Ten san pham khong vuot qua 255 ky tu'),
  slug: z.string().optional(),
  description: z.string().optional(),
  short_description: z
    .string()
    .max(500, 'Mo ta ngan khong vuot qua 500 ky tu')
    .optional(),
  sku: z.string().max(100, 'Ma SKU khong vuot qua 100 ky tu').optional(),
  price: z
    .number({ error: 'Vui long nhap gia san pham' })
    .min(0, 'Gia san pham khong duoc am'),
  compare_at_price: z
    .number()
    .min(0, 'Gia so sanh khong duoc am')
    .optional()
    .nullable(),
  cost_price: z
    .number()
    .min(0, 'Gia goc khong duoc am')
    .optional()
    .nullable(),
  quantity: z
    .number({ error: 'Vui long nhap so luong' })
    .int('So luong phai la so nguyen')
    .min(0, 'So luong khong duoc am'),
  category_id: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
export type UpdateProductFormValues = z.infer<typeof updateProductSchema>;
