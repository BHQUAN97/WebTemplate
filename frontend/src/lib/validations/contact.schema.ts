import { z } from 'zod';

export const contactSchema = z.object({
  name: z
    .string({ error: 'Vui lòng nhập họ tên' })
    .min(1, 'Vui lòng nhập họ tên')
    .max(100, 'Họ tên không vượt quá 100 ký tự'),
  email: z
    .string({ error: 'Vui lòng nhập email' })
    .min(1, 'Vui lòng nhập email')
    .email('Email không hợp lệ'),
  phone: z
    .string()
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'Số điện thoại không hợp lệ')
    .optional()
    .or(z.literal('')),
  subject: z
    .string({ error: 'Vui lòng nhập chủ đề' })
    .min(1, 'Vui lòng nhập chủ đề')
    .max(255, 'Chủ đề không vượt quá 255 ký tự'),
  message: z
    .string({ error: 'Vui lòng nhập nội dung' })
    .min(10, 'Nội dung phải có ít nhất 10 ký tự')
    .max(5000, 'Nội dung không vượt quá 5000 ký tự'),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
