import { z } from 'zod';

export const settingSchema = z.object({
  key: z
    .string({ error: 'Vui long nhap key' })
    .min(1, 'Key khong duoc de trong')
    .max(255, 'Key khong vuot qua 255 ky tu'),
  value: z
    .string({ error: 'Vui long nhap gia tri' })
    .min(1, 'Gia tri khong duoc de trong'),
  type: z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']).default('STRING'),
  group: z.string().default('general'),
  description: z.string().optional(),
  is_public: z.boolean().default(false),
});

export type SettingFormValues = z.infer<typeof settingSchema>;
