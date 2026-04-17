import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string({ error: 'Vui long nhap ho ten' })
    .min(1, 'Vui long nhap ho ten')
    .max(100, 'Ho ten khong vuot qua 100 ky tu'),
  email: z
    .string({ error: 'Vui long nhap email' })
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  subject: z
    .string({ error: 'Vui long nhap chu de' })
    .min(1, 'Vui long nhap chu de')
    .max(255, 'Chu de khong vuot qua 255 ky tu'),
  message: z
    .string({ error: 'Vui long nhap noi dung' })
    .min(10, 'Noi dung phai co it nhat 10 ky tu')
    .max(5000, 'Noi dung khong vuot qua 5000 ky tu'),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
