/**
 * Field whitelist sanitizers — moi response entity di qua 1 sanitizer tuong ung
 * de dam bao AI chi thay PUBLIC fields, KHONG bao gio leak internal data.
 *
 * Danh sach cam (KHONG duoc tra ra cho AI):
 *  - Product: cost_price, margin, supplierId, internal notes, adminNote
 *  - Order: user_id, customer email/phone, payment token, transaction id,
 *           IP dat hang, admin notes, internal status
 *  - Promotion: usage_limit, usage_count, per_user_limit (neu khong public)
 *  - FAQ: internal categories, draft
 */
import { ChatActorType, ChatToolContext } from './tool-context.js';

/**
 * Sanitize product — chi expose fields cong khai. Description cap 500 chars.
 */
export function sanitizeProduct(
  p: any,
  _actor: ChatActorType,
): Record<string, any> | null {
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description:
      typeof p.description === 'string' ? p.description.slice(0, 500) : undefined,
    shortDescription:
      typeof p.short_description === 'string'
        ? p.short_description.slice(0, 200)
        : undefined,
    price: p.price != null ? Number(p.price) : null,
    compareAtPrice:
      p.compare_at_price != null ? Number(p.compare_at_price) : null,
    currency: p.currency ?? 'VND',
    image:
      Array.isArray(p.images) && p.images.length > 0 ? p.images[0]?.url : null,
    images: Array.isArray(p.images)
      ? p.images.slice(0, 3).map((i: any) => i?.url).filter(Boolean)
      : [],
    inStock: Boolean(p.inStock),
    stock: typeof p.stock === 'number' ? p.stock : null,
    brand: p.brand ?? null,
    // CAM: cost_price, margin, supplierId, internal notes, view_count, sort_order,
    //      tenant_id, seo_*, raw tags (co the chua internal tags)
  };
}

/**
 * Map order status enum → nhan hien thi tieng Viet cho end-user.
 */
function mapStatusLabel(s: string | undefined | null): string {
  if (!s) return '';
  const labels: Record<string, string> = {
    pending: 'Cho xac nhan',
    confirmed: 'Da xac nhan',
    processing: 'Dang xu ly',
    shipped: 'Dang giao',
    delivered: 'Da giao',
    cancelled: 'Da huy',
    refunded: 'Da hoan tien',
  };
  return labels[s] ?? s;
}

/**
 * Sanitize order — enforce cross-user isolation cho CUSTOMER actor.
 * Neu don khong thuoc customer hien tai → return null.
 */
export function sanitizeOrder(
  o: any,
  ctx: ChatToolContext,
): Record<string, any> | null {
  if (!o) return null;

  // Cross-user check: neu la CUSTOMER va don co user_id khac customerId → tu choi
  if (
    ctx.actor === ChatActorType.CUSTOMER &&
    o.user_id &&
    ctx.customerId &&
    o.user_id !== ctx.customerId
  ) {
    return null;
  }

  const base: Record<string, any> = {
    id: o.id,
    code: o.order_number ?? o.code,
    status: o.status,
    statusLabel: mapStatusLabel(o.status),
    total: o.total != null ? Number(o.total) : null,
    subtotal: o.subtotal != null ? Number(o.subtotal) : undefined,
    shippingFee:
      o.shipping_fee != null ? Number(o.shipping_fee) : undefined,
    discountAmount:
      o.discount_amount != null ? Number(o.discount_amount) : undefined,
    currency: o.currency ?? 'VND',
    createdAt: o.created_at ?? o.createdAt,
    shippedAt: o.shipped_at ?? null,
    deliveredAt: o.delivered_at ?? null,
    itemCount: typeof o.itemCount === 'number' ? o.itemCount : undefined,
  };

  // Items — chi tra public fields, mask snapshot price la duoc roi
  if (Array.isArray(o.items)) {
    base.items = o.items.map((i: any) => ({
      productName: i.product_name,
      variantName: i.variant_name ?? null,
      quantity: i.quantity,
      price: i.price != null ? Number(i.price) : null,
      total: i.total != null ? Number(i.total) : null,
    }));
  }

  // AGENT/ADMIN duoc thay shipping info (de ho tro); CUSTOMER khong can vi la don cua chinh ho
  if (
    (ctx.actor === ChatActorType.AGENT || ctx.actor === ChatActorType.ADMIN) &&
    o.shipping_address
  ) {
    const addr = o.shipping_address;
    base.shippingAddress = {
      name: addr.name,
      city: addr.city,
      district: addr.district,
      // CAM: so nha chi tiet + phone o AI response (van tra cho customer chinh chu)
    };
  } else if (ctx.actor === ChatActorType.CUSTOMER && o.shipping_address) {
    const addr = o.shipping_address;
    base.shippingAddress = {
      name: addr.name,
      city: addr.city,
      district: addr.district,
      ward: addr.ward,
      address: addr.address,
    };
  }

  // CAM tuyet doi: user_id, billing_address, cancelled_reason (internal),
  //                 promotion_code cua admin, tenant_id, metadata, note (admin note)
  return base;
}

/**
 * Sanitize FAQ — chi tra public, active faqs. Default is_active=true neu chua set.
 */
export function sanitizeFaq(f: any): Record<string, any> | null {
  if (!f) return null;
  if (f.is_active === false) return null;
  return {
    id: f.id,
    question: f.question,
    answer: f.answer,
  };
}

/**
 * Sanitize promotion — chi tra public fields. Hide usage_limit/used_count.
 */
export function sanitizePromotion(p: any): Record<string, any> | null {
  if (!p) return null;
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    type: p.type,
    value: p.value != null ? Number(p.value) : null,
    minOrderAmount:
      p.min_order_amount != null ? Number(p.min_order_amount) : null,
    maxDiscountAmount:
      p.max_discount_amount != null ? Number(p.max_discount_amount) : null,
    endDate: p.end_date,
    // CAM: usage_limit, used_count, per_user_limit, tenant_id, conditions internal
  };
}
