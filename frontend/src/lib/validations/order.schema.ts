import { z } from 'zod';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1, 'Vui lòng chọn sản phẩm'),
        variant_id: z.string().optional(),
        quantity: z
          .number()
          .int('Số lượng phải là số nguyên')
          .min(1, 'Số lượng tối thiểu là 1'),
      }),
    )
    .min(1, 'Giỏ hàng không được trống'),
  shipping_name: z
    .string({ error: 'Vui lòng nhập tên người nhận' })
    .min(1, 'Vui lòng nhập tên người nhận')
    .max(100, 'Tên không vượt quá 100 ký tự'),
  shipping_phone: z
    .string({ error: 'Vui lòng nhập số điện thoại' })
    .min(1, 'Vui lòng nhập số điện thoại')
    .regex(/^(0[3|5|7|8|9])\d{8}$/, 'Số điện thoại không hợp lệ'),
  shipping_address: z
    .string({ error: 'Vui lòng nhập địa chỉ' })
    .min(1, 'Vui lòng nhập địa chỉ giao hàng'),
  shipping_city: z
    .string({ error: 'Vui lòng chọn tỉnh/thành phố' })
    .min(1, 'Vui lòng chọn tỉnh/thành phố'),
  shipping_district: z
    .string({ error: 'Vui lòng chọn quận/huyện' })
    .min(1, 'Vui lòng chọn quận/huyện'),
  shipping_ward: z
    .string({ error: 'Vui lòng chọn phường/xã' })
    .min(1, 'Vui lòng chọn phường/xã'),
  note: z.string().max(500, 'Ghi chú không vượt quá 500 ký tự').optional(),
  payment_method: z
    .string({ error: 'Vui lòng chọn phương thức thanh toán' })
    .min(1, 'Vui lòng chọn phương thức thanh toán'),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
