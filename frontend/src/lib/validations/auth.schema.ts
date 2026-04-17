import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Vui long nhap email' })
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
  password: z
    .string({ error: 'Vui long nhap mat khau' })
    .min(1, 'Vui long nhap mat khau'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: z
      .string({ error: 'Vui long nhap ho ten' })
      .min(1, 'Vui long nhap ho ten')
      .min(2, 'Ho ten phai co it nhat 2 ky tu')
      .max(100, 'Ho ten khong duoc vuot qua 100 ky tu'),
    email: z
      .string({ error: 'Vui long nhap email' })
      .min(1, 'Vui long nhap email')
      .email('Email khong hop le'),
    password: z
      .string({ error: 'Vui long nhap mat khau' })
      .min(8, 'Mat khau phai co it nhat 8 ky tu')
      .regex(
        /[A-Z]/,
        'Mat khau phai co it nhat 1 chu hoa',
      )
      .regex(
        /[a-z]/,
        'Mat khau phai co it nhat 1 chu thuong',
      )
      .regex(/[0-9]/, 'Mat khau phai co it nhat 1 so')
      .regex(/[^a-zA-Z0-9]/, 'Mat khau phai co it nhat 1 ky tu dac biet'),
    confirmPassword: z
      .string({
        error: 'Vui long xac nhan mat khau',
      })
      .min(1, 'Vui long xac nhan mat khau'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: 'Vui long nhap email' })
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string({ error: 'Vui long nhap mat khau moi' })
      .min(8, 'Mat khau phai co it nhat 8 ky tu')
      .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu hoa')
      .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
      .regex(/[0-9]/, 'Mat khau phai co it nhat 1 so')
      .regex(/[^a-zA-Z0-9]/, 'Mat khau phai co it nhat 1 ky tu dac biet'),
    confirmPassword: z
      .string({
        error: 'Vui long xac nhan mat khau',
      })
      .min(1, 'Vui long xac nhan mat khau'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({
        error: 'Vui long nhap mat khau hien tai',
      })
      .min(1, 'Vui long nhap mat khau hien tai'),
    newPassword: z
      .string({
        error: 'Vui long nhap mat khau moi',
      })
      .min(8, 'Mat khau moi phai co it nhat 8 ky tu')
      .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu hoa')
      .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
      .regex(/[0-9]/, 'Mat khau phai co it nhat 1 so')
      .regex(/[^a-zA-Z0-9]/, 'Mat khau phai co it nhat 1 ky tu dac biet'),
    confirmNewPassword: z
      .string({
        error: 'Vui long xac nhan mat khau moi',
      })
      .min(1, 'Vui long xac nhan mat khau moi'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmNewPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
