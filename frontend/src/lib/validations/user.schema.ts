import { z } from 'zod';

export const createUserSchema = z.object({
  name: z
    .string({ error: 'Vui lòng nhập họ tên' })
    .min(1, 'Vui lòng nhập họ tên')
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên không vượt quá 100 ký tự'),
  email: z
    .string({ error: 'Vui lòng nhập email' })
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  password: z
    .string({ error: 'Vui lòng nhập mật khẩu' })
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  role: z.enum(['ADMIN', 'MANAGER', 'EDITOR', 'USER']).default('USER'),
  is_active: z.boolean().default(true),
});

export const updateProfileSchema = z.object({
  name: z
    .string({ error: 'Vui lòng nhập họ tên' })
    .min(1, 'Vui lòng nhập họ tên')
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên không vượt quá 100 ký tự'),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  avatar_url: z.string().url('URL avatar không hợp lệ').optional().nullable(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
