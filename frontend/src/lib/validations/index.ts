import { z } from 'zod';

// === Auth Validations ===

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
  password: z
    .string()
    .min(1, 'Vui long nhap mat khau')
    .min(6, 'Mat khau phai co it nhat 6 ky tu'),
  remember: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Vui long nhap ho ten')
      .min(2, 'Ho ten phai co it nhat 2 ky tu')
      .max(100, 'Ho ten khong duoc qua 100 ky tu'),
    email: z
      .string()
      .min(1, 'Vui long nhap email')
      .email('Email khong hop le'),
    password: z
      .string()
      .min(1, 'Vui long nhap mat khau')
      .min(8, 'Mat khau phai co it nhat 8 ky tu')
      .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu in hoa')
      .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
      .regex(/[0-9]/, 'Mat khau phai co it nhat 1 chu so'),
    confirmPassword: z.string().min(1, 'Vui long xac nhan mat khau'),
    terms: z.boolean().refine((val) => val === true, {
      message: 'Ban phai dong y voi dieu khoan su dung',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Vui long nhap mat khau moi')
      .min(8, 'Mat khau phai co it nhat 8 ky tu')
      .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu in hoa')
      .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
      .regex(/[0-9]/, 'Mat khau phai co it nhat 1 chu so'),
    confirmPassword: z.string().min(1, 'Vui long xac nhan mat khau'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const verify2faSchema = z.object({
  code: z
    .string()
    .min(1, 'Vui long nhap ma xac thuc')
    .length(6, 'Ma xac thuc phai co 6 chu so')
    .regex(/^\d{6}$/, 'Ma xac thuc chi duoc chua chu so'),
});

export type Verify2faFormData = z.infer<typeof verify2faSchema>;

// === Contact Validation ===

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Vui long nhap ho ten')
    .min(2, 'Ho ten phai co it nhat 2 ky tu'),
  email: z
    .string()
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(0|\+84)[0-9]{9,10}$/.test(val),
      'So dien thoai khong hop le',
    ),
  subject: z
    .string()
    .min(1, 'Vui long nhap chu de')
    .max(200, 'Chu de khong duoc qua 200 ky tu'),
  message: z
    .string()
    .min(1, 'Vui long nhap noi dung')
    .min(10, 'Noi dung phai co it nhat 10 ky tu')
    .max(2000, 'Noi dung khong duoc qua 2000 ky tu'),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// === Shipping Validation ===

export const shippingSchema = z.object({
  name: z
    .string()
    .min(1, 'Vui long nhap ho ten nguoi nhan')
    .min(2, 'Ho ten phai co it nhat 2 ky tu'),
  phone: z
    .string()
    .min(1, 'Vui long nhap so dien thoai')
    .regex(/^(0|\+84)[0-9]{9,10}$/, 'So dien thoai khong hop le'),
  address: z
    .string()
    .min(1, 'Vui long nhap dia chi')
    .min(5, 'Dia chi phai co it nhat 5 ky tu'),
  city: z.string().min(1, 'Vui long chon tinh/thanh pho'),
  district: z.string().min(1, 'Vui long chon quan/huyen'),
  ward: z.string().min(1, 'Vui long chon phuong/xa'),
});

export type ShippingFormData = z.infer<typeof shippingSchema>;

// === Newsletter Validation ===

export const newsletterSchema = z.object({
  email: z
    .string()
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;

// === Profile Validation ===

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Vui long nhap ho ten')
    .min(2, 'Ho ten phai co it nhat 2 ky tu'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^(0|\+84)[0-9]{9,10}$/.test(val),
      'So dien thoai khong hop le',
    ),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui long nhap mat khau hien tai'),
    newPassword: z
      .string()
      .min(1, 'Vui long nhap mat khau moi')
      .min(8, 'Mat khau phai co it nhat 8 ky tu')
      .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu in hoa')
      .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
      .regex(/[0-9]/, 'Mat khau phai co it nhat 1 chu so'),
    confirmNewPassword: z.string().min(1, 'Vui long xac nhan mat khau moi'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Mat khau xac nhan khong khop',
    path: ['confirmNewPassword'],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// === Promo Code Validation ===

export const promoCodeSchema = z.object({
  code: z
    .string()
    .min(1, 'Vui long nhap ma giam gia')
    .max(50, 'Ma giam gia khong hop le'),
});

export type PromoCodeFormData = z.infer<typeof promoCodeSchema>;
