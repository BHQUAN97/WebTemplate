import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string({ error: 'Vui long nhap ho ten' })
    .min(1, 'Vui long nhap ho ten')
    .min(2, 'Ho ten phai co it nhat 2 ky tu')
    .max(100, 'Ho ten khong vuot qua 100 ky tu'),
  email: z
    .string({ error: 'Vui long nhap email' })
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
  password: z
    .string({ error: 'Vui long nhap mat khau' })
    .min(8, 'Mat khau phai co it nhat 8 ky tu'),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'EDITOR', 'USER']).default('USER'),
  is_active: z.boolean().default(true),
});

export const updateProfileSchema = z.object({
  name: z
    .string({ error: 'Vui long nhap ho ten' })
    .min(1, 'Vui long nhap ho ten')
    .min(2, 'Ho ten phai co it nhat 2 ky tu')
    .max(100, 'Ho ten khong vuot qua 100 ky tu'),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'So dien thoai khong hop le')
    .optional()
    .or(z.literal('')),
  avatar_url: z.string().url('URL avatar khong hop le').optional().nullable(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
