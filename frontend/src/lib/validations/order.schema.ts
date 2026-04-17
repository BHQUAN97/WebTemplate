import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1, 'Vui long chon san pham'),
        variant_id: z.string().optional(),
        quantity: z
          .number()
          .int('So luong phai la so nguyen')
          .min(1, 'So luong toi thieu la 1'),
      }),
    )
    .min(1, 'Gio hang khong duoc trong'),
  shipping_name: z
    .string({ error: 'Vui long nhap ten nguoi nhan' })
    .min(1, 'Vui long nhap ten nguoi nhan')
    .max(100, 'Ten khong vuot qua 100 ky tu'),
  shipping_phone: z
    .string({ error: 'Vui long nhap so dien thoai' })
    .min(1, 'Vui long nhap so dien thoai')
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'So dien thoai khong hop le'),
  shipping_address: z
    .string({ error: 'Vui long nhap dia chi' })
    .min(1, 'Vui long nhap dia chi giao hang'),
  shipping_city: z
    .string({ error: 'Vui long chon tinh/thanh pho' })
    .min(1, 'Vui long chon tinh/thanh pho'),
  shipping_district: z
    .string({ error: 'Vui long chon quan/huyen' })
    .min(1, 'Vui long chon quan/huyen'),
  shipping_ward: z
    .string({ error: 'Vui long chon phuong/xa' })
    .min(1, 'Vui long chon phuong/xa'),
  note: z.string().max(500, 'Ghi chu khong vuot qua 500 ky tu').optional(),
  payment_method: z
    .string({ error: 'Vui long chon phuong thuc thanh toan' })
    .min(1, 'Vui long chon phuong thuc thanh toan'),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
