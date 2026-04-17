import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Headers,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Tao giao dich thanh toan. Amount duoc lookup tu order (KHONG tin client).
   */
  @Post()
  async create(@Body() dto: CreatePaymentDto) {
    const payment = await this.paymentsService.createPayment(
      dto.order_id,
      dto.method,
    );
    const paymentUrl = await this.paymentsService.createPaymentUrl(payment);
    return successResponse(
      { payment, payment_url: paymentUrl || null },
      'Payment created',
    );
  }

  /**
   * Lay chi tiet giao dich.
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    const payment = await this.paymentsService.findById(id);
    return successResponse(payment);
  }

  /**
   * Nhan callback tu payment gateway (webhook).
   * Voi Stripe: dua raw body + Stripe-Signature header vao service de verify.
   */
  @Post('callback/:gateway')
  async callback(
    @Param('gateway') gateway: string,
    @Body() data: PaymentCallbackDto,
    @Req() req: Request,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    // Gan raw body + signature header (neu co) de service verify Stripe chuan xac
    if (gateway === 'stripe') {
      const rawBody = (req as any).rawBody;
      (data as any).__rawBody = rawBody;
      (data as any).__signatureHeader = stripeSignature;
    }

    const payment = await this.paymentsService.processCallback(gateway, data);
    return successResponse(payment, 'Payment callback processed');
  }

  /**
   * Hoan tien giao dich (admin).
   */
  @Post(':id/refund')
  async refund(@Param('id') id: string) {
    const payment = await this.paymentsService.refund(id);
    return successResponse(payment, 'Payment refunded');
  }
}
