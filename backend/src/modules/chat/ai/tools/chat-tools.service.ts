/**
 * ChatToolsService — expose query tool cho AI (Gemini function calling).
 *
 * ==============================================================
 * CAM SUA DU LIEU TRONG TOOLS — READ-ONLY ONLY
 * ==============================================================
 *
 * Nguyen tac:
 *  1. Moi method NHAN param `ctx: ChatToolContext` (param cuoi) va
 *     `assertPermission(toolName, ctx)` o dau.
 *  2. Khong duoc dung `.save/.insert/.update/.delete/.remove/.softDelete/.query`.
 *     Repositories da duoc wrap bang `asReadonly(...)` → Proxy se throw
 *     neu co ai attempt.
 *  3. `.createQueryBuilder().select([...])` phai explicit liet ke cot —
 *     KHONG `SELECT *`. Parameter bindings qua `:name` + `{ name: value }`,
 *     KHONG concat string.
 *  4. Moi tool call wrap trong `audit(...)` → ghi `chat_tool_calls`.
 *  5. Rate limit check dau moi method — throw `ToolRateLimitError` khi vuot.
 *  6. CUSTOMER actor: cross-user isolation — bo qua identifier argument,
 *     chi query don cua chinh minh.
 *  7. Response di qua `sanitize*` → whitelist fields, strip internal data.
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets, IsNull, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Product } from '../../../products/entities/product.entity.js';
import { Order } from '../../../orders/entities/order.entity.js';
import { OrderItem } from '../../../orders/entities/order-item.entity.js';
import { Faq } from '../../../faq/entities/faq.entity.js';
import { Promotion } from '../../../promotions/entities/promotion.entity.js';
import { User } from '../../../users/entities/user.entity.js';
import { InventoryService } from '../../../inventory/inventory.service.js';
import {
  ChatActorType,
  ChatToolContext,
  TOOL_CALL_LIMITS,
  ToolPermissionDeniedError,
  ToolRateLimitError,
  assertPermission,
} from './tool-context.js';
import {
  sanitizeProduct,
  sanitizeOrder,
  sanitizeFaq,
  sanitizePromotion,
} from './sanitizers.js';
import {
  validateOrderId,
  validateOrderSearchInput,
  validateProductId,
  validateSearchInput,
} from './input-validator.js';
import { asReadonly, ReadonlyRepo } from './readonly-repo.js';
import { ChatToolCall } from '../../entities/chat-tool-call.entity.js';
import { generateUlid } from '../../../../common/utils/ulid.js';

export type ToolResult<T> = T | { error: string };

/**
 * Per-conversation rate limit bucket — in-memory.
 * Window = 1 hour, reset theo windowStart.
 */
interface RateLimitBucket {
  count: number;
  orderLookups: number;
  windowStart: number;
}

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  /** Readonly-wrapped repos — khong the save/insert/update/delete. */
  private readonly products: ReadonlyRepo<Product>;
  private readonly orders: ReadonlyRepo<Order>;
  private readonly orderItems: ReadonlyRepo<OrderItem>;
  private readonly faqs: ReadonlyRepo<Faq>;
  private readonly promotions: ReadonlyRepo<Promotion>;
  private readonly users: ReadonlyRepo<User>;

  /** In-memory rate limit buckets per conversation. */
  private readonly buckets = new Map<string, RateLimitBucket>();
  private static readonly WINDOW_MS = 60 * 60 * 1000; // 1h

  constructor(
    @InjectRepository(Product) productRepo: Repository<Product>,
    @InjectRepository(Order) orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Faq) faqRepo: Repository<Faq>,
    @InjectRepository(Promotion) promotionRepo: Repository<Promotion>,
    @InjectRepository(User) userRepo: Repository<User>,
    // Audit repo — day la write-only (chi insert), de rieng, khong wrap readonly.
    @InjectRepository(ChatToolCall)
    private readonly toolCallRepo: Repository<ChatToolCall>,
    @Optional() private readonly inventoryService?: InventoryService,
  ) {
    this.products = asReadonly(productRepo);
    this.orders = asReadonly(orderRepo);
    this.orderItems = asReadonly(orderItemRepo);
    this.faqs = asReadonly(faqRepo);
    this.promotions = asReadonly(promotionRepo);
    this.users = asReadonly(userRepo);
  }

  // =========================================================================
  // Rate limiting + audit wrappers
  // =========================================================================

  /** Kiem tra rate limit — throw neu vuot. */
  private checkRateLimit(ctx: ChatToolContext, toolName: string): void {
    if (!ctx.conversationId) return; // skip (test context)
    const now = Date.now();
    let bucket = this.buckets.get(ctx.conversationId);
    if (!bucket || now - bucket.windowStart > ChatToolsService.WINDOW_MS) {
      bucket = { count: 0, orderLookups: 0, windowStart: now };
      this.buckets.set(ctx.conversationId, bucket);
    }
    bucket.count += 1;
    if (bucket.count > TOOL_CALL_LIMITS.MAX_PER_CONVERSATION_PER_HOUR) {
      throw new ToolRateLimitError(
        'Qua nhieu tool call trong 1 gio — vui long cho it phut.',
      );
    }
    if (/^(search_orders|get_order_details)$/.test(toolName)) {
      bucket.orderLookups += 1;
      if (bucket.orderLookups > TOOL_CALL_LIMITS.MAX_ORDER_LOOKUP_PER_HOUR) {
        throw new ToolRateLimitError(
          'Qua nhieu lan tra cuu don hang — lien he nhan vien neu can.',
        );
      }
    }
  }

  /**
   * Wrapper audit — log moi tool call (ok/denied/error/rate_limited) + duration.
   * Catch error, convert ToolPermissionDenied/ToolRateLimit thanh `{ error }` tra ve.
   */
  private async audit<T>(
    toolName: string,
    args: Record<string, any>,
    ctx: ChatToolContext,
    fn: () => Promise<T>,
  ): Promise<T | { error: string }> {
    const started = Date.now();
    try {
      // Permission + rate limit o NGOAI fn — de audit duoc ca denied/rate_limited
      assertPermission(toolName, ctx);
      this.checkRateLimit(ctx, toolName);

      const result = await fn();
      await this.writeAudit({
        conversationId: ctx.conversationId,
        toolName,
        args,
        result: 'ok',
        durationMs: Date.now() - started,
        actorType: ctx.actor,
        customerId: ctx.customerId ?? null,
        errorMessage: null,
      });
      return result;
    } catch (err) {
      const e = err as Error;
      let resultKind: 'denied' | 'rate_limited' | 'error' = 'error';
      if (e instanceof ToolPermissionDeniedError) resultKind = 'denied';
      else if (e instanceof ToolRateLimitError) resultKind = 'rate_limited';

      await this.writeAudit({
        conversationId: ctx?.conversationId ?? 'unknown',
        toolName,
        args,
        result: resultKind,
        durationMs: Date.now() - started,
        actorType: ctx?.actor ?? 'unknown',
        customerId: ctx?.customerId ?? null,
        errorMessage: String(e.message ?? '').slice(0, 500),
      });

      // Convert thanh { error } de AI tiep tuc respond, khong crash pipeline
      this.logger.warn(
        `tool ${toolName} ${resultKind}: ${e.message}`,
      );
      return { error: e.message };
    }
  }

  /** Insert audit row — swallow loi (audit khong duoc crash tool). */
  private async writeAudit(row: {
    conversationId: string;
    toolName: string;
    args: Record<string, any>;
    result: 'ok' | 'denied' | 'error' | 'rate_limited';
    errorMessage: string | null;
    durationMs: number;
    actorType: string;
    customerId: string | null;
  }): Promise<void> {
    try {
      const json = JSON.stringify(row.args ?? {});
      const argsStr = json.length > 2000 ? json.slice(0, 2000) : json;
      // BeforeInsert hook cua BaseEntity khong fire voi repo.insert() →
      // phai generate ULID thu cong cho audit row.
      await this.toolCallRepo.insert({
        id: generateUlid(),
        conversationId: row.conversationId,
        toolName: row.toolName,
        args: argsStr,
        result: row.result,
        errorMessage: row.errorMessage,
        durationMs: row.durationMs,
        actorType: row.actorType,
        customerId: row.customerId,
      });
    } catch (err) {
      this.logger.warn(`audit write failed: ${(err as Error).message}`);
    }
  }

  // =========================================================================
  // Tools — moi method wrap trong this.audit(...)
  // =========================================================================

  /**
   * Tim san pham theo keyword. Tra ve sanitized list.
   */
  async searchProducts(
    query: string,
    limit: number | undefined,
    ctx: ChatToolContext,
  ): Promise<ToolResult<Array<Record<string, any>>>> {
    return this.audit('search_products', { query, limit }, ctx, async () => {
      const input = validateSearchInput(query, limit, 10);
      const q = `%${input.query.toLowerCase()}%`;

      const products = await this.products
        .createQueryBuilder('p')
        .select([
          'p.id',
          'p.slug',
          'p.name',
          'p.description',
          'p.short_description',
          'p.price',
          'p.compare_at_price',
          'p.images',
          'p.is_active',
          'p.brand',
        ])
        .where('p.is_active = :active', { active: true })
        .andWhere('p.deleted_at IS NULL')
        .andWhere(
          new Brackets((b) => {
            b.where('LOWER(p.name) LIKE :q', { q })
              .orWhere('LOWER(p.description) LIKE :q', { q })
              .orWhere('LOWER(p.short_description) LIKE :q', { q });
          }),
        )
        .orderBy('p.is_featured', 'DESC')
        .addOrderBy('p.view_count', 'DESC')
        .take(input.limit)
        .getMany();

      const withStock = await Promise.all(
        products.map((p) => this.attachStock(p)),
      );
      return withStock
        .map((p) => sanitizeProduct(p, ctx.actor))
        .filter((x): x is Record<string, any> => x !== null);
    }) as Promise<ToolResult<Array<Record<string, any>>>>;
  }

  /**
   * Lay chi tiet 1 san pham theo ID.
   */
  async getProductById(
    id: string,
    ctx: ChatToolContext,
  ): Promise<ToolResult<Record<string, any> | null>> {
    return this.audit('get_product_by_id', { id }, ctx, async () => {
      const { id: safeId } = validateProductId(id);
      const product = await this.products.findOne({
        where: { id: safeId, deleted_at: IsNull() as any },
        select: [
          'id',
          'slug',
          'name',
          'description',
          'short_description',
          'price',
          'compare_at_price',
          'images',
          'is_active',
          'brand',
        ],
      });
      if (!product) return null;
      const withStock = await this.attachStock(product);
      return sanitizeProduct(withStock, ctx.actor);
    }) as Promise<ToolResult<Record<string, any> | null>>;
  }

  /**
   * Tim don hang.
   *  - GUEST → deny (da chan o PERMISSION_MATRIX, nhung double-check)
   *  - CUSTOMER → BO QUA keyword, chi query don cua chinh minh (cross-user isolation)
   *  - AGENT/ADMIN → query theo ULID/email/phone/order_number
   */
  async searchOrders(
    keyword: string,
    limit: number | undefined,
    ctx: ChatToolContext,
  ): Promise<ToolResult<Array<Record<string, any>>>> {
    return this.audit('search_orders', { keyword, limit }, ctx, async () => {
      if (ctx.actor === ChatActorType.GUEST) {
        throw new ToolPermissionDeniedError(
          'Guest khong the tra don hang. Yeu cau dang nhap.',
        );
      }

      // CUSTOMER — isolation: chi query don cua chinh ctx.customerId
      if (ctx.actor === ChatActorType.CUSTOMER) {
        if (!ctx.customerId) {
          throw new ToolPermissionDeniedError(
            'Thieu customerId — vui long dang nhap de tra don.',
          );
        }
        const input = validateOrderSearchInput(keyword || '___', limit);
        const qb = this.orders
          .createQueryBuilder('o')
          .select([
            'o.id',
            'o.order_number',
            'o.status',
            'o.total',
            'o.subtotal',
            'o.shipping_fee',
            'o.discount_amount',
            'o.currency',
            'o.created_at',
            'o.shipped_at',
            'o.delivered_at',
            'o.user_id',
          ])
          .where('o.user_id = :uid', { uid: ctx.customerId })
          .andWhere('o.deleted_at IS NULL')
          .orderBy('o.created_at', 'DESC')
          .take(input.limit);

        // Optional filter neu khach cung cap ma don
        if (input.kind === 'ulid') {
          qb.andWhere('o.id = :oid', { oid: input.keyword });
        } else if (input.kind === 'order_number') {
          qb.andWhere('o.order_number = :oc', { oc: input.keyword });
        }

        const rows = await qb.getMany();
        const itemCounts = await this.countItemsForOrders(
          rows.map((r) => r.id),
        );
        const enriched = rows.map((r) => ({
          ...r,
          itemCount: itemCounts.get(r.id) ?? 0,
        }));
        return enriched
          .map((o) => sanitizeOrder(o, ctx))
          .filter((x): x is Record<string, any> => x !== null);
      }

      // AGENT/ADMIN — full lookup by keyword
      const input = validateOrderSearchInput(keyword, limit);

      const qb = this.orders
        .createQueryBuilder('o')
        .select([
          'o.id',
          'o.order_number',
          'o.status',
          'o.total',
          'o.subtotal',
          'o.shipping_fee',
          'o.discount_amount',
          'o.currency',
          'o.created_at',
          'o.shipped_at',
          'o.delivered_at',
          'o.user_id',
          'o.shipping_address',
        ])
        .where('o.deleted_at IS NULL');

      if (input.kind === 'ulid') {
        qb.andWhere('o.id = :oid', { oid: input.keyword });
      } else if (input.kind === 'email' || input.kind === 'phone') {
        qb.innerJoin(
          User,
          'u',
          'u.id = o.user_id AND u.deleted_at IS NULL',
        );
        if (input.kind === 'email') {
          qb.andWhere('u.email = :em', { em: input.keyword.toLowerCase() });
        } else {
          qb.andWhere('u.phone = :ph', {
            ph: input.keyword.replace(/\s+/g, ''),
          });
        }
      } else if (input.kind === 'order_number') {
        qb.andWhere('o.order_number = :oc', { oc: input.keyword });
      } else {
        // fallback — AGENT can goi voi free text (rare), LIKE exact safe qua binding
        qb.andWhere('o.order_number LIKE :fuzzy', {
          fuzzy: `%${input.keyword}%`,
        });
      }

      const rows = await qb
        .orderBy('o.created_at', 'DESC')
        .take(input.limit)
        .getMany();
      const itemCounts = await this.countItemsForOrders(
        rows.map((r) => r.id),
      );
      return rows
        .map((r) => sanitizeOrder({ ...r, itemCount: itemCounts.get(r.id) ?? 0 }, ctx))
        .filter((x): x is Record<string, any> => x !== null);
    }) as Promise<ToolResult<Array<Record<string, any>>>>;
  }

  /**
   * Chi tiet don + items. CUSTOMER: enforce don phai thuoc ctx.customerId.
   */
  async getOrderById(
    orderIdOrNumber: string,
    _customerIdentifier: string | undefined, // dep: khong dung nua, giu cho backcompat signature
    ctx: ChatToolContext,
  ): Promise<ToolResult<Record<string, any> | null>> {
    return this.audit(
      'get_order_details',
      { orderIdOrNumber },
      ctx,
      async () => {
        const v = validateOrderId(orderIdOrNumber);
        const where = v.isUlid
          ? { id: v.id, deleted_at: IsNull() as any }
          : { order_number: v.id, deleted_at: IsNull() as any };

        const order = await this.orders.findOne({ where } as any);
        if (!order) return null;

        // Cross-user enforcement
        if (
          ctx.actor === ChatActorType.CUSTOMER &&
          order.user_id !== ctx.customerId
        ) {
          throw new ToolPermissionDeniedError(
            'Don hang khong thuoc tai khoan cua ban.',
          );
        }

        const items = await this.orderItems.find({
          where: { order_id: order.id },
        });
        return sanitizeOrder({ ...order, items }, ctx);
      },
    ) as Promise<ToolResult<Record<string, any> | null>>;
  }

  /**
   * Search FAQ — chi tra is_active=true.
   */
  async searchFaq(
    query: string,
    limit: number | undefined,
    ctx: ChatToolContext,
  ): Promise<ToolResult<Array<Record<string, any>>>> {
    return this.audit('search_faq', { query, limit }, ctx, async () => {
      const input = validateSearchInput(query, limit, 5);
      const q = `%${input.query.toLowerCase()}%`;

      const faqs = await this.faqs
        .createQueryBuilder('f')
        .select(['f.id', 'f.question', 'f.answer', 'f.is_active'])
        .where('f.is_active = :active', { active: true })
        .andWhere('f.deleted_at IS NULL')
        .andWhere(
          new Brackets((b) => {
            b.where('LOWER(f.question) LIKE :q', { q }).orWhere(
              'LOWER(f.answer) LIKE :q',
              { q },
            );
          }),
        )
        .orderBy('f.helpful_count', 'DESC')
        .addOrderBy('f.view_count', 'DESC')
        .take(input.limit)
        .getMany();

      return faqs
        .map((f) => sanitizeFaq(f))
        .filter((x): x is Record<string, any> => x !== null);
    }) as Promise<ToolResult<Array<Record<string, any>>>>;
  }

  /**
   * Promotions dang active.
   */
  async getPromotions(
    ctx: ChatToolContext,
  ): Promise<ToolResult<Array<Record<string, any>>>> {
    return this.audit('get_promotions', {}, ctx, async () => {
      const now = new Date();
      const rows = await this.promotions.find({
        where: {
          is_active: true,
          deleted_at: IsNull() as any,
          start_date: LessThanOrEqual(now),
          end_date: MoreThanOrEqual(now),
        },
        order: { start_date: 'DESC' },
        take: 10,
        select: [
          'id',
          'code',
          'name',
          'description',
          'type',
          'value',
          'min_order_amount',
          'max_discount_amount',
          'end_date',
        ],
      });
      return rows
        .map((p) => sanitizePromotion(p))
        .filter((x): x is Record<string, any> => x !== null);
    }) as Promise<ToolResult<Array<Record<string, any>>>>;
  }

  /**
   * Chinh sach giao hang — static, khong query DB.
   */
  async getShippingPolicy(
    ctx: ChatToolContext,
  ): Promise<ToolResult<Record<string, any>>> {
    return this.audit('get_shipping_policy', {}, ctx, async () => {
      return {
        domestic: {
          zones: ['Noi thanh HCM/HN', 'Cac tinh thanh khac'],
          fee: {
            noi_thanh: '20.000 - 35.000 VND',
            tinh_thanh: '30.000 - 50.000 VND',
          },
          lead_time: {
            noi_thanh: '1-2 ngay lam viec',
            tinh_thanh: '3-5 ngay lam viec',
          },
          free_shipping_threshold: '500.000 VND tro len',
          cod: true,
        },
        return_policy:
          '7 ngay doi tra neu san pham con nguyen tem mac, chua qua su dung.',
        support_hours: '8:00 - 21:00 moi ngay',
      };
    }) as Promise<ToolResult<Record<string, any>>>;
  }

  // =========================================================================
  // Helpers — private
  // =========================================================================

  /** Dem so items cho loat orders — 1 query GROUP BY, tranh N+1. */
  private async countItemsForOrders(
    orderIds: string[],
  ): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (orderIds.length === 0) return map;
    const rows = await this.orderItems
      .createQueryBuilder('oi')
      .select('oi.order_id', 'order_id')
      .addSelect('COUNT(*)', 'cnt')
      .where('oi.order_id IN (:...ids)', { ids: orderIds })
      .groupBy('oi.order_id')
      .getRawMany<{ order_id: string; cnt: string }>();
    for (const r of rows) map.set(r.order_id, Number(r.cnt));
    return map;
  }

  /**
   * Gan stock tu InventoryService neu available — set fields inStock, stock.
   * Neu khong co service → fallback is_active.
   */
  private async attachStock(p: Product): Promise<any> {
    const base: any = { ...p, inStock: p.is_active, stock: null };
    if (!this.inventoryService || !p.is_active) return base;
    try {
      const inv = await this.inventoryService.getStock(p.id);
      if (!inv) return base;
      if (!inv.track_inventory) {
        base.inStock = true;
        base.stock = null;
      } else {
        const avail = Math.max(0, inv.quantity - inv.reserved);
        base.stock = avail;
        base.inStock = avail > 0 || inv.allow_backorder;
      }
    } catch (err) {
      this.logger.warn(
        `attachStock failed for ${p.id}: ${(err as Error).message}`,
      );
    }
    return base;
  }
}
