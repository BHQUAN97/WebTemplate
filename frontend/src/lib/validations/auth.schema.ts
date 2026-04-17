import { z } from 'zod';
import {
  MESSAGES,
  zEmail,
  zName,
  zRequiredString,
  zStrongPassword,
} from './base';

// ============================================================
// Auth schemas — re-use primitives tu ./base de dong bo voi BE
// ============================================================

export const loginSchema = z.object({
  email: zEmail,
  password: zRequiredString('Mat khau'),
  remember: z.boolean().optional(),
});

export const registerSchema = z
  .object({
    name: zName,
    email: zEmail,
    password: zStrongPassword,
    confirmPassword: zRequiredString('Xac nhan mat khau'),
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
    confirmPassword: zRequiredString('Xac nhan mat khau'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: MESSAGES.CONFIRM_MISMATCH,
    path: ['confirmPassword'],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: zRequiredString('Mat khau hien tai'),
    newPassword: zStrongPassword,
    confirmNewPassword: zRequiredString('Xac nhan mat khau moi'),
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
