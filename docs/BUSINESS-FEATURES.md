# WebTemplate — Tong Hop Tinh Nang Nghiep Vu

> Tai lieu tong hop toan bo tinh nang nghiep vu cua he thong WebTemplate.
> Moi module gom: mo ta, actors, use cases, data model, API endpoints, lien ket.

---

## Muc luc

1. [Quan ly nguoi dung (Users + Auth)](#1-quan-ly-nguoi-dung-users--auth)
2. [Quan ly san pham (Products + Categories + Inventory)](#2-quan-ly-san-pham-products--categories--inventory)
3. [Mua sam & Thanh toan (Cart + Orders + Payments)](#3-mua-sam--thanh-toan-cart--orders--payments)
4. [Khuyen mai & Danh gia (Promotions + Reviews)](#4-khuyen-mai--danh-gia-promotions--reviews)
5. [Quan ly noi dung (Articles + Pages + Navigation)](#5-quan-ly-noi-dung-articles--pages--navigation)
6. [SEO & Tim kiem (SEO + Search)](#6-seo--tim-kiem-seo--search)
7. [Truyen thong & Ho tro (Notifications + Contacts + FAQ)](#7-truyen-thong--ho-tro-notifications--contacts--faq)
8. [Phan tich & Bao cao (Analytics + Logs)](#8-phan-tich--bao-cao-analytics--logs)
9. [SaaS & Da khach hang (Tenants + Plans + API Keys + Webhooks)](#9-saas--da-khach-hang-tenants--plans--api-keys--webhooks)
10. [Da ngon ngu & Xuat nhap (i18n + Export/Import)](#10-da-ngon-ngu--xuat-nhap-i18n--exportimport)
11. [Media & Luu tru (Media)](#11-media--luu-tru-media)
12. [Email Templates](#12-email-templates)

---

## 1. Quan ly nguoi dung (Users + Auth)

### Mo ta chuc nang
He thong quan ly nguoi dung toan dien voi xac thuc JWT, phan quyen 4 cap, ho tro nhieu phuong thuc dang nhap. Refresh token luu hash SHA256 trong DB, ho tro token rotation va phat hien token reuse.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Quan ly toan bo user, phan quyen, xem audit log |
| **Manager** | Quan ly user thuong, xem danh sach |
| **User** | Dang ky, dang nhap, doi mat khau, cap nhat profile |
| **Guest** | Xem trang public, dang ky tai khoan |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-1.1 | Dang ky tai khoan (email + password) | **Must** | Guest |
| UC-1.2 | Dang nhap (email + password) | **Must** | Guest |
| UC-1.3 | Dang xuat (revoke refresh token) | **Must** | User |
| UC-1.4 | Refresh token (tu dong gia han) | **Must** | System |
| UC-1.5 | Quen mat khau (gui email reset link) | **Must** | Guest |
| UC-1.6 | Reset mat khau (bang token) | **Must** | Guest |
| UC-1.7 | Doi mat khau (can mat khau cu) | **Must** | User |
| UC-1.8 | Phan quyen 4 cap (Admin/Manager/Editor/User) | **Must** | Admin |
| UC-1.9 | Xac thuc 2 lop (2FA TOTP) | **Should** | User |
| UC-1.10 | OAuth Google | **Should** | Guest |
| UC-1.11 | OAuth Facebook | **Should** | Guest |
| UC-1.12 | Cap nhat profile (ten, avatar, phone) | **Must** | User |
| UC-1.13 | Quan ly danh sach user (list, filter, search) | **Must** | Admin |
| UC-1.14 | Kich hoat / Vo hieu hoa tai khoan | **Must** | Admin |
| UC-1.15 | Token reuse detection (revoke all) | **Must** | System |

### Data Model Summary

**User entity** (`backend/src/modules/users/entities/user.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `email` | VARCHAR unique | Email dang nhap |
| `password_hash` | VARCHAR | Bcrypt hash |
| `name` | VARCHAR(100) | Ho ten |
| `phone` | VARCHAR(15) | So dien thoai |
| `avatar` | VARCHAR | URL avatar |
| `role` | ENUM | admin / manager / editor / user |
| `is_active` | BOOLEAN | Trang thai tai khoan |
| `last_login_at` | TIMESTAMP | Lan dang nhap cuoi |
| `tenant_id` | CHAR(26) | Thuoc tenant nao |
| `created_at` | TIMESTAMP | Ngay tao |
| `updated_at` | TIMESTAMP | Ngay cap nhat |
| `deleted_at` | TIMESTAMP | Soft delete |

**RefreshToken entity** (`backend/src/modules/auth/entities/refresh-token.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `user_id` | CHAR(26) FK | Lien ket User |
| `token_hash` | VARCHAR(64) | SHA256 hash cua token |
| `ip_address` | VARCHAR(45) | IP thiet bi |
| `user_agent` | VARCHAR(500) | Thong tin trinh duyet |
| `expires_at` | TIMESTAMP | Het han (7 ngay) |
| `is_revoked` | BOOLEAN | Da thu hoi chua |
| `created_at` | TIMESTAMP | Thoi diem tao |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| POST | `/auth/register` | Public | Dang ky tai khoan |
| POST | `/auth/login` | Public | Dang nhap |
| POST | `/auth/refresh` | Public | Refresh access token |
| POST | `/auth/logout` | Auth | Dang xuat |
| POST | `/auth/change-password` | Auth | Doi mat khau |
| POST | `/auth/forgot-password` | Public | Yeu cau reset password |
| POST | `/auth/reset-password` | Public | Reset password bang token |
| GET | `/users` | Admin | List users (phan trang) |
| GET | `/users/:id` | Auth | Xem chi tiet user |
| PATCH | `/users/:id` | Auth | Cap nhat profile |
| DELETE | `/users/:id` | Admin | Xoa user (soft delete) |

### Lien ket modules khac
- **Orders**: user_id → don hang cua user
- **Cart**: user_id → gio hang cua user
- **Notifications**: user_id → thong bao cua user
- **Articles**: author_id → tac gia bai viet
- **Media**: uploaded_by → nguoi upload
- **Tenants**: owner_id → chu tenant
- **Analytics**: user_id → tracking event

---

## 2. Quan ly san pham (Products + Categories + Inventory)

### Mo ta chuc nang
Quan ly san pham e-commerce voi variants (size, color), danh muc phan cap, ton kho real-time. Ho tro loc theo gia/category/tags, san pham noi bat, SEO meta, view count.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | CRUD san pham, quan ly ton kho, import/export |
| **Manager** | Tao/sua san pham, xem ton kho |
| **User** | Xem san pham, tim kiem, loc |
| **Guest** | Xem san pham public |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-2.1 | Tao san pham voi thong tin co ban | **Must** | Admin |
| UC-2.2 | Tao san pham voi variants (size, color, SKU) | **Must** | Admin |
| UC-2.3 | Danh muc phan cap (parent/children) | **Must** | Admin |
| UC-2.4 | Upload nhieu hinh anh san pham | **Must** | Admin |
| UC-2.5 | Loc san pham theo gia, danh muc, tags | **Must** | User |
| UC-2.6 | Tim kiem san pham theo ten, SKU, brand | **Must** | User |
| UC-2.7 | Xem san pham theo slug (SEO-friendly URL) | **Must** | Guest |
| UC-2.8 | San pham noi bat (is_featured) | **Should** | Admin |
| UC-2.9 | Theo doi luot xem san pham (view_count) | **Should** | System |
| UC-2.10 | Quan ly ton kho theo product/variant | **Must** | Admin |
| UC-2.11 | Canh bao het hang (low_stock_threshold) | **Must** | System |
| UC-2.12 | Dat truoc ton kho khi tao don (reserve) | **Must** | System |
| UC-2.13 | Giai phong ton kho khi huy don (release) | **Must** | System |
| UC-2.14 | Lich su bien dong ton kho (movements) | **Should** | Admin |
| UC-2.15 | Cho phep backorder (allow_backorder) | **Nice** | Admin |
| UC-2.16 | Import san pham hang loat (CSV/XLSX) | **Should** | Admin |
| UC-2.17 | SEO meta (title, description, keywords) | **Should** | Admin |
| UC-2.18 | Thuoc tinh san pham dong (attributes JSON) | **Nice** | Admin |

### Data Model Summary

**Product entity** (`backend/src/modules/products/entities/product.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `name` | VARCHAR | Ten san pham |
| `slug` | VARCHAR unique | URL slug (tu dong tu name) |
| `sku` | VARCHAR | Ma san pham |
| `brand` | VARCHAR | Thuong hieu |
| `description` | TEXT | Mo ta chi tiet |
| `short_description` | TEXT | Mo ta ngan |
| `price` | DECIMAL(12,2) | Gia ban |
| `compare_price` | DECIMAL(12,2) | Gia so sanh (gia goc) |
| `cost_price` | DECIMAL(12,2) | Gia von |
| `category_id` | CHAR(26) FK | Danh muc |
| `images` | JSON | Mang hinh anh [{url, alt}] |
| `tags` | JSON | Tags (JSON array) |
| `attributes` | JSON | Thuoc tinh dong |
| `is_active` | BOOLEAN | Hien thi hay khong |
| `is_featured` | BOOLEAN | San pham noi bat |
| `sort_order` | INT | Thu tu sap xep |
| `view_count` | INT | Luot xem |
| `seo_title` | VARCHAR | SEO title |
| `seo_description` | TEXT | SEO description |
| `tenant_id` | CHAR(26) | Thuoc tenant |

**ProductVariant entity** (`backend/src/modules/products/entities/product-variant.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `product_id` | CHAR(26) FK | San pham cha |
| `name` | VARCHAR | Ten variant (vd: "Do - XL") |
| `sku` | VARCHAR | SKU rieng |
| `price` | DECIMAL(12,2) | Gia rieng (override) |
| `attributes` | JSON | { size: "XL", color: "Red" } |
| `is_active` | BOOLEAN | Hien thi |

**Inventory entity** (`backend/src/modules/inventory/entities/inventory.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `product_id` | CHAR(26) FK | San pham |
| `variant_id` | CHAR(26) FK | Variant (nullable) |
| `quantity` | INT | So luong ton |
| `reserved` | INT | So luong da dat truoc |
| `low_stock_threshold` | INT | Nguong canh bao |
| `track_inventory` | BOOLEAN | Co theo doi ton kho |
| `allow_backorder` | BOOLEAN | Cho phep dat khi het |

**InventoryMovement entity** (`backend/src/modules/inventory/entities/inventory-movement.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `inventory_id` | CHAR(26) FK | Inventory record |
| `quantity_change` | INT | Thay doi (+/-) |
| `type` | ENUM | IN / OUT / RESERVED / RELEASED / ADJUSTMENT |
| `reference_type` | VARCHAR | Nguon (order, manual) |
| `reference_id` | CHAR(26) | ID nguon |
| `note` | TEXT | Ghi chu |
| `created_by` | CHAR(26) | Nguoi thuc hien |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/products` | Public | List san pham (phan trang, loc) |
| GET | `/products/:id` | Public | Chi tiet san pham |
| GET | `/products/slug/:slug` | Public | San pham theo slug |
| GET | `/products/featured` | Public | San pham noi bat |
| GET | `/products/category/:id` | Public | San pham theo danh muc |
| POST | `/products` | Admin | Tao san pham |
| PATCH | `/products/:id` | Admin | Cap nhat san pham |
| DELETE | `/products/:id` | Admin | Xoa san pham (soft) |
| GET | `/categories` | Public | List danh muc |
| POST | `/categories` | Admin | Tao danh muc |
| GET | `/inventory/:productId` | Admin | Xem ton kho |
| POST | `/inventory/adjust` | Admin | Dieu chinh ton kho |
| GET | `/inventory/low-stock` | Admin | San pham sap het |

### Key Functions

| Service | Method | Mo ta |
|---|---|---|
| `ProductsService` | `createWithVariants(dto)` | Tao san pham kem variants |
| `ProductsService` | `findBySlug(slug)` | Tim theo slug (SEO URL) |
| `ProductsService` | `findByCategory(id)` | San pham theo category |
| `ProductsService` | `findFeatured(limit)` | San pham noi bat |
| `ProductsService` | `updateViewCount(id)` | Tang view count +1 |
| `InventoryService` | `adjustStock(dto)` | Dieu chinh ton kho + ghi movement |
| `InventoryService` | `reserveStock(productId, qty)` | Dat truoc cho don hang |
| `InventoryService` | `releaseStock(productId, qty)` | Giai phong khi huy don |
| `InventoryService` | `isInStock(productId, qty)` | Kiem tra con hang |
| `InventoryService` | `getLowStockItems()` | San pham duoi nguong canh bao |

### Lien ket modules khac
- **Cart**: product_id, variant_id → them vao gio
- **Orders**: product_id → order items (price snapshot)
- **Inventory**: product_id → quan ly ton kho
- **Media**: hinh anh san pham
- **Categories**: category_id → phan loai
- **Search**: name, description → full-text search
- **Analytics**: product_view event

---

## 3. Mua sam & Thanh toan (Cart + Orders + Payments)

### Mo ta chuc nang
Luong mua sam toan dien: gio hang ho tro guest + user (merge khi login), checkout tao don hang voi price snapshot, tich hop nhieu cong thanh toan (VNPay, MoMo, Stripe, COD), quan ly trang thai don hang, hoan tien.

### Actors

| Actor | Mo ta |
|---|---|
| **Guest** | Them vao gio (session-based) |
| **User** | Dat hang, xem don, huy don |
| **Admin** | Quan ly don hang, cap nhat trang thai, hoan tien |
| **System** | Xu ly callback thanh toan, canh bao het hang |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-3.1 | Them san pham vao gio hang | **Must** | User/Guest |
| UC-3.2 | Cap nhat so luong trong gio | **Must** | User/Guest |
| UC-3.3 | Xoa san pham khoi gio | **Must** | User/Guest |
| UC-3.4 | Xoa toan bo gio hang | **Should** | User/Guest |
| UC-3.5 | Gop gio hang guest khi dang nhap (merge) | **Must** | System |
| UC-3.6 | Checkout tu gio hang (createFromCart) | **Must** | User |
| UC-3.7 | Dat hang truc tiep (createDirect) | **Should** | User |
| UC-3.8 | Tao thanh toan cho don hang | **Must** | System |
| UC-3.9 | Thanh toan VNPay | **Must** | User |
| UC-3.10 | Thanh toan MoMo | **Should** | User |
| UC-3.11 | Thanh toan Stripe | **Should** | User |
| UC-3.12 | Thanh toan COD (tien mat) | **Must** | User |
| UC-3.13 | Xu ly callback thanh toan tu gateway | **Must** | System |
| UC-3.14 | Xem danh sach don hang cua toi | **Must** | User |
| UC-3.15 | Xem chi tiet don hang | **Must** | User |
| UC-3.16 | Huy don hang (PENDING/CONFIRMED) | **Must** | User |
| UC-3.17 | Cap nhat trang thai don (admin) | **Must** | Admin |
| UC-3.18 | Hoan tien don hang | **Must** | Admin |
| UC-3.19 | Thong ke don hang theo thoi gian | **Should** | Admin |
| UC-3.20 | Phat hien gio hang bo roi (7 ngay) | **Nice** | System |
| UC-3.21 | Tinh tong gia tri gio hang | **Must** | System |

### Data Model Summary

**Cart entity** (`backend/src/modules/cart/entities/cart.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `user_id` | CHAR(26) FK | User (nullable — guest) |
| `session_id` | VARCHAR | Session ID (guest cart) |
| `status` | ENUM | ACTIVE / CONVERTED / ABANDONED / MERGED |
| `tenant_id` | CHAR(26) | Tenant |

**CartItem entity** (`backend/src/modules/cart/entities/cart-item.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `cart_id` | CHAR(26) FK | Cart |
| `product_id` | CHAR(26) FK | San pham |
| `variant_id` | CHAR(26) FK | Variant (nullable) |
| `quantity` | INT | So luong |
| `price` | DECIMAL | Gia tai thoi diem |
| `metadata` | JSON | Thong tin them |

**Order entity** (`backend/src/modules/orders/entities/order.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `order_number` | VARCHAR(20) unique | Ma don: ORD-YYYYMMDD-XXXX |
| `user_id` | CHAR(26) FK | Nguoi dat |
| `status` | ENUM | OrderStatus (7 trang thai) |
| `subtotal` | DECIMAL(12,2) | Tong truoc giam gia |
| `discount_amount` | DECIMAL(12,2) | Tien giam gia |
| `shipping_fee` | DECIMAL(12,2) | Phi van chuyen |
| `tax_amount` | DECIMAL(12,2) | Thue |
| `total` | DECIMAL(12,2) | Tong cuoi cung |
| `currency` | VARCHAR(3) | Tien te (default VND) |
| `shipping_address` | JSON | Dia chi giao: {name, phone, address, city, district, ward, zip} |
| `billing_address` | JSON | Dia chi hoa don (nullable) |
| `note` | TEXT | Ghi chu |
| `promotion_code` | VARCHAR(50) | Ma khuyen mai da dung |
| `cancelled_reason` | TEXT | Ly do huy |
| `shipped_at` | TIMESTAMP | Thoi diem giao |
| `delivered_at` | TIMESTAMP | Thoi diem nhan |
| `tenant_id` | CHAR(26) | Tenant |

**Payment entity** (`backend/src/modules/payments/entities/payment.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `order_id` | CHAR(26) FK | Don hang |
| `method` | ENUM | vnpay / momo / stripe / cod / bank_transfer |
| `amount` | DECIMAL(12,2) | So tien |
| `status` | ENUM | PaymentStatus (4 trang thai) |
| `transaction_id` | VARCHAR | Ma giao dich tu gateway |
| `gateway_response` | JSON | Raw response tu gateway |
| `paid_at` | TIMESTAMP | Thoi diem thanh toan |
| `refunded_at` | TIMESTAMP | Thoi diem hoan tien |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/cart` | Auth/Session | Xem gio hang |
| POST | `/cart/items` | Auth/Session | Them san pham |
| PATCH | `/cart/items/:id` | Auth/Session | Cap nhat so luong |
| DELETE | `/cart/items/:id` | Auth/Session | Xoa san pham |
| DELETE | `/cart` | Auth/Session | Xoa toan bo |
| POST | `/orders` | Auth | Dat hang |
| GET | `/orders` | Auth | Danh sach don hang |
| GET | `/orders/:id` | Auth | Chi tiet don hang |
| POST | `/orders/:id/cancel` | Auth | Huy don hang |
| PATCH | `/orders/:id/status` | Admin | Cap nhat trang thai |
| POST | `/payments` | Auth | Tao thanh toan |
| POST | `/payments/callback/:gateway` | Public | Callback tu gateway |
| POST | `/payments/:id/refund` | Admin | Hoan tien |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `CartService` | `getOrCreateCart(userId, sessionId)` | cart.service.ts:26 | Lay/tao gio hang |
| `CartService` | `addItem(cartId, dto)` | cart.service.ts:58 | Them item (cong so luong neu da co) |
| `CartService` | `mergeGuestCart(sessionId, userId)` | cart.service.ts:145 | Gop guest cart vao user cart |
| `CartService` | `markAbandoned()` | cart.service.ts:203 | Phat hien gio bo roi (>7 ngay) |
| `OrdersService` | `createFromCart(userId, dto, cartItems)` | orders.service.ts:36 | Tao don tu gio hang |
| `OrdersService` | `createDirect(userId, dto)` | orders.service.ts:94 | Tao don truc tiep |
| `OrdersService` | `updateStatus(id, status, reason)` | orders.service.ts:138 | Cap nhat trang thai |
| `OrdersService` | `cancelOrder(id, reason)` | orders.service.ts:244 | Huy don |
| `OrdersService` | `getOrderStats(dateFrom, dateTo)` | orders.service.ts:206 | Thong ke |
| `PaymentsService` | `createPayment(orderId, method, amount)` | payments.service.ts:28 | Tao giao dich |
| `PaymentsService` | `processCallback(gateway, data)` | payments.service.ts:58 | Xu ly callback |
| `PaymentsService` | `refund(paymentId)` | payments.service.ts:110 | Hoan tien |

### Lien ket modules khac
- **Users**: user_id → nguoi dat hang
- **Products**: product_id → san pham trong don
- **Inventory**: reserveStock/releaseStock khi dat/huy don
- **Promotions**: promotion_code → ap dung giam gia
- **Notifications**: gui thong bao khi co don moi, thanh toan, giao hang
- **Webhooks**: trigger order.created, payment.received, order.cancelled
- **Analytics**: purchase event, revenue chart

---

## 4. Khuyen mai & Danh gia (Promotions + Reviews)

### Mo ta chuc nang
Quan ly ma giam gia voi nhieu loai (%, fixed, free shipping), dieu kien ap dung (min order, thoi gian, gioi han su dung). He thong danh gia san pham cho phep user danh gia 1-5 sao va binh luan.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Tao/sua/xoa ma giam gia, duyet danh gia |
| **User** | Ap dung ma giam gia, viet danh gia san pham |
| **System** | Validate promotion, tinh discount |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-4.1 | Tao ma giam gia theo % | **Must** | Admin |
| UC-4.2 | Tao ma giam gia so tien co dinh | **Must** | Admin |
| UC-4.3 | Tao ma mien phi van chuyen | **Should** | Admin |
| UC-4.4 | Dat dieu kien: don toi thieu (min_order_amount) | **Must** | Admin |
| UC-4.5 | Dat dieu kien: thoi gian (start_date, end_date) | **Must** | Admin |
| UC-4.6 | Gioi han tong so lan su dung (usage_limit) | **Must** | Admin |
| UC-4.7 | Gioi han su dung per user (per_user_limit) | **Must** | Admin |
| UC-4.8 | Gioi han muc giam toi da (max_discount_amount) | **Should** | Admin |
| UC-4.9 | Validate ma giam gia (frontend preview) | **Must** | User |
| UC-4.10 | Ap dung ma giam gia cho don hang | **Must** | System |
| UC-4.11 | Xem cac khuyen mai dang hoat dong | **Should** | User |
| UC-4.12 | Thong ke su dung khuyen mai | **Should** | Admin |
| UC-4.13 | Danh gia san pham (1-5 sao + noi dung) | **Should** | User |
| UC-4.14 | Upload hinh anh danh gia | **Nice** | User |
| UC-4.15 | Duyet / Tu choi danh gia | **Should** | Admin |
| UC-4.16 | Tra loi danh gia tu admin | **Nice** | Admin |

### Data Model Summary

**Promotion entity** (`backend/src/modules/promotions/entities/promotion.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `code` | VARCHAR unique | Ma giam gia (vd: SALE50) |
| `name` | VARCHAR | Ten khuyen mai |
| `type` | ENUM | percentage / fixed / free_shipping |
| `value` | DECIMAL | Gia tri giam (% hoac so tien) |
| `min_order_amount` | DECIMAL | Don toi thieu |
| `max_discount_amount` | DECIMAL | Giam toi da (cho %) |
| `usage_limit` | INT | Gioi han tong |
| `per_user_limit` | INT | Gioi han per user |
| `used_count` | INT | So lan da dung |
| `start_date` | TIMESTAMP | Bat dau |
| `end_date` | TIMESTAMP | Ket thuc |
| `is_active` | BOOLEAN | Dang hoat dong |

**PromotionUsage entity** (`backend/src/modules/promotions/entities/promotion-usage.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `promotion_id` | CHAR(26) FK | Khuyen mai |
| `user_id` | CHAR(26) FK | User da dung |
| `order_id` | CHAR(26) FK | Don hang ap dung |
| `discount_amount` | DECIMAL | So tien duoc giam |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/promotions` | Admin | List khuyen mai |
| POST | `/promotions` | Admin | Tao khuyen mai |
| POST | `/promotions/validate` | Auth | Validate ma giam gia |
| POST | `/promotions/apply` | Auth | Ap dung cho don |
| GET | `/promotions/active` | Public | Khuyen mai dang chay |
| GET | `/promotions/:id/stats` | Admin | Thong ke su dung |
| GET | `/reviews` | Public | List danh gia |
| POST | `/reviews` | Auth | Tao danh gia |
| PATCH | `/reviews/:id/approve` | Admin | Duyet danh gia |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `PromotionsService` | `validate(code, userId, orderAmount)` | promotions.service.ts:29 | Validate day du dieu kien |
| `PromotionsService` | `apply(code, orderId, userId, amount)` | promotions.service.ts:78 | Ap dung + ghi usage |
| `PromotionsService` | `getActivePromotions()` | promotions.service.ts:124 | List khuyen mai dang chay |
| `PromotionsService` | `getUsageStats(promotionId)` | promotions.service.ts:140 | Thong ke: tong luot + tong giam |

### Lien ket modules khac
- **Orders**: promotion_code → ap dung giam gia, order_id → ghi usage
- **Users**: user_id → gioi han per user
- **Products**: product_id → danh gia san pham (Reviews)

---

## 5. Quan ly noi dung (Articles + Pages + Navigation)

### Mo ta chuc nang
CMS toan dien voi blog articles (rich text), static pages (page builder JSON config), he thong menu dong. Ho tro trang thai xuat ban (draft/published/archived), SEO, tags, categories, bai viet lien quan.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Quan ly tat ca noi dung, menu, pages |
| **Editor** | Tao/sua bai viet, pages |
| **User** | Xem noi dung cong khai |
| **Guest** | Xem noi dung cong khai |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-5.1 | Tao bai viet moi (rich text Tiptap) | **Must** | Editor |
| UC-5.2 | Xuat ban bai viet (DRAFT → PUBLISHED) | **Must** | Editor |
| UC-5.3 | Huy xuat ban (PUBLISHED → DRAFT) | **Must** | Editor |
| UC-5.4 | Luu tru bai viet (ARCHIVED) | **Should** | Admin |
| UC-5.5 | Phan loai bai viet theo category | **Must** | Editor |
| UC-5.6 | Gan tags cho bai viet | **Must** | Editor |
| UC-5.7 | Tim bai viet theo tag | **Must** | User |
| UC-5.8 | Bai viet lien quan (cung category/tag) | **Should** | System |
| UC-5.9 | Bai viet noi bat (is_featured) | **Should** | Editor |
| UC-5.10 | Tang luot xem bai viet (view_count) | **Should** | System |
| UC-5.11 | SEO meta cho bai viet (title, description, keywords) | **Must** | Editor |
| UC-5.12 | Tao trang tinh (page builder JSON config) | **Must** | Admin |
| UC-5.13 | Page templates: default, landing, blank | **Should** | Admin |
| UC-5.14 | Trang phan cap (parent/children URL) | **Nice** | Admin |
| UC-5.15 | He thong menu dong (header, footer, sidebar) | **Should** | Admin |
| UC-5.16 | Menu phan cap (nested items) | **Should** | Admin |
| UC-5.17 | Xem bai viet theo slug (SEO URL) | **Must** | Guest |

### Data Model Summary

**Article entity** (`backend/src/modules/articles/entities/article.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `title` | VARCHAR | Tieu de bai viet |
| `slug` | VARCHAR unique | URL slug (tu dong) |
| `excerpt` | TEXT | Tom tat ngan |
| `content` | LONGTEXT | Noi dung (HTML/JSON tu Tiptap) |
| `featured_image` | VARCHAR | Anh dai dien |
| `status` | ENUM | draft / published / archived |
| `published_at` | TIMESTAMP | Ngay xuat ban |
| `author_id` | CHAR(26) FK | Tac gia |
| `category_id` | CHAR(26) FK | Danh muc |
| `tags` | JSON | Tags (JSON array) |
| `is_featured` | BOOLEAN | Noi bat |
| `view_count` | INT | Luot xem |
| `seo_title` | VARCHAR | SEO title |
| `seo_description` | TEXT | SEO description |
| `seo_keywords` | VARCHAR | SEO keywords |
| `tenant_id` | CHAR(26) | Tenant |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/articles` | Public | List bai viet (phan trang) |
| GET | `/articles/published` | Public | Bai viet da xuat ban |
| GET | `/articles/slug/:slug` | Public | Bai viet theo slug |
| GET | `/articles/tag/:tag` | Public | Bai viet theo tag |
| GET | `/articles/:id/related` | Public | Bai viet lien quan |
| POST | `/articles` | Editor | Tao bai viet |
| PATCH | `/articles/:id` | Editor | Sua bai viet |
| POST | `/articles/:id/publish` | Editor | Xuat ban |
| POST | `/articles/:id/unpublish` | Editor | Huy xuat ban |
| DELETE | `/articles/:id` | Admin | Xoa (soft delete) |
| GET | `/pages` | Public | List trang |
| POST | `/pages` | Admin | Tao trang |
| GET | `/navigations` | Public | Menu |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `ArticlesService` | `createArticle(dto, authorId)` | articles.service.ts:160 | Tao + tu dong slug |
| `ArticlesService` | `publish(id)` | articles.service.ts:43 | Xuat ban |
| `ArticlesService` | `unpublish(id)` | articles.service.ts:52 | Huy xuat ban |
| `ArticlesService` | `findPublished(options)` | articles.service.ts:63 | List published, phan trang |
| `ArticlesService` | `findByTag(tag, options)` | articles.service.ts:97 | Tim theo tag (JSON_CONTAINS) |
| `ArticlesService` | `findRelated(articleId, limit)` | articles.service.ts:128 | Bai lien quan |
| `ArticlesService` | `findBySlug(slug)` | articles.service.ts:30 | Tim theo slug |
| `ArticlesService` | `incrementViewCount(id)` | articles.service.ts:153 | Tang view +1 |

### Lien ket modules khac
- **Users**: author_id → tac gia
- **Categories**: category_id → phan loai
- **Media**: featured_image → anh dai dien
- **Search**: title, content, excerpt → full-text search
- **SEO**: seo_title, seo_description → meta tags
- **Webhooks**: article.published event

---

## 6. SEO & Tim kiem (SEO + Search)

### Mo ta chuc nang
He thong SEO tich hop (sitemap XML, robots.txt, meta tags) va tim kiem toan van tren nhieu entity. Tim kiem dung MySQL LIKE voi scoring de xep hang ket qua.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Cau hinh SEO meta, quan ly sitemap |
| **Editor** | Set SEO cho bai viet/san pham |
| **User** | Tim kiem san pham, bai viet, trang |
| **Search Engine** | Crawl sitemap, robots.txt |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-6.1 | Sitemap XML tu dong (san pham, bai viet, trang) | **Must** | System |
| UC-6.2 | Robots.txt tu dong | **Must** | System |
| UC-6.3 | Meta tags (title, description) cho moi trang | **Must** | Editor |
| UC-6.4 | Open Graph tags (Facebook, Zalo) | **Should** | Editor |
| UC-6.5 | JSON-LD structured data (Product, Article) | **Should** | System |
| UC-6.6 | Tim kiem toan van san pham | **Must** | User |
| UC-6.7 | Tim kiem bai viet | **Must** | User |
| UC-6.8 | Tim kiem trang | **Should** | User |
| UC-6.9 | Tim kiem toan cuc (tat ca loai cung luc) | **Must** | User |
| UC-6.10 | Scoring ket qua (name match > description match) | **Should** | System |
| UC-6.11 | SEO-friendly URL (slug tu dong) | **Must** | System |

### Tim kiem — Scoring System

```
Products:
  name match        → score = 3
  short_description → score = 2
  description       → score = 1

Articles:
  title match  → score = 3
  excerpt      → score = 2
  content      → score = 1

Pages:
  title match  → score = 3
  content      → score = 1
```

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/search?query=X&type=all` | Public | Tim kiem toan cuc |
| GET | `/search?query=X&type=product` | Public | Tim kiem san pham |
| GET | `/search?query=X&type=article` | Public | Tim kiem bai viet |
| GET | `/search?query=X&type=page` | Public | Tim kiem trang |
| GET | `/sitemap.xml` | Public | Sitemap XML |
| GET | `/robots.txt` | Public | Robots.txt |

### Search Result Format

```typescript
interface SearchResult {
  type: 'product' | 'article' | 'page';
  id: string;
  title: string;
  excerpt: string;
  url: string;         // /products/{slug}, /articles/{slug}, /pages/{slug}
  image: string | null;
  score: number;
}
```

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `SearchService` | `search(dto)` | search.service.ts:27 | Tim kiem toan cuc, merge, score, paginate |

### Lien ket modules khac
- **Products**: name, description → search, slug → SEO URL
- **Articles**: title, content → search, seo_* fields → meta tags
- **Pages**: title, content → search

---

## 7. Truyen thong & Ho tro (Notifications + Contacts + FAQ)

### Mo ta chuc nang
He thong thong bao da kenh (in-app real-time, email), form lien he + ticket ho tro, FAQ phan loai. Ho tro gui hang loat, doc/chua doc, tu dong doc dep cu.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Gui thong bao hang loat, quan ly tickets, CRUD FAQ |
| **Manager** | Xu ly tickets, tra loi lien he |
| **User** | Nhan thong bao, gui lien he, xem FAQ |
| **System** | Tu dong gui thong bao khi co event |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-7.1 | Gui thong bao in-app (real-time) | **Must** | System |
| UC-7.2 | Gui thong bao email (template) | **Must** | System |
| UC-7.3 | Danh dau thong bao da doc | **Must** | User |
| UC-7.4 | Danh dau tat ca da doc | **Should** | User |
| UC-7.5 | Dem so thong bao chua doc (badge) | **Must** | User |
| UC-7.6 | Gui thong bao hang loat (bulk) | **Should** | Admin |
| UC-7.7 | Tu dong xoa thong bao cu da doc | **Nice** | System |
| UC-7.8 | Form lien he website | **Must** | Guest |
| UC-7.9 | Quan ly tickets lien he | **Should** | Admin |
| UC-7.10 | FAQ phan loai, tim kiem | **Should** | User |
| UC-7.11 | FAQ voting (huu ich/khong) | **Nice** | User |

### Notification Channels

| Channel | Implementation | Trang thai |
|---|---|---|
| `in_app` | Luu DB + Socket.io emit | DB: Done, Socket: TODO |
| `email` | BullMQ queue + Resend API | TODO |
| `push` | Web Push Notification | Planned |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/notifications` | Auth | List thong bao (phan trang) |
| POST | `/notifications/:id/read` | Auth | Danh dau da doc |
| POST | `/notifications/read-all` | Auth | Doc tat ca |
| GET | `/notifications/unread-count` | Auth | So chua doc |
| POST | `/notifications/bulk` | Admin | Gui hang loat |
| POST | `/contacts` | Public | Gui form lien he |
| GET | `/contacts` | Admin | List tickets |
| PATCH | `/contacts/:id` | Admin | Cap nhat ticket status |
| GET | `/faq` | Public | List FAQ |
| POST | `/faq` | Admin | Tao FAQ |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `NotificationsService` | `send(dto)` | notifications.service.ts:25 | Gui thong bao |
| `NotificationsService` | `sendEmail(to, subject, html)` | notifications.service.ts:40 | Gui email (TODO) |
| `NotificationsService` | `markAsRead(id, userId)` | notifications.service.ts:49 | Danh dau da doc |
| `NotificationsService` | `markAllRead(userId)` | notifications.service.ts:63 | Doc tat ca |
| `NotificationsService` | `getUnreadCount(userId)` | notifications.service.ts:77 | Dem chua doc |
| `NotificationsService` | `sendBulk(userIds, dto)` | notifications.service.ts:90 | Gui hang loat |
| `NotificationsService` | `deleteOld(days)` | notifications.service.ts:109 | Xoa cu |

### Contact Status Workflow

```
  NEW → IN_PROGRESS → RESOLVED → CLOSED
```

**ContactStatus enum** (`constants/index.ts`):
- `new` — Moi nhan
- `in_progress` — Dang xu ly
- `resolved` — Da giai quyet
- `closed` — Da dong

### Lien ket modules khac
- **Users**: user_id → nguoi nhan thong bao
- **Orders**: gui thong bao khi don hang thay doi trang thai
- **Payments**: gui thong bao khi thanh toan thanh cong
- **Auth**: gui email welcome khi dang ky

---

## 8. Phan tich & Bao cao (Analytics + Logs)

### Mo ta chuc nang
He thong analytics tu xay: tracking page views va events, dashboard tong quan, bieu do doanh thu/traffic/thiet bi/nguon. He thong logging ghi audit trail va access log.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Xem dashboard, bao cao, audit log |
| **Manager** | Xem thong ke don hang, doanh thu |
| **System** | Ghi nhan pageview, event, log |
| **Guest** | Trigger pageview tracking (anonymous) |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-8.1 | Ghi nhan luot xem trang (pageview) | **Must** | System |
| UC-8.2 | Ghi nhan event (product_view, add_to_cart, purchase) | **Must** | System |
| UC-8.3 | Dashboard tong quan (pageviews, sessions, events) | **Must** | Admin |
| UC-8.4 | Bieu do pageview theo thoi gian (day/week/month) | **Must** | Admin |
| UC-8.5 | Top trang duoc xem nhieu nhat | **Should** | Admin |
| UC-8.6 | Thong ke thiet bi (desktop/mobile/tablet) | **Should** | Admin |
| UC-8.7 | Bieu do doanh thu theo thoi gian | **Must** | Admin |
| UC-8.8 | Thong ke nguon truy cap (referer) | **Should** | Admin |
| UC-8.9 | Nhat ky audit (ai lam gi, khi nao) | **Must** | Admin |
| UC-8.10 | Nhat ky truy cap API (method, URL, status, duration) | **Should** | Admin |
| UC-8.11 | Changelog (lich su nang cap he thong) | **Nice** | Admin |
| UC-8.12 | Xuat bao cao (CSV, Excel) | **Should** | Admin |
| UC-8.13 | So sanh voi ky truoc (trend %) | **Nice** | Admin |

### Dashboard Stats Response

```typescript
{
  pageviews: number;        // Tong luot xem trong khoang
  unique_sessions: number;  // Session duy nhat
  events: number;          // Tong event
}
```

### Chart Grouping

| Group By | MySQL DATE_FORMAT | Vi du |
|---|---|---|
| `day` | `%Y-%m-%d` | 2026-04-16 |
| `week` | `%Y-%u` | 2026-16 |
| `month` | `%Y-%m` | 2026-04 |

### Device Detection Logic

```typescript
// analytics.service.ts:181
detectDeviceType(userAgent):
  /tablet|ipad|playbook|silk/     → 'tablet'
  /mobile|iphone|ipod|android.*mobile|windows phone/ → 'mobile'
  default                         → 'desktop'
```

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| POST | `/analytics/pageview` | Public | Ghi pageview |
| POST | `/analytics/event` | Public | Ghi event |
| GET | `/analytics/dashboard` | Admin | Dashboard stats |
| GET | `/analytics/pageviews` | Admin | Bieu do pageviews |
| GET | `/analytics/top-pages` | Admin | Top trang |
| GET | `/analytics/devices` | Admin | Thong ke thiet bi |
| GET | `/analytics/revenue` | Admin | Bieu do doanh thu |
| GET | `/analytics/traffic-sources` | Admin | Nguon truy cap |
| GET | `/logs` | Admin | List logs |
| GET | `/logs/audit` | Admin | Audit trail |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `AnalyticsService` | `trackPageView(dto, ip, ua, userId)` | analytics.service.ts:27 | Ghi pageview |
| `AnalyticsService` | `trackEvent(dto, userId)` | analytics.service.ts:49 | Ghi event |
| `AnalyticsService` | `getDashboardStats(dateRange)` | analytics.service.ts:62 | Dashboard |
| `AnalyticsService` | `getPageViewStats(dateRange, groupBy)` | analytics.service.ts:91 | Chart |
| `AnalyticsService` | `getTopPages(dateRange, limit)` | analytics.service.ts:110 | Top pages |
| `AnalyticsService` | `getDeviceStats(dateRange)` | analytics.service.ts:129 | Device breakdown |
| `AnalyticsService` | `getRevenueChart(dateRange, groupBy)` | analytics.service.ts:144 | Revenue chart |
| `AnalyticsService` | `getTrafficSources(dateRange)` | analytics.service.ts:163 | Traffic sources |
| `OrdersService` | `getOrderStats(dateFrom, dateTo)` | orders.service.ts:206 | Order stats |

### Lien ket modules khac
- **Users**: user_id → user tracking
- **Orders**: revenue calculation, order stats
- **Products**: product_view event
- **Cart**: add_to_cart event

---

## 9. SaaS & Da khach hang (Tenants + Plans + API Keys + Webhooks)

### Mo ta chuc nang
Kien truc multi-tenant SaaS: workspace isolation theo tenant_id, goi dich vu (plans) voi quota tracking, API keys cho developer, webhook cho event notification. Ho tro billing cycles: free, monthly, yearly, lifetime.

### Actors

| Actor | Mo ta |
|---|---|
| **Super Admin** | Quan ly tat ca tenants, plans |
| **Tenant Admin** | Quan ly tenant cua minh, subscribe plan, tao webhook/API key |
| **Developer** | Su dung API key, nhan webhook |
| **System** | Enforce quotas, track usage, deliver webhooks |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-9.1 | Tao tenant moi (workspace) | **Must** | User |
| UC-9.2 | Slug tu dong tu ten (unique) | **Must** | System |
| UC-9.3 | Custom domain cho tenant | **Should** | Tenant Admin |
| UC-9.4 | Kich hoat / Vo hieu hoa tenant | **Must** | Super Admin |
| UC-9.5 | Cap nhat settings tenant (merge) | **Should** | Tenant Admin |
| UC-9.6 | Tao goi dich vu (plan) | **Must** | Super Admin |
| UC-9.7 | Dang ky goi dich vu (subscribe) | **Must** | Tenant Admin |
| UC-9.8 | Huy dang ky (cancel subscription) | **Must** | Tenant Admin |
| UC-9.9 | Gia han dang ky (renew) | **Must** | System |
| UC-9.10 | Dung thu (trial_days) | **Should** | System |
| UC-9.11 | Kiem tra quota (products, storage, users) | **Must** | System |
| UC-9.12 | Ghi nhan usage | **Must** | System |
| UC-9.13 | Feature gating theo plan | **Must** | System |
| UC-9.14 | Tao webhook (URL + events + secret) | **Must** | Tenant Admin |
| UC-9.15 | Trigger webhook khi co event | **Must** | System |
| UC-9.16 | HMAC-SHA256 signature cho webhook | **Must** | System |
| UC-9.17 | Retry webhook that bai (exponential backoff) | **Must** | System |
| UC-9.18 | Xem webhook delivery logs | **Should** | Tenant Admin |
| UC-9.19 | Tao API key (voi scopes) | **Should** | Tenant Admin |
| UC-9.20 | Rate limiting cho API key | **Nice** | System |

### Data Model Summary

**Tenant entity** (`backend/src/modules/tenants/entities/tenant.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `name` | VARCHAR | Ten tenant |
| `slug` | VARCHAR unique | Slug (tu dong, unique) |
| `domain` | VARCHAR | Custom domain (nullable) |
| `owner_id` | CHAR(26) FK | Chu so huu |
| `is_active` | BOOLEAN | Trang thai |
| `settings` | JSON | Cau hinh rieng |
| `logo` | VARCHAR | Logo URL |

**Plan entity** (`backend/src/modules/plans/entities/plan.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `name` | VARCHAR | Ten plan (vd: Basic, Pro) |
| `slug` | VARCHAR unique | Slug |
| `price` | DECIMAL | Gia thang |
| `billing_cycle` | ENUM | free / monthly / yearly / lifetime |
| `trial_days` | INT | So ngay dung thu |
| `features` | JSON | PlanFeatures object |
| `is_active` | BOOLEAN | Dang hoat dong |
| `sort_order` | INT | Thu tu hien thi |

**PlanFeatures interface**:

```typescript
interface PlanFeatures {
  max_products: number;     // So san pham toi da
  max_storage_gb: number;   // Dung luong luu tru (GB)
  max_users: number;        // So user toi da
  custom_domain: boolean;   // Cho phep custom domain
  api_access: boolean;      // Truy cap API
  webhook_access: boolean;  // Su dung webhook
  priority_support: boolean; // Ho tro uu tien
}
```

**Subscription entity** (`backend/src/modules/plans/entities/subscription.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `tenant_id` | CHAR(26) FK | Tenant |
| `plan_id` | CHAR(26) FK | Plan |
| `status` | ENUM | ACTIVE / TRIALING / CANCELLED / PAST_DUE |
| `current_period_start` | TIMESTAMP | Bat dau ky hien tai |
| `current_period_end` | TIMESTAMP | Ket thuc ky hien tai |
| `cancelled_at` | TIMESTAMP | Ngay huy |
| `cancel_reason` | TEXT | Ly do huy |

**Webhook entity** (`backend/src/modules/webhooks/entities/webhook.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `tenant_id` | CHAR(26) FK | Tenant |
| `url` | VARCHAR | URL nhan webhook |
| `events` | JSON | Danh sach events dang ky |
| `secret` | VARCHAR | HMAC secret (tu dong sinh) |
| `description` | VARCHAR | Mo ta |
| `is_active` | BOOLEAN | Trang thai |
| `last_triggered_at` | TIMESTAMP | Lan trigger cuoi |
| `failure_count` | INT | So lan that bai lien tiep |

**WebhookDelivery entity** (`backend/src/modules/webhooks/entities/webhook-delivery.entity.ts`):

| Field | Type | Mo ta |
|---|---|---|
| `id` | CHAR(26) ULID | Primary key |
| `webhook_id` | CHAR(26) FK | Webhook |
| `event` | VARCHAR | Event name |
| `payload` | JSON | Payload da gui |
| `response_status` | INT | HTTP status tu endpoint |
| `response_body` | TEXT | Response body |
| `attempt` | INT | Lan thu may |
| `success` | BOOLEAN | Thanh cong hay khong |
| `duration_ms` | INT | Thoi gian xu ly (ms) |
| `next_retry_at` | TIMESTAMP | Thoi diem retry tiep |

### Available Webhook Events

```
order.created      order.updated      order.cancelled    order.completed
payment.received   payment.refunded
product.created    product.updated    product.deleted
user.registered    user.updated
inventory.low
review.created
```

### Retry Strategy

| Attempt | Delay | Cong thuc |
|---|---|---|
| 1 | 5 phut | 5^1 * 60s |
| 2 | 25 phut | 5^2 * 60s |
| 3 | 125 phut | 5^3 * 60s |
| Max | - | Dung retry |

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| POST | `/tenants` | Auth | Tao tenant |
| GET | `/tenants/:id` | Auth | Chi tiet tenant |
| PATCH | `/tenants/:id` | Tenant Admin | Cap nhat |
| PATCH | `/tenants/:id/settings` | Tenant Admin | Cap nhat settings |
| POST | `/tenants/:id/activate` | Super Admin | Kich hoat |
| POST | `/tenants/:id/deactivate` | Super Admin | Vo hieu |
| GET | `/plans` | Public | List plans |
| GET | `/plans/active` | Public | Plans dang active |
| POST | `/plans/subscribe` | Tenant Admin | Dang ky plan |
| POST | `/plans/cancel` | Tenant Admin | Huy plan |
| GET | `/plans/usage/:metric` | Tenant Admin | Kiem tra usage |
| POST | `/webhooks` | Tenant Admin | Tao webhook |
| GET | `/webhooks` | Tenant Admin | List webhooks |
| PATCH | `/webhooks/:id` | Tenant Admin | Cap nhat webhook |
| DELETE | `/webhooks/:id` | Tenant Admin | Xoa webhook |
| GET | `/webhooks/:id/deliveries` | Tenant Admin | Delivery logs |
| POST | `/webhooks/deliveries/:id/retry` | Tenant Admin | Retry delivery |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `TenantsService` | `create(data)` | tenants.service.ts:25 | Tao + auto slug |
| `TenantsService` | `findBySlug(slug)` | tenants.service.ts:35 | Tim theo slug |
| `TenantsService` | `findByDomain(domain)` | tenants.service.ts:42 | Tim theo domain |
| `TenantsService` | `updateSettings(id, settings)` | tenants.service.ts:73 | Merge settings |
| `PlansService` | `subscribe(tenantId, planId)` | plans.service.ts:41 | Dang ky plan |
| `PlansService` | `cancel(subscriptionId, reason)` | plans.service.ts:91 | Huy |
| `PlansService` | `renew(subscriptionId)` | plans.service.ts:108 | Gia han |
| `PlansService` | `checkUsage(tenantId, metric)` | plans.service.ts:152 | Kiem tra quota |
| `PlansService` | `recordUsage(tenantId, metric, value)` | plans.service.ts:192 | Ghi usage |
| `PlansService` | `isFeatureAllowed(tenantId, feature)` | plans.service.ts:213 | Feature gating |
| `WebhooksService` | `createWebhook(tenantId, dto)` | webhooks.service.ts:53 | Tao webhook |
| `WebhooksService` | `trigger(event, payload, tenantId)` | webhooks.service.ts:70 | Trigger event |
| `WebhooksService` | `generateSignature(payload, secret)` | webhooks.service.ts:234 | HMAC-SHA256 |
| `WebhooksService` | `retry(deliveryId)` | webhooks.service.ts:176 | Retry delivery |

### Lien ket modules khac
- **Users**: owner_id → chu tenant, tenant_id → data isolation
- **Orders**: trigger order.* events
- **Payments**: trigger payment.* events
- **Products**: trigger product.* events, quota max_products
- **Inventory**: trigger inventory.low event
- **Media**: quota max_storage_gb

---

## 10. Da ngon ngu & Xuat nhap (i18n + Export/Import)

### Mo ta chuc nang
He thong da ngon ngu cho phep dich noi dung sang nhieu ngon ngu. Import/export du lieu hang loat bang CSV va XLSX cho cac entity chinh.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Quan ly translations, import/export data |
| **Editor** | Dich noi dung |
| **User** | Chon ngon ngu hien thi |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-10.1 | He thong da ngon ngu (vi, en, ja, ...) | **Should** | System |
| UC-10.2 | Import translations tu JSON | **Should** | Admin |
| UC-10.3 | Export translations ra JSON | **Should** | Admin |
| UC-10.4 | Export san pham ra CSV/XLSX | **Must** | Admin |
| UC-10.5 | Import san pham tu CSV/XLSX | **Must** | Admin |
| UC-10.6 | Export don hang ra CSV/XLSX | **Should** | Admin |
| UC-10.7 | Export users ra CSV | **Should** | Admin |
| UC-10.8 | Validate tung dong khi import | **Must** | System |
| UC-10.9 | Bao cao ket qua import (success/errors) | **Must** | System |

### Import/Export Supported Entities

| Entity | Export | Import | Formats |
|---|---|---|---|
| Products | Yes | Yes | CSV, XLSX |
| Orders | Yes | No (read-only) | CSV, XLSX |
| Users | Yes | Yes | CSV |
| Articles | Yes | Yes | CSV, XLSX |
| Translations | Yes | Yes | JSON |

### Import Result Format

```typescript
{
  success: number;       // So dong thanh cong
  errors: Array<{
    row: number;         // Dong loi
    message: string;     // Mo ta loi
  }>;
}
```

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| POST | `/export` | Admin | Export data |
| POST | `/import` | Admin | Import data (multipart) |
| GET | `/i18n/:lang` | Public | Lay translations |
| POST | `/i18n/:lang` | Admin | Cap nhat translations |

### Lien ket modules khac
- **Products**: export/import san pham
- **Orders**: export don hang
- **Users**: export users
- **Articles**: export bai viet

---

## 11. Media & Luu tru (Media)

### Mo ta chuc nang
Upload va quan ly file media: hinh anh, document, video. Ho tro xu ly anh (resize, thumbnail), CDN voi presigned URLs, quan ly theo folder, theo doi dung luong.

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Upload, quan ly folder, xoa file |
| **Editor** | Upload anh cho bai viet/san pham |
| **User** | Upload avatar |
| **System** | Tao thumbnail, tinh dung luong |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-11.1 | Upload file (drag & drop, multipart) | **Must** | Editor |
| UC-11.2 | Xu ly anh tu dong (resize, thumbnail 300x300) | **Must** | System |
| UC-11.3 | Luu tru tren S3/Cloudflare R2 | **Must** | System |
| UC-11.4 | CDN presigned URLs (1h expiry) | **Should** | System |
| UC-11.5 | Quan ly theo folder | **Should** | Admin |
| UC-11.6 | Tim kiem media (filename, alt text) | **Should** | Editor |
| UC-11.7 | Xoa file (storage + DB) | **Must** | Admin |
| UC-11.8 | Theo doi dung luong per user | **Must** | System |
| UC-11.9 | List cac folder duy nhat | **Should** | Admin |
| UC-11.10 | Loc theo folder, mime_type | **Should** | Admin |
| UC-11.11 | Alt text cho hinh anh (SEO) | **Should** | Editor |

### Storage Key Format

```
{folder}/{timestamp_base36}-{random_hex_12}{extension}

Vi du:
  products/lz5k8f-a1b2c3d4e5f6.jpg
  blog/lz5kab-f8e7d6c5b4a3.png
  /lz5kcd-1a2b3c4d5e6f.pdf
```

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| POST | `/media/upload` | Auth | Upload file |
| GET | `/media` | Auth | List media (phan trang) |
| GET | `/media/:id` | Auth | Chi tiet media |
| GET | `/media/:id/url` | Auth | Presigned URL |
| DELETE | `/media/:id` | Admin | Xoa file |
| GET | `/media/folders` | Auth | List folders |
| GET | `/media/storage-used` | Auth | Dung luong da dung |

### Key Functions

| Service | Method | File | Mo ta |
|---|---|---|---|
| `MediaService` | `upload(file, userId, dto)` | media.service.ts:49 | Upload + luu metadata |
| `MediaService` | `uploadThumbnail(file)` | media.service.ts:81 | Tao thumbnail (300x300) |
| `MediaService` | `getPresignedUrl(key)` | media.service.ts:100 | Signed URL (1h) |
| `MediaService` | `deleteMedia(id)` | media.service.ts:109 | Xoa storage + DB |
| `MediaService` | `getByFolder(folder)` | media.service.ts:122 | Media theo folder |
| `MediaService` | `getTotalStorageUsed(userId)` | media.service.ts:132 | Tong dung luong |
| `MediaService` | `getFolders()` | media.service.ts:145 | List folders |

### Searchable Fields
- `filename` — ten file da luu
- `original_name` — ten file goc
- `alt_text` — mo ta alt (SEO)

### Lien ket modules khac
- **Products**: images → hinh anh san pham
- **Articles**: featured_image → anh dai dien
- **Users**: avatar → anh dai dien user
- **Plans**: quota max_storage_gb → gioi han dung luong

---

## 12. Email Templates

### Mo ta chuc nang
He thong email templates su dung Handlebars template engine. Templates duoc seed san voi cac loai thong bao pho bien. Ho tro preview truoc khi gui. Gui qua Resend API (chua implement).

### Actors

| Actor | Mo ta |
|---|---|
| **Admin** | Quan ly templates, preview, test gui |
| **System** | Tu dong gui email theo event |

### Use Cases

| # | Use Case | Do uu tien | Actor |
|---|---|---|---|
| UC-12.1 | Template: Welcome (dang ky thanh cong) | **Must** | System |
| UC-12.2 | Template: Order confirmation | **Must** | System |
| UC-12.3 | Template: Shipping notification | **Must** | System |
| UC-12.4 | Template: Password reset | **Must** | System |
| UC-12.5 | Template: Review request (sau khi nhan hang) | **Should** | System |
| UC-12.6 | Template: Payment confirmation | **Should** | System |
| UC-12.7 | Template: Order cancellation | **Should** | System |
| UC-12.8 | Handlebars template engine (variables) | **Must** | System |
| UC-12.9 | Preview template truoc khi gui | **Should** | Admin |
| UC-12.10 | Seed default templates | **Must** | System |
| UC-12.11 | CRUD email templates | **Should** | Admin |

### Template Variables

| Template | Variables | Mo ta |
|---|---|---|
| **Welcome** | `{{name}}`, `{{email}}`, `{{loginUrl}}` | Chao mung user moi |
| **Order Confirmation** | `{{orderNumber}}`, `{{items}}`, `{{total}}`, `{{shippingAddress}}` | Xac nhan don hang |
| **Shipping** | `{{orderNumber}}`, `{{trackingNumber}}`, `{{carrier}}`, `{{estimatedDelivery}}` | Thong bao giao hang |
| **Password Reset** | `{{name}}`, `{{resetUrl}}`, `{{expiresIn}}` | Link reset mat khau |
| **Review Request** | `{{name}}`, `{{orderNumber}}`, `{{products}}`, `{{reviewUrl}}` | Yeu cau danh gia |
| **Payment Confirmation** | `{{orderNumber}}`, `{{amount}}`, `{{method}}`, `{{transactionId}}` | Xac nhan thanh toan |
| **Cancellation** | `{{orderNumber}}`, `{{reason}}`, `{{refundAmount}}` | Huy don hang |

### Email Tech Stack

```
Trigger (event/manual)
    |
    v
BullMQ Job Queue (Redis)
    |
    v
Email Worker
    |
    v
Load template from DB
    |
    v
Handlebars.compile(template)
    |
    v
Render HTML with variables
    |
    v
Resend API → Deliver email
```

### API Endpoints

| Method | Path | Auth | Mo ta |
|---|---|---|---|
| GET | `/email-templates` | Admin | List templates |
| GET | `/email-templates/:id` | Admin | Chi tiet template |
| POST | `/email-templates` | Admin | Tao template |
| PATCH | `/email-templates/:id` | Admin | Sua template |
| POST | `/email-templates/:id/preview` | Admin | Preview voi data mau |
| POST | `/email-templates/:id/test-send` | Admin | Gui email test |

### Lien ket modules khac
- **Auth**: template welcome, password_reset
- **Orders**: template order_confirmation, shipping, cancellation
- **Payments**: template payment_confirmation
- **Notifications**: email channel su dung templates
- **Reviews**: template review_request

---

## Tong ket — Module Map

```
+------------------+     +------------------+     +------------------+
|   Auth / Users   |---->|     Tenants       |---->|      Plans       |
| (JWT, RBAC, 2FA) |     | (multi-tenant)   |     | (subscription)   |
+--------+---------+     +--------+---------+     +--------+---------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
|    Products      |---->|    Inventory      |     |     Webhooks     |
| (catalog, SEO)   |     | (stock, reserve)  |     | (HMAC, retry)    |
+--------+---------+     +--------+---------+     +------------------+
         |                        |
         v                        v
+------------------+     +------------------+     +------------------+
|      Cart        |---->|     Orders       |---->|    Payments      |
| (guest, merge)   |     | (lifecycle)      |     | (VNPay,MoMo,COD) |
+------------------+     +--------+---------+     +------------------+
                                  |
         +------------------------+------------------------+
         |                        |                        |
         v                        v                        v
+------------------+     +------------------+     +------------------+
|   Promotions     |     | Notifications    |     |    Analytics     |
| (coupon, usage)  |     | (in-app, email)  |     | (pageview, event)|
+------------------+     +------------------+     +------------------+

+------------------+     +------------------+     +------------------+
|    Articles      |     |     Search       |     |      Media       |
| (CMS, publish)   |     | (global, score)  |     | (S3/R2, thumb)   |
+------------------+     +------------------+     +------------------+
```

### Do uu tien tong the

| Uu tien | Modules |
|---|---|
| **Must** (Core) | Auth, Users, Products, Cart, Orders, Payments, Inventory |
| **Should** (Important) | Articles, Promotions, Notifications, Analytics, Search, Media, Plans |
| **Nice** (Enhancement) | FAQ, Changelog, i18n, Export/Import, Reviews, Webhooks advanced |
