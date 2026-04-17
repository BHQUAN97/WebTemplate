import { IsString, IsOptional } from 'class-validator';

/**
 * DTO cho callback tu payment gateway.
 * Cac field cu the tuy theo gateway (VNPay, Momo, Stripe).
 */
export class PaymentCallbackDto {
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  amount?: string;

  @IsOptional()
  @IsString()
  signature?: string;

  /** VNPay specific fields */
  @IsOptional()
  @IsString()
  vnp_TxnRef?: string;

  @IsOptional()
  @IsString()
  vnp_ResponseCode?: string;

  @IsOptional()
  @IsString()
  vnp_TransactionNo?: string;

  @IsOptional()
  @IsString()
  vnp_SecureHash?: string;

  /** Momo specific fields */
  @IsOptional()
  @IsString()
  resultCode?: string;

  @IsOptional()
  @IsString()
  transId?: string;
}
