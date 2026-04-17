import {
  Injectable,
  BadRequestException,
  NotFoundException,
  NotImplementedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { BaseService } from '../../common/services/base.service.js';
import { PaymentStatus } from '../../common/constants/index.js';
import { Payment } from './entities/payment.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { PaymentCallbackDto } from './dto/payment-callback.dto.js';

/**
 * Payments service — tao thanh toan, xu ly callback tu gateway, hoan tien.
 * Verify signature theo chuan tung gateway (VNPay HMAC-SHA512, Momo HMAC-SHA256, Stripe webhook).
 */
@Injectable()
export class PaymentsService extends BaseService<Payment> {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {
    super(paymentsRepository, 'Payment');
  }

  /**
   * Tao giao dich thanh toan cho don hang.
   * Amount duoc lookup tu order (KHONG tin client).
   */
  async createPayment(
    orderId: string,
    method: Payment['method'],
  ): Promise<Payment> {
    // Lookup order de lay amount chinh xac
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const amount = Number(order.total);
    if (!(amount > 0)) {
      throw new BadRequestException('Order total is invalid');
    }

    // Kiem tra da co payment cho order chua (tranh race TOCTOU — DB co unique index tren order_id)
    const existing = await this.paymentsRepository.findOne({
      where: { order_id: orderId },
    });

    if (existing) {
      throw new BadRequestException('Payment already exists for this order');
    }

    const payment = await this.create({
      order_id: orderId,
      method,
      amount,
      currency: order.currency || 'VND',
      status: PaymentStatus.PENDING,
    } as any);

    return payment;
  }

  /**
   * Xu ly callback tu payment gateway.
   * BAT BUOC verify signature truoc khi cap nhat trang thai.
   */
  async processCallback(
    gateway: string,
    data: PaymentCallbackDto,
  ): Promise<Payment> {
    // Verify signature truoc — reject som neu chu ky khong hop le
    const signatureOk = this.verifySignature(gateway, data);
    if (!signatureOk) {
      throw new BadRequestException('Invalid payment signature');
    }

    let payment: Payment | null = null;

    // Tim payment dua theo gateway
    switch (gateway) {
      case 'vnpay':
        if (data.vnp_TxnRef) {
          // vnp_TxnRef = payment.id (xem createPaymentUrl)
          payment = await this.paymentsRepository.findOne({
            where: { id: data.vnp_TxnRef },
          });
        }
        break;
      case 'momo':
        if (data.order_id) {
          payment = await this.paymentsRepository.findOne({
            where: { order_id: data.order_id },
          });
        }
        break;
      default:
        if (data.order_id) {
          payment = await this.paymentsRepository.findOne({
            where: { order_id: data.order_id },
          });
        }
    }

    if (!payment) {
      throw new NotFoundException('Payment not found for callback');
    }

    // Xac nhan ket qua tu response code cua gateway (sau khi signature da valid)
    const isSuccess = this.isCallbackSuccess(gateway, data);

    payment.status = isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED;
    payment.gateway_response = data as any;
    payment.transaction_id =
      data.transaction_id || data.vnp_TransactionNo || data.transId || null;

    if (isSuccess) {
      payment.paid_at = new Date();
    }

    return this.paymentsRepository.save(payment);
  }

  /**
   * Hoan tien giao dich.
   */
  async refund(paymentId: string): Promise<Payment> {
    const payment = await this.findById(paymentId);

    if (payment.status !== PaymentStatus.PAID) {
      throw new BadRequestException('Can only refund paid payments');
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refunded_at = new Date();

    return this.paymentsRepository.save(payment);
  }

  /**
   * Lay payment theo order ID.
   */
  async getPaymentByOrder(orderId: string): Promise<Payment | null> {
    return this.paymentsRepository.findOne({
      where: { order_id: orderId },
    });
  }

  /**
   * Tao URL thanh toan cho gateway. Implement VNPay day du; Momo/Stripe throw NotImplemented.
   */
  createPaymentUrl(payment: Payment): string {
    switch (payment.method) {
      case 'vnpay':
        return this.buildVnpayUrl(payment);
      case 'momo':
        // TODO: Implement Momo createPaymentUrl (AIO API)
        throw new NotImplementedException(
          'Momo payment URL chua duoc implement',
        );
      case 'stripe':
        // TODO: Implement Stripe Checkout Session creation
        throw new NotImplementedException(
          'Stripe payment URL chua duoc implement',
        );
      case 'bank_transfer':
      case 'cod':
        // Khong can URL cho COD va chuyen khoan — tra chuoi rong
        return '';
      default:
        return '';
    }
  }

  // ==================================================================
  // VNPay — Build URL + Verify HMAC-SHA512
  // ==================================================================

  /**
   * Build URL thanh toan VNPay chuan 2.1.0.
   * Sort tham so theo alphabet, tinh HMAC-SHA512 tren query string.
   */
  private buildVnpayUrl(payment: Payment): string {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secret = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    if (!tmnCode || !secret || !vnpUrl || !returnUrl) {
      throw new InternalServerErrorException(
        'Cau hinh thanh toan chua day du',
      );
    }

    // Format yyyyMMddHHmmss theo spec VNPay
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const createDate =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(Math.round(Number(payment.amount) * 100)),
      vnp_CurrCode: payment.currency || 'VND',
      vnp_TxnRef: payment.id,
      vnp_OrderInfo: `Thanh toan don hang ${payment.order_id}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const sortedQuery = this.buildSortedQuery(params);
    const hash = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(sortedQuery, 'utf-8'))
      .digest('hex');

    return `${vnpUrl}?${sortedQuery}&vnp_SecureHash=${hash}`;
  }

  /**
   * Tao sorted query string theo key alphabet, encode RFC3986.
   * Dung chung cho build URL va verify signature (phai nhat quan).
   */
  private buildSortedQuery(params: Record<string, string>): string {
    const keys = Object.keys(params).sort();
    return keys
      .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
      .map(
        (k) =>
          `${encodeURIComponent(k).replace(/%20/g, '+')}=${encodeURIComponent(params[k]).replace(/%20/g, '+')}`,
      )
      .join('&');
  }

  // ==================================================================
  // Signature verification dispatcher
  // ==================================================================

  /**
   * Dispatch verify signature theo gateway.
   * Return true neu hop le, false neu khong — gateway tu biet reject.
   */
  private verifySignature(
    gateway: string,
    data: PaymentCallbackDto,
  ): boolean {
    switch (gateway) {
      case 'vnpay':
        return this.verifyVnpaySignature(data);
      case 'momo':
        return this.verifyMomoSignature(data);
      case 'stripe':
        return this.verifyStripeSignature(data);
      case 'cod':
      case 'bank_transfer':
        // COD/bank transfer khong co gateway signature — chap nhan (admin confirm thu cong)
        return true;
      default:
        return false;
    }
  }

  /**
   * Verify VNPay HMAC-SHA512.
   * Loai bo vnp_SecureHash + vnp_SecureHashType khoi params, sort, hash, so sanh.
   */
  private verifyVnpaySignature(data: PaymentCallbackDto): boolean {
    const secret = process.env.VNPAY_HASH_SECRET;
    if (!secret) {
      throw new InternalServerErrorException(
        'Cau hinh thanh toan chua day du',
      );
    }

    const payload = data as unknown as Record<string, any>;
    const receivedHash = (payload.vnp_SecureHash || '').toString();
    if (!receivedHash) return false;

    // Chi giu cac field vnp_* (khong co hash)
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (
        key.startsWith('vnp_') &&
        key !== 'vnp_SecureHash' &&
        key !== 'vnp_SecureHashType' &&
        value !== undefined &&
        value !== null &&
        value !== ''
      ) {
        params[key] = String(value);
      }
    }

    const sortedQuery = this.buildSortedQuery(params);
    const computed = crypto
      .createHmac('sha512', secret)
      .update(Buffer.from(sortedQuery, 'utf-8'))
      .digest('hex');

    // Timing-safe compare
    return this.timingSafeEqualHex(computed, receivedHash);
  }

  /**
   * Verify Momo HMAC-SHA256.
   * Raw signature string theo docs Momo IPN:
   *   accessKey=$accessKey&amount=$amount&extraData=$extraData&message=$message&
   *   orderId=$orderId&orderInfo=$orderInfo&orderType=$orderType&partnerCode=$partnerCode&
   *   payType=$payType&requestId=$requestId&responseTime=$responseTime&resultCode=$resultCode&
   *   transId=$transId
   */
  private verifyMomoSignature(data: PaymentCallbackDto): boolean {
    const secret = process.env.MOMO_SECRET_KEY;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    if (!secret || !accessKey) {
      throw new InternalServerErrorException(
        'Cau hinh thanh toan chua day du',
      );
    }

    const payload = data as unknown as Record<string, any>;
    const receivedSig = (payload.signature || '').toString();
    if (!receivedSig) return false;

    // Xay dung raw string theo thu tu cua docs Momo (KHONG sort)
    const raw =
      `accessKey=${accessKey}` +
      `&amount=${payload.amount ?? ''}` +
      `&extraData=${payload.extraData ?? ''}` +
      `&message=${payload.message ?? ''}` +
      `&orderId=${payload.orderId ?? payload.order_id ?? ''}` +
      `&orderInfo=${payload.orderInfo ?? ''}` +
      `&orderType=${payload.orderType ?? ''}` +
      `&partnerCode=${payload.partnerCode ?? ''}` +
      `&payType=${payload.payType ?? ''}` +
      `&requestId=${payload.requestId ?? ''}` +
      `&responseTime=${payload.responseTime ?? ''}` +
      `&resultCode=${payload.resultCode ?? ''}` +
      `&transId=${payload.transId ?? ''}`;

    const computed = crypto
      .createHmac('sha256', secret)
      .update(raw)
      .digest('hex');

    return this.timingSafeEqualHex(computed, receivedSig);
  }

  /**
   * Verify Stripe webhook signature.
   * Uu tien dung package `stripe` neu co; fallback HMAC-SHA256 thu cong theo spec.
   * Luu y: callback DTO can chua `__rawBody` va `__signatureHeader` do controller dua vao
   * (vi Stripe signature yeu cau raw body byte-for-byte, khong phai parsed JSON).
   */
  private verifyStripeSignature(data: PaymentCallbackDto): boolean {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!endpointSecret) {
      throw new InternalServerErrorException(
        'Cau hinh thanh toan chua day du',
      );
    }

    const payload = data as unknown as Record<string, any>;
    const rawBody: string | Buffer | undefined = payload.__rawBody;
    const sigHeader: string | undefined = payload.__signatureHeader;

    if (!rawBody || !sigHeader) {
      // Khong co raw body => khong the verify => reject
      return false;
    }

    // Uu tien dung package stripe neu co (dynamic require, khong bat buoc)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Stripe = require('stripe');
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder');
      stripe.webhooks.constructEvent(rawBody, sigHeader, endpointSecret);
      return true;
    } catch (err: any) {
      if (err && err.code === 'MODULE_NOT_FOUND') {
        // Fallback: thuc hien HMAC-SHA256 thu cong theo spec Stripe
        return this.verifyStripeSignatureManual(
          rawBody,
          sigHeader,
          endpointSecret,
        );
      }
      // Stripe throw khi signature sai
      return false;
    }
  }

  /**
   * Manual Stripe signature verify — HMAC-SHA256(t + '.' + rawBody, secret).
   * Header format: `t=<ts>,v1=<sig>,v1=<sig2>`.
   */
  private verifyStripeSignatureManual(
    rawBody: string | Buffer,
    sigHeader: string,
    secret: string,
  ): boolean {
    const parts = sigHeader.split(',').map((p) => p.trim());
    const tsPart = parts.find((p) => p.startsWith('t='));
    const v1Parts = parts
      .filter((p) => p.startsWith('v1='))
      .map((p) => p.slice(3));

    if (!tsPart || v1Parts.length === 0) return false;
    const timestamp = tsPart.slice(2);

    const payloadForSig =
      timestamp +
      '.' +
      (typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8'));

    const computed = crypto
      .createHmac('sha256', secret)
      .update(payloadForSig)
      .digest('hex');

    return v1Parts.some((v) => this.timingSafeEqualHex(computed, v));
  }

  /**
   * So sanh 2 hex string trong thoi gian hang so.
   */
  private timingSafeEqualHex(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    try {
      return crypto.timingSafeEqual(
        Buffer.from(a, 'hex'),
        Buffer.from(b, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Kiem tra callback la thanh cong dua tren response code cua gateway.
   * Chi goi SAU KHI signature da valid.
   */
  private isCallbackSuccess(
    gateway: string,
    data: PaymentCallbackDto,
  ): boolean {
    switch (gateway) {
      case 'vnpay':
        return data.vnp_ResponseCode === '00';
      case 'momo':
        return data.resultCode === '0' || data.resultCode === '0';
      case 'stripe':
        return data.status === 'succeeded';
      case 'cod':
      case 'bank_transfer':
        return true;
      default:
        return data.status === 'success';
    }
  }
}
