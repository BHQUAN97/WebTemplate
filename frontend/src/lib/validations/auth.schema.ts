import { z } from 'zod';
import {
  MESSAGES,
  zEmail,
  zName,
  zRequiredString,
  zStrongPassword,
} from './base';

// ============================================================
// Auth schemas — re-use primitives từ ./base để đồng bộ với BE
// ============================================================

export const loginSchema = z.object({
  email: zEmail,
  password: zRequiredString('Mật khẩu'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: zName,
    email: zEmail,
    password: zStrongPassword,
    confirmPassword: zRequiredString('Xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: MESSAGES.CONFIRM_MISMATCH,
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: zEmail,
});

export const resetPasswordSchema = z
  .object({
    password: zStrongPassword,
    confirmPassword: zRequiredString('Xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: MESSAGES.CONFIRM_MISMATCH,
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: zRequiredString('Mật khẩu hiện tại'),
    newPassword: zStrongPassword,
    confirmNewPassword: zRequiredString('Xác nhận mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: MESSAGES.CONFIRM_MISMATCH,
    path: ['confirmNewPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
