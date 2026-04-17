import { IsString, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  order_id: string;

  @IsString()
  @IsIn(['vnpay', 'momo', 'stripe', 'bank_transfer', 'cod'])
  method: 'vnpay' | 'momo' | 'stripe' | 'bank_transfer' | 'cod';
}
