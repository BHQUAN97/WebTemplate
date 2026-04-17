import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service.js';
import { OrdersService } from '../orders/orders.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../common/constants/index.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { ICurrentUser } from '../../common/interfaces/index.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Tao giao dich thanh toan. Amount duoc lookup tu order (KHONG tin client).
   * Verify ownership — khong cho attacker tao payment cho don cua user khac.
   */
  @Post()
  async create(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: ICurrentUser,
  ) {
    const order = await this.ordersService.getOrderWithItems(dto.order_id);
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (!isAdmin && order.user_id !== user.id) {
      throw new ForbiddenException('Bạn không có quyền thanh toán đơn hàng này');
    }
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
   * Lay chi tiet giao dich. Non-admin chi xem payment cua don cua chinh minh.
   */
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: ICurrentUser,
  ) {
    const payment = await this.paymentsService.findById(id);
    const isAdmin =
      user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
    if (!isAdmin) {
      const order = await this.ordersService.getOrderWithItems(payment.order_id);
      if (order.user_id !== user.id) {
        throw new ForbiddenException('Bạn không có quyền xem thanh toán này');
      }
    }
    return successResponse(payment);
  }

  /**
   * Nhan callback tu payment gateway (webhook).
   * Public: gateway (Momo/VnPay/Stripe) KHONG gui JWT. Verify bang chu ky.
   * Voi Stripe: dua raw body + Stripe-Signature header vao service de verify.
   */
  @Public()
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
   * Hoan tien giao dich (admin only).
   */
  @Post(':id/refund')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  async refund(@Param('id') id: string) {
    const payment = await this.paymentsService.refund(id);
    return successResponse(payment, 'Payment refunded');
  }
}
