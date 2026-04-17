# WebTemplate — Chi Tiet Cac Luong Xu Ly

> Tai lieu mo ta chi tiet cac luong xu ly chinh trong he thong WebTemplate.
> Moi luong gom: mo ta, diagram ASCII, cac buoc chi tiet, error cases, code reference.

---

## Muc luc

1. [Authentication Flow](#1-authentication-flow)
2. [Request Authorization Flow](#2-request-authorization-flow)
3. [Order Flow (E-commerce)](#3-order-flow-e-commerce)
4. [Media Upload Flow](#4-media-upload-flow)
5. [CMS Content Flow](#5-cms-content-flow)
6. [Real-time Notification Flow](#6-real-time-notification-flow)
7. [Analytics & Tracking Flow](#7-analytics--tracking-flow)
8. [Multi-tenant Flow](#8-multi-tenant-flow)
9. [Webhook Delivery Flow](#9-webhook-delivery-flow)
10. [Search Flow](#10-search-flow)
11. [Export/Import Flow](#11-exportimport-flow)

---

## 1. Authentication Flow

### Mo ta
He thong xac thuc dua tren JWT voi co che token rotation. Access token (15 phut) dung de xac thuc API request, refresh token (7 ngay) luu trong httpOnly cookie va hash SHA256 truoc khi luu vao DB. Ho tro phat hien token reuse (token theft detection).

### Diagram — Login

```
 Client                    AuthController              AuthService              DB (refresh_tokens)
   |                            |                          |                          |
   |  POST /auth/login          |                          |                          |
   |  { email, password }       |                          |                          |
   |--------------------------->|                          |                          |
   |                            |  login(dto, ip, ua)      |                          |
   |                            |------------------------->|                          |
   |                            |                          |  validateUser(email, pwd) |
   |                            |                          |  findByEmail()            |
   |                            |                          |------------------------->|
   |                            |                          |  <-- user record          |
   |                            |                          |                          |
   |                            |                          |  comparePassword(bcrypt)  |
   |                            |                          |  (pass? -> continue)      |
   |                            |                          |                          |
   |                            |                          |  update last_login_at     |
   |                            |                          |  generateTokens(user)     |
   |                            |                          |    -> JWT access (15m)    |
   |                            |                          |    -> JWT refresh (7d)    |
   |                            |                          |    -> SHA256(refresh)     |
   |                            |                          |    -> save token_hash     |
   |                            |                          |------------------------->|
   |                            |                          |                          |
   |                            |  setRefreshCookie(res)   |                          |
   |  <-- { accessToken }       |                          |                          |
   |  <-- Set-Cookie: refresh   |                          |                          |
```

### Cac buoc chi tiet — Login

1. **Client gui POST /auth/login** voi body `{ email, password }`
2. **AuthController.login()** (`auth.controller.ts:44`) lay IP va User-Agent tu request
3. **AuthService.validateUser()** (`auth.service.ts:82`):
   - Tim user theo email: `usersService.findByEmail(email)`
   - Kiem tra `user.is_active` — tai khoan bi vo hieu hoa se bi tu choi
   - So sanh password bang `comparePassword()` (bcrypt)
4. **Cap nhat last_login_at** (`auth.service.ts:74`)
5. **AuthService.generateTokens()** (`auth.service.ts:228`):
   - Tao JWT payload: `{ sub: user.id, email, role, tenantId }`
   - Sign access token voi `jwt.accessSecret`, expiry `jwt.accessExpires` (default 15m)
   - Sign refresh token voi `jwt.refreshSecret`, expiry `jwt.refreshExpires` (default 7d)
   - Hash refresh token: `sha256(refreshToken)` (`auth.service.ts:271`)
   - Luu vao bang `refresh_tokens`: `{ user_id, token_hash, ip_address, user_agent, expires_at }`
6. **AuthController.setRefreshCookie()** (`auth.controller.ts:136`):
   - Set cookie `refreshToken` voi: `httpOnly: true`, `secure` (production), `sameSite: 'lax'`, `maxAge: 7 ngay`
7. **Tra ve** `{ accessToken }` trong response body

### Diagram — Token Refresh (Rotation)

```
 Client                    AuthController              AuthService              DB
   |                            |                          |                      |
   |  POST /auth/refresh        |                          |                      |
   |  Cookie: refreshToken      |                          |                      |
   |--------------------------->|                          |                      |
   |                            |  refreshToken(token)     |                      |
   |                            |------------------------->|                      |
   |                            |                          |  verify JWT           |
   |                            |                          |  SHA256(token)        |
   |                            |                          |  find by token_hash   |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |                            |                          |  [NOT FOUND?]        |
   |                            |                          |  --> TOKEN REUSE!    |
   |                            |                          |  --> revoke ALL user |
   |                            |                          |      tokens          |
   |                            |                          |  --> throw 401       |
   |                            |                          |                      |
   |                            |                          |  [FOUND + valid]     |
   |                            |                          |  revoke old token    |
   |                            |                          |  (is_revoked = true) |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |                            |                          |  generateTokens()    |
   |                            |                          |  (new pair)          |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |  <-- { accessToken }       |                          |                      |
   |  <-- Set-Cookie: new       |                          |                      |
```

### Cac buoc chi tiet — Token Refresh

1. **Client gui POST /auth/refresh** — token lay tu cookie (uu tien) hoac body (`auth.controller.ts:69`)
2. **AuthService.refreshToken()** (`auth.service.ts:103`):
   - Verify JWT voi `jwt.refreshSecret`
   - Hash token: `SHA256(token)` → tim trong DB theo `token_hash` va `is_revoked = false`
3. **Token Reuse Detection** (`auth.service.ts:126`):
   - Neu khong tim thay (token da bi revoke) → **CANH BAO**: token bi danh cap
   - Revoke TAT CA token cua user: `revokeAllUserTokens(userId)` (`auth.service.ts:278`)
   - Throw `UnauthorizedException('Refresh token reuse detected')`
4. **Kiem tra expiry**: `storedToken.expires_at < new Date()` → throw 401
5. **Revoke token cu**: `is_revoked = true`, save
6. **Tao cap token moi**: `generateTokens()` — luu token moi vao DB
7. **Set cookie moi** + tra ve `{ accessToken }`

### Diagram — Register

```
 Client                    AuthController              AuthService
   |                            |                          |
   |  POST /auth/register       |                          |
   |  { email, password, name } |                          |
   |--------------------------->|                          |
   |                            |  register(dto)           |
   |                            |------------------------->|
   |                            |                          |  findByEmail(email)
   |                            |                          |  [exists?] -> 400
   |                            |                          |
   |                            |                          |  createUser(dto)
   |                            |                          |  (hash password bcrypt)
   |                            |                          |
   |                            |                          |  generateTokens(user)
   |                            |                          |
   |  <-- { accessToken }       |                          |
   |  <-- Set-Cookie: refresh   |                          |
```

### Cac buoc chi tiet — Register

1. **Client gui POST /auth/register** voi body `{ email, password, name }`
2. **AuthService.register()** (`auth.service.ts:47`):
   - Kiem tra email trung: `usersService.findByEmail(email)` → throw `BadRequestException('Email already registered')`
   - Tao user: `usersService.createUser()` (hash password bang bcrypt ben trong)
   - Tao token pair: `generateTokens(user)`
3. **AuthController** set cookie va tra ve `{ accessToken }`

### Diagram — Logout

```
 Client                    AuthController              AuthService              DB
   |                            |                          |                      |
   |  POST /auth/logout         |                          |                      |
   |  Cookie: refreshToken      |                          |                      |
   |--------------------------->|                          |                      |
   |                            |  logout(token)           |                      |
   |                            |------------------------->|                      |
   |                            |                          |  SHA256(token)        |
   |                            |                          |  find by token_hash   |
   |                            |                          |  set is_revoked=true  |
   |                            |                          |--------------------->|
   |                            |  clearCookie('refresh')  |                      |
   |  <-- { message: 'ok' }     |                          |                      |
```

### Cac buoc chi tiet — Logout

1. **AuthController.logout()** (`auth.controller.ts:84`): doc token tu cookie
2. **AuthService.logout()** (`auth.service.ts:146`): hash token, tim trong DB, set `is_revoked = true`
3. **Clear cookie**: `res.clearCookie('refreshToken')`

### Diagram — Change Password

```
 Client                    AuthController              AuthService              DB
   |                            |                          |                      |
   |  POST /auth/change-pwd     |                          |                      |
   |  { currentPassword,        |                          |                      |
   |    newPassword }           |                          |                      |
   |--------------------------->|                          |                      |
   |                            |  changePassword()        |                      |
   |                            |------------------------->|                      |
   |                            |                          |  verify current pwd  |
   |                            |                          |  hash new password   |
   |                            |                          |  update user         |
   |                            |                          |  revokeAllTokens()   |
   |                            |                          |--------------------->|
   |  <-- { message: 'ok' }     |                          |                      |
```

### Cac buoc chi tiet — Change Password

1. **AuthService.changePassword()** (`auth.service.ts:161`):
   - Lay user, so sanh `currentPassword` voi `password_hash` (bcrypt)
   - Sai → throw `BadRequestException('Current password is incorrect')`
   - Hash mat khau moi: `hashPassword(newPassword)` → update user
   - **Revoke tat ca refresh token** → buoc dang nhap lai tren moi thiet bi

### Diagram — Forgot / Reset Password

```
 Client                    AuthController              AuthService
   |                            |                          |
   |  POST /auth/forgot-pwd     |                          |
   |  { email }                 |                          |
   |--------------------------->|                          |
   |                            |  forgotPassword(dto)     |
   |                            |------------------------->|
   |                            |                          |  findByEmail(email)
   |                            |                          |  [not found? -> return silently]
   |                            |                          |
   |                            |                          |  JWT sign { sub, type:'reset' }
   |                            |                          |  expiresIn: '1h'
   |                            |                          |
   |                            |                          |  TODO: send email with token
   |  <-- { message: 'If...' }  |                          |
   |                            |                          |
   |  POST /auth/reset-pwd      |                          |
   |  { token, newPassword }    |                          |
   |--------------------------->|                          |
   |                            |  resetPassword(dto)      |
   |                            |------------------------->|
   |                            |                          |  verify JWT (accessSecret)
   |                            |                          |  check payload.type == 'reset'
   |                            |                          |  hash new password
   |                            |                          |  update user
   |                            |                          |  revokeAllUserTokens()
   |  <-- { message: 'ok' }     |                          |
```

### Error Cases

| Tinh huong | Response | Code |
|---|---|---|
| Email khong ton tai (login) | `Invalid email or password` | 401 |
| Sai mat khau (login) | `Invalid email or password` | 401 |
| Tai khoan bi vo hieu hoa | `Account is disabled` | 401 |
| Email da dang ky (register) | `Email already registered` | 400 |
| Refresh token het han | `Refresh token expired` | 401 |
| Refresh token khong hop le | `Invalid refresh token` | 401 |
| Token reuse detected | `Refresh token reuse detected` — revoke ALL | 401 |
| Sai mat khau cu (change pwd) | `Current password is incorrect` | 400 |
| Reset token het han/sai | `Invalid or expired reset token` | 400 |
| Reset token sai type | `Invalid token type` | 400 |

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/auth/auth.service.ts` | Logic xac thuc, token generation, revocation |
| `backend/src/modules/auth/auth.controller.ts` | HTTP endpoints, cookie management |
| `backend/src/modules/auth/entities/refresh-token.entity.ts` | Entity refresh_tokens (ULID, SHA256 hash) |
| `backend/src/modules/auth/dto/login.dto.ts` | Validation DTO cho login |
| `backend/src/modules/auth/dto/register.dto.ts` | Validation DTO cho register |
| `backend/src/common/utils/hash.ts` | `comparePassword()`, `hashPassword()`, `sha256()` |
| `backend/src/common/decorators/public.decorator.ts` | `@Public()` — skip JWT guard |

---

## 2. Request Authorization Flow

### Mo ta
Moi request (tru public routes) phai qua 3 lop bao ve: JwtAuthGuard (xac thuc token), RolesGuard (phan quyen), TenantGuard (data isolation). Metadata duoc khai bao qua decorators `@Public()`, `@Roles()`.

### Diagram

```
 Request vao
    |
    v
 +-------------------+
 | JwtAuthGuard      |
 |                   |
 | @Public()?        |---> [Yes] --> Skip auth --> Controller
 |   - Check meta    |
 | [No]              |
 |   - Extract       |
 |     Bearer token  |
 |   - Verify JWT    |
 |     (accessSecret)|
 |   - Decode payload|
 |     { sub, email, |
 |       role,       |
 |       tenantId }  |
 |   - Attach to     |
 |     request.user  |
 +--------+----------+
          |
          v
 +-------------------+
 | RolesGuard        |
 |                   |
 | @Roles()?         |---> [No roles required] --> Skip --> Next
 |   - Check meta    |
 | [Yes]             |
 |   - Compare       |
 |     user.role     |
 |     with required |
 |   - Match? OK     |
 |   - No match?     |
 |     --> 403       |
 +--------+----------+
          |
          v
 +-------------------+
 | TenantGuard       |
 |                   |
 | - Extract tenant  |
 |   from user JWT   |
 |   or X-Tenant-Id  |
 |   header          |
 | - Validate tenant |
 |   exists + active |
 | - Attach          |
 |   tenant_id to    |
 |   request         |
 +--------+----------+
          |
          v
 +-------------------+
 | Controller Method |
 | (business logic)  |
 +-------------------+
```

### Cac buoc chi tiet

1. **JwtAuthGuard** (global guard, dang ky trong `app.module.ts`):
   - Kiem tra metadata `@Public()` → neu co thi skip authentication
   - Extract token tu header: `Authorization: Bearer <token>`
   - Verify JWT bang `jwt.accessSecret`
   - Decode payload → `{ sub (userId), email, role, tenantId }`
   - Gan vao `request.user` dung interface `ICurrentUser`

2. **RolesGuard**:
   - Kiem tra metadata `@Roles('admin', 'manager')` tren handler/class
   - Neu khong co `@Roles()` → cho qua (all authenticated users)
   - So sanh `request.user.role` voi danh sach roles yeu cau
   - Khong match → throw `ForbiddenException` (403)

3. **TenantGuard**:
   - Lay `tenant_id` tu JWT payload (`user.tenantId`) hoac header `X-Tenant-Id`
   - Validate tenant ton tai va `is_active = true`
   - Gan `tenant_id` vao request de cac service filter data

### Phan cap quyen (UserRole enum)

```
constants/index.ts:

  ADMIN    = 'admin'      ← Full access, quan ly he thong
  MANAGER  = 'manager'    ← Quan ly noi dung, don hang
  EDITOR   = 'editor'     ← Chinh sua noi dung (articles, pages)
  USER     = 'user'       ← Nguoi dung cuoi, mua hang
```

### Error Cases

| Tinh huong | Response | HTTP Code |
|---|---|---|
| Khong co token | `Unauthorized` | 401 |
| Token het han | `Unauthorized` | 401 |
| Token bi thay doi | `Unauthorized` | 401 |
| Role khong du quyen | `Forbidden` | 403 |
| Tenant khong ton tai | `Forbidden / Not Found` | 403 |
| Tenant bi vo hieu hoa | `Forbidden` | 403 |

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/common/constants/index.ts` | `UserRole` enum (admin, manager, editor, user) |
| `backend/src/common/decorators/public.decorator.ts` | `@Public()` decorator |
| `backend/src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |
| `backend/src/common/interfaces/index.ts` | `ICurrentUser` interface |

---

## 3. Order Flow (E-commerce)

### Mo ta
Luong mua hang tu them vao gio → ap dung khuyen mai → checkout → thanh toan → quan ly trang thai don hang. He thong ho tro ca guest cart (session-based) va user cart voi co che merge khi dang nhap.

### 3.1. Add to Cart

```
 Client                    CartController             CartService              DB
   |                            |                          |                     |
   |  POST /cart/items           |                          |                     |
   |  { product_id,             |                          |                     |
   |    variant_id, quantity }  |                          |                     |
   |--------------------------->|                          |                     |
   |                            |  getOrCreateCart(userId,  |                     |
   |                            |    sessionId)            |                     |
   |                            |------------------------->|                     |
   |                            |                          |  Find active cart   |
   |                            |                          |  (by user or session)|
   |                            |                          |  [Not found? Create]|
   |                            |                          |                     |
   |                            |  addItem(cartId, dto)    |                     |
   |                            |------------------------->|                     |
   |                            |                          |  Check existing item|
   |                            |                          |  [Exists?]          |
   |                            |                          |    -> quantity += n  |
   |                            |                          |  [New?]             |
   |                            |                          |    -> create item   |
   |                            |                          |------------------->|
   |  <-- CartItem              |                          |                     |
```

#### Cac buoc chi tiet

1. **CartService.getOrCreateCart()** (`cart.service.ts:26`):
   - Uu tien tim theo `userId` (authenticated user)
   - Fallback tim theo `sessionId` (guest)
   - Khong co → tao cart moi voi status `ACTIVE`
2. **CartService.addItem()** (`cart.service.ts:58`):
   - Kiem tra san pham da co trong gio (cung `product_id` + `variant_id`)
   - Da co → tang `quantity` them `dto.quantity`
   - Chua co → tao `CartItem` moi
3. **Cart statuses**: `ACTIVE` | `CONVERTED` | `ABANDONED` | `MERGED`

#### Guest Cart Merge (khi dang nhap)

```
 Login thanh cong
    |
    v
 CartService.mergeGuestCart(sessionId, userId)
    |
    |  1. Tim guest cart (by sessionId, status=ACTIVE)
    |  2. Tim/tao user cart
    |  3. Lap qua tung guest item:
    |     - Da co trong user cart? -> cong quantity
    |     - Chua co? -> copy sang user cart
    |  4. Danh dau guest cart: status = MERGED
    |
    v
 User cart da gop
```

**Code ref**: `CartService.mergeGuestCart()` (`cart.service.ts:145`)

#### Abandoned Cart Detection

- Cron job goi `CartService.markAbandoned()` (`cart.service.ts:203`)
- Cart `ACTIVE` ma `updated_at` > 7 ngay → chuyen thanh `ABANDONED`

### 3.2. Apply Promotion

```
 Client                   PromotionsService                    DB
   |                            |                               |
   |  POST /promotions/validate |                               |
   |  { code, orderAmount }     |                               |
   |--------------------------->|                               |
   |                            |  validate(code, userId, amt)  |
   |                            |------------------------------>|
   |                            |                               |
   |                            |  1. Find promotion by code    |
   |                            |  2. Check is_active           |
   |                            |  3. Check date range          |
   |                            |     (start_date <= now <= end)|
   |                            |  4. Check usage_limit total   |
   |                            |     (used_count < usage_limit)|
   |                            |  5. Check per_user_limit      |
   |                            |     (count usage by user)     |
   |                            |  6. Check min_order_amount    |
   |                            |                               |
   |  <-- { valid, discount,    |                               |
   |        message }           |                               |
```

#### Cac buoc chi tiet

1. **PromotionsService.validate()** (`promotions.service.ts:29`):
   - Tim promotion theo `code`
   - Kiem tra `is_active`, `start_date`, `end_date`
   - Kiem tra gioi han tong: `used_count >= usage_limit`
   - Kiem tra gioi han per user: count `promotion_usages` table
   - Kiem tra don toi thieu: `orderAmount >= min_order_amount`

2. **PromotionsService.apply()** (`promotions.service.ts:78`):
   - Goi `validate()` truoc
   - Tinh so tien giam theo loai:
     - `percentage`: `orderAmount * value / 100`
     - `fixed`: `value` (so tien co dinh)
     - `free_shipping`: `0` (xu ly rieng)
   - Ap dung `max_discount_amount` (gioi han tran)
   - Ghi `PromotionUsage` record
   - Tang `used_count` cua promotion

### 3.3. Checkout — Create Order

```
 Client                   OrdersService              InventoryService         DB
   |                            |                          |                    |
   |  POST /orders              |                          |                    |
   |  { shipping_address,       |                          |                    |
   |    payment_method,         |                          |                    |
   |    promotion_code }        |                          |                    |
   |--------------------------->|                          |                    |
   |                            |  createFromCart()        |                    |
   |                            |  or createDirect()       |                    |
   |                            |                          |                    |
   |                            |  1. Validate cart items  |                    |
   |                            |     (cart empty? -> 400) |                    |
   |                            |                          |                    |
   |                            |  2. Calculate subtotal   |                    |
   |                            |     sum(price * qty)     |                    |
   |                            |                          |                    |
   |                            |  3. Generate order_number|                    |
   |                            |     ORD-YYYYMMDD-XXXX   |                    |
   |                            |                          |                    |
   |                            |  4. Create order record  |                    |
   |                            |     status = PENDING     |                    |
   |                            |-------------------------------------------->|
   |                            |                          |                    |
   |                            |  5. Create order_items   |                    |
   |                            |     (price snapshot)     |                    |
   |                            |-------------------------------------------->|
   |                            |                          |                    |
   |  <-- Order { id, number,   |                          |                    |
   |        status, total }     |                          |                    |
```

#### Cac buoc chi tiet

1. **OrdersService.createFromCart()** (`orders.service.ts:36`):
   - Nhan `cartItems` array da validate — kiem tra khong rong
   - Tinh `subtotal = sum(item.price * item.quantity)`
   - Tao `order_number` tu dong: `ORD-YYYYMMDD-XXXX` (`generateOrderNumber()`, line 165)
   - Tao order voi `status = OrderStatus.PENDING`
   - Tao `OrderItem` records voi **price snapshot** (gia tai thoi diem dat hang)
   - Fields luu: `product_name`, `variant_name`, `sku`, `price`, `quantity`, `total`, `image_url`

2. **OrdersService.createDirect()** (`orders.service.ts:94`):
   - Tuong tu `createFromCart` nhung nhan items tu DTO thay vi cart

#### Order Number Format

```
ORD-20260416-0001    ← Don dau tien trong ngay
ORD-20260416-0002    ← Don thu 2 trong ngay
...
```

Logic: count orders co prefix `ORD-{dateStr}-` roi +1, pad 4 ky tu (`orders.service.ts:165`)

### 3.4. Payment Processing

```
 Client              PaymentsService           Payment Gateway         DB
   |                       |                          |                  |
   |  POST /payments       |                          |                  |
   |  { order_id, method } |                          |                  |
   |---------------------->|                          |                  |
   |                       |  createPayment()         |                  |
   |                       |  (check duplicate)       |                  |
   |                       |--------------------------|---------------->|
   |                       |                          |                  |
   |                       |  createPaymentUrl()      |                  |
   |  <-- { payment_url }  |  (VNPay/MoMo/Stripe)    |                  |
   |                       |                          |                  |
   |  --- User pays on gateway ---                    |                  |
   |                       |                          |                  |
   |                       |  POST /payments/callback |                  |
   |                       |  /:gateway               |                  |
   |                       |<-------------------------|                  |
   |                       |                          |                  |
   |                       |  processCallback()       |                  |
   |                       |  1. Find payment by ref  |                  |
   |                       |  2. verifyCallback()     |                  |
   |                       |     VNPay: ResponseCode  |                  |
   |                       |       == '00'            |                  |
   |                       |     MoMo: resultCode     |                  |
   |                       |       == '0'             |                  |
   |                       |     Stripe: status       |                  |
   |                       |       == 'succeeded'     |                  |
   |                       |  3. Update status        |                  |
   |                       |     PAID or FAILED       |                  |
   |                       |  4. Save gateway_response|                  |
   |                       |  5. Save transaction_id  |                  |
   |                       |  6. Set paid_at          |                  |
   |                       |--------------------------|---------------->|
```

#### Cac buoc chi tiet

1. **PaymentsService.createPayment()** (`payments.service.ts:28`):
   - Kiem tra da co payment cho order chua → `BadRequestException` neu da co
   - Tao payment record voi `status = PENDING`

2. **PaymentsService.processCallback()** (`payments.service.ts:58`):
   - Tim payment theo gateway:
     - VNPay: `data.vnp_TxnRef` → `order_id`
     - MoMo: `data.order_id`
     - Stripe/default: `data.order_id`
   - Verify callback: `verifyCallback()` (`payments.service.ts:148`)
   - Thanh cong → `status = PAID`, luu `paid_at`
   - That bai → `status = FAILED`
   - Luu `gateway_response` (raw data) va `transaction_id`

3. **PaymentsService.refund()** (`payments.service.ts:110`):
   - Chi refund payment co `status = PAID`
   - Set `status = REFUNDED`, `refunded_at = now`

#### Payment Methods Supported

| Gateway | Verify Logic | Transaction ID Field |
|---|---|---|
| VNPay | `vnp_ResponseCode === '00'` | `vnp_TransactionNo` |
| MoMo | `resultCode === '0'` | `transId` |
| Stripe | `status === 'succeeded'` | `transaction_id` |
| COD | Always `true` | N/A |

### 3.5. Order Status Workflow

```
                            +-------------+
                            |   PENDING   |
                            +------+------+
                                   |
                          +--------+--------+
                          |                 |
                   [Payment OK]      [Cancel]
                          |                 |
                   +------v------+   +------v------+
                   |  CONFIRMED  |   |  CANCELLED  |
                   +------+------+   +-------------+
                          |               ^
                   [Start process]        |
                          |          [Cancel if
                   +------v------+    CONFIRMED]
                   | PROCESSING  |--------+
                   +------+------+
                          |
                   [Ship order]
                          |
                   +------v------+
                   |  SHIPPING   |
                   +------+------+
                          |
                   +------+------+
                   |             |
            [Delivered]    [Returned]
                   |             |
            +------v------+  +--v---------+
            |  DELIVERED   |  |  RETURNED  |
            +-------------+  +------------+
```

**OrderStatus enum** (`constants/index.ts`):
- `PENDING` → Cho xac nhan / thanh toan
- `CONFIRMED` → Da xac nhan (payment OK)
- `PROCESSING` → Dang xu ly / dong goi
- `SHIPPING` → Dang giao hang (`shipped_at` timestamp)
- `DELIVERED` → Da giao (`delivered_at` timestamp)
- `CANCELLED` → Da huy (`cancelled_reason`)
- `RETURNED` → Da tra hang

### 3.6. Cancel Order

```
 Client                   OrdersService              InventoryService
   |                            |                          |
   |  POST /orders/:id/cancel   |                          |
   |  { reason }                |                          |
   |--------------------------->|                          |
   |                            |  cancelOrder(id, reason) |
   |                            |                          |
   |                            |  1. findById(id)         |
   |                            |  2. Check status:        |
   |                            |     DELIVERED → 400      |
   |                            |     CANCELLED → 400      |
   |                            |  3. updateStatus(        |
   |                            |     CANCELLED, reason)   |
   |                            |                          |
   |  <-- Order { status:       |                          |
   |        CANCELLED }         |                          |
```

**Code ref**: `OrdersService.cancelOrder()` (`orders.service.ts:244`)

Kiem tra trang thai hop le: chi huy duoc khi status **khong phai** `DELIVERED` hoac `CANCELLED`. Throw `BadRequestException` neu khong hop le.

### Error Cases (Order Flow)

| Tinh huong | Response | Code |
|---|---|---|
| Gio hang rong | `Cart is empty` | 400 |
| Order items rong | `Order items are required` | 400 |
| Het hang (inventory) | `Insufficient stock. Available: X` | 400 |
| Da co payment cho order | `Payment already exists for this order` | 400 |
| Payment not found (callback) | `Payment not found for callback` | 404 |
| Refund non-paid payment | `Can only refund paid payments` | 400 |
| Huy don da giao | `Cannot cancel order with status "delivered"` | 400 |
| Ma giam gia het han | `Promotion has expired or not started` | 400 |
| Ma giam gia het luot dung | `Promotion usage limit reached` | 400 |
| Don duoi muc toi thieu | `Minimum order amount is X` | 400 |

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/orders/orders.service.ts` | Tao don, cap nhat trang thai, huy don, thong ke |
| `backend/src/modules/orders/entities/order.entity.ts` | Order entity — ShippingAddress interface, fields |
| `backend/src/modules/orders/entities/order-item.entity.ts` | OrderItem entity — price snapshot |
| `backend/src/modules/cart/cart.service.ts` | Gio hang, merge guest, abandoned detection |
| `backend/src/modules/payments/payments.service.ts` | Tao payment, xu ly callback, refund |
| `backend/src/modules/promotions/promotions.service.ts` | Validate + apply ma giam gia |
| `backend/src/modules/inventory/inventory.service.ts` | Kiem tra ton kho, reserve/release |

---

## 4. Media Upload Flow

### Mo ta
Upload file qua multipart/form-data. Tao storage key duy nhat, luu metadata vao DB, ho tro thumbnail cho anh, presigned URL cho CDN. Tich hop S3/R2 (chua implement thuc te, dang dung local path placeholder).

### Diagram

```
 Client                   MediaController            MediaService              S3/R2
   |                            |                          |                      |
   |  POST /media/upload        |                          |                      |
   |  (multipart/form-data)     |                          |                      |
   |  file + alt_text + folder  |                          |                      |
   |--------------------------->|                          |                      |
   |                            |  Multer parse file       |                      |
   |                            |                          |                      |
   |                            |  upload(file, userId,    |                      |
   |                            |    dto)                  |                      |
   |                            |------------------------->|                      |
   |                            |                          |                      |
   |                            |                          |  1. Extract extension |
   |                            |                          |     extname(filename) |
   |                            |                          |                      |
   |                            |                          |  2. Generate storage  |
   |                            |                          |     key:              |
   |                            |                          |     {folder}/{ts}-    |
   |                            |                          |     {random}{ext}     |
   |                            |                          |                      |
   |                            |                          |  3. TODO: Upload to   |
   |                            |                          |     S3/R2             |
   |                            |                          |  ..................>  |
   |                            |                          |                      |
   |                            |                          |  4. Generate filename |
   |                            |                          |     (random hex + ext)|
   |                            |                          |                      |
   |                            |                          |  5. Save to DB:       |
   |                            |                          |     filename,         |
   |                            |                          |     original_name,    |
   |                            |                          |     mime_type, size,  |
   |                            |                          |     storage_key, url, |
   |                            |                          |     alt_text, folder, |
   |                            |                          |     uploaded_by       |
   |                            |                          |                      |
   |  <-- Media { id, url,      |                          |                      |
   |       filename, size }     |                          |                      |
```

### Cac buoc chi tiet

1. **Multer middleware** parse multipart request — extract file buffer, originalname, mimetype, size
2. **MediaService.upload()** (`media.service.ts:49`):
   - Extract extension: `extname(file.originalname)` (vd: `.jpg`, `.png`, `.pdf`)
   - Tao storage key: `generateStorageKey(folder, ext)` (`media.service.ts:158`)
     - Format: `{folder}/{timestamp_base36}-{random_hex_12}{ext}`
     - Vi du: `products/lz5k8f-a1b2c3d4e5f6.jpg`
   - Generate filename: `{random_8_bytes_hex}{ext}` (vd: `4f8a2b1c9e3d7a5f.jpg`)
   - Luu metadata vao DB (Media entity)
   - Tra ve Media record voi `url = /uploads/{storageKey}`

3. **Thumbnail generation** (`media.service.ts:81`) — TODO:
   - Dung Sharp: `sharp(buffer).resize(300, 300, { fit: 'cover' })`
   - Upload thumbnail rieng voi key: `thumbnails/{random}{ext}`

4. **Presigned URL** (`media.service.ts:100`) — TODO:
   - Generate S3 presigned URL, expires 1h
   - Hien tai tra ve path local: `/uploads/{key}`

### Storage Key Format

```
{folder}/{timestamp_base36}-{random_hex_12}{extension}

Vi du:
  products/lz5k8f-a1b2c3d4e5f6.jpg
  blog/lz5kab-f8e7d6c5b4a3.png
  /lz5kcd-1a2b3c4d5e6f.pdf          ← root folder
```

### Cac tinh nang khac

| Method | Mo ta |
|---|---|
| `deleteMedia(id)` | Xoa khoi storage + hard delete DB record |
| `getByFolder(folder)` | List media theo folder |
| `getTotalStorageUsed(userId)` | Tong dung luong (bytes) da upload boi user |
| `getFolders()` | List cac folder duy nhat |

### Error Cases

| Tinh huong | Response |
|---|---|
| File qua lon (>50MB) | Multer reject (config) |
| File type khong ho tro | Multer filter reject |
| Media khong ton tai (delete) | `NotFoundException` |

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/media/media.service.ts` | Upload, thumbnail, presigned URL, delete |
| `backend/src/modules/media/entities/media.entity.ts` | Media entity |
| `backend/src/modules/media/dto/upload-media.dto.ts` | Upload validation DTO |

---

## 5. CMS Content Flow

### Mo ta
He thong quan ly noi dung voi 2 loai chinh: Articles (blog) va Pages (CMS). Moi loai co vong doi DRAFT → PUBLISHED → ARCHIVED. Bai viet co tags, categories, SEO meta, view count. Pages ho tro page builder (JSON config).

### Article Lifecycle

```
  +--------+      publish()      +------------+     archive     +------------+
  | DRAFT  |-------------------->| PUBLISHED  |---------------->| ARCHIVED   |
  +--------+                     +------------+                 +------------+
      ^                               |                              |
      |          unpublish()          |                              |
      +-------------------------------+                              |
      |                                                              |
      +--------------------------------------------------------------+
                            unarchive (update status)
```

### Diagram — Publish Article

```
 Client                   ArticlesController         ArticlesService          DB
   |                            |                          |                    |
   |  POST /articles/:id/       |                          |                    |
   |    publish                 |                          |                    |
   |--------------------------->|                          |                    |
   |                            |  publish(id)             |                    |
   |                            |------------------------->|                    |
   |                            |                          |  findById(id)      |
   |                            |                          |  status = PUBLISHED|
   |                            |                          |  published_at = now|
   |                            |                          |  save              |
   |                            |                          |------------------->|
   |  <-- Article { status:     |                          |                    |
   |        PUBLISHED }         |                          |                    |
```

### Cac buoc chi tiet

1. **Tao bai viet**: `ArticlesService.createArticle()` (`articles.service.ts:160`)
   - Tu dong sinh slug tu title: `generateSlug()` (`articles.service.ts:212`)
   - Slug format: `title-normalized-{timestamp_base36}`
   - Set `author_id` tu authenticated user
   - Status mac dinh: `DRAFT`

2. **Xuat ban**: `ArticlesService.publish()` (`articles.service.ts:43`)
   - Set `status = ArticleStatus.PUBLISHED`
   - Set `published_at = new Date()`

3. **Huy xuat ban**: `ArticlesService.unpublish()` (`articles.service.ts:52`)
   - Set `status = ArticleStatus.DRAFT`
   - Set `published_at = null`

4. **Tim bai viet public**: `ArticlesService.findPublished()` (`articles.service.ts:63`)
   - Filter: `status = PUBLISHED`, `deleted_at IS NULL`
   - Order: `published_at DESC`
   - Ho tro search tren: `title`, `excerpt`, `seo_keywords`

5. **Bai viet lien quan**: `ArticlesService.findRelated()` (`articles.service.ts:128`)
   - Uu tien cung `category_id`
   - Order theo `published_at DESC`
   - Limit default: 5

6. **Tim theo tag**: `ArticlesService.findByTag()` (`articles.service.ts:97`)
   - Dung `JSON_CONTAINS()` tren cot `tags` (JSON array)

7. **Tang luot xem**: `ArticlesService.incrementViewCount()` (`articles.service.ts:153`)
   - `increment({ id }, 'view_count', 1)`

### Article Filter Options

| Filter | Field | Mo ta |
|---|---|---|
| `status` | `entity.status` | draft / published / archived |
| `category_id` | `entity.category_id` | Loc theo danh muc |
| `author_id` | `entity.author_id` | Loc theo tac gia |
| `tag` | `JSON_CONTAINS(entity.tags)` | Loc theo tag |
| `is_featured` | `entity.is_featured` | Bai viet noi bat |
| `search` | `title, excerpt, seo_keywords` | Tim kiem full text |

### ArticleStatus enum

```
constants/index.ts:

  DRAFT     = 'draft'       ← Tac gia dang soan
  PUBLISHED = 'published'   ← Hien thi cong khai
  ARCHIVED  = 'archived'    ← An khoi public, giu trong he thong
```

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/articles/articles.service.ts` | CRUD, publish/unpublish, related, search by tag |
| `backend/src/modules/articles/entities/article.entity.ts` | Article entity |
| `backend/src/modules/articles/dto/create-article.dto.ts` | Validation DTO |

---

## 6. Real-time Notification Flow

### Mo ta
He thong thong bao ho tro in-app (real-time qua Socket.io — TODO), email (Resend API — TODO), va push. Thong bao luu vao DB, ho tro read/unread, bulk send, auto-cleanup.

### Diagram — Send Notification

```
 Event xay ra (vd: order.created)
    |
    v
 NotificationsService.send({
   user_id, type, title,
   message, data, channel
 })
    |
    v
 +-------------------+
 | Tao record trong  |
 | DB (notifications)|
 | sent_at = now     |
 +--------+----------+
          |
   +------+------+
   |             |
   v             v
 [in_app]     [email]
   |             |
   v             v
 TODO:        TODO:
 Socket.io    BullMQ queue
 emit to      → EmailWorker
 room         → Handlebars
 "user:{id}"  → Resend API
```

### Cac buoc chi tiet

1. **NotificationsService.send()** (`notifications.service.ts:25`):
   - Tao notification record: `{ ...dto, channel: dto.channel || 'in_app', sent_at: now }`
   - TODO: Emit socket event cho in-app
   - TODO: Queue email job cho email channel

2. **NotificationsService.sendEmail()** (`notifications.service.ts:40`) — placeholder:
   - Nhan `to`, `subject`, `html`
   - Hien tai chi log, chua tich hop SMTP/Resend

3. **Danh dau da doc**: `markAsRead(id, userId)` (`notifications.service.ts:49`)
   - Kiem tra `notification.user_id === userId` (bao mat)
   - Set `is_read = true`, `read_at = now`

4. **Danh dau tat ca da doc**: `markAllRead(userId)` (`notifications.service.ts:63`)
   - Bulk update: `is_read = false` → `is_read = true, read_at = now`

5. **Dem chua doc**: `getUnreadCount(userId)` (`notifications.service.ts:77`)
   - Count where `is_read = false, user_id = userId`

6. **Gui hang loat**: `sendBulk(userIds, dto)` (`notifications.service.ts:90`)
   - Tao notification cho moi user trong danh sach
   - Tra ve so luong da gui

7. **Xoa cu**: `deleteOld(days)` (`notifications.service.ts:109`)
   - Hard delete notifications `created_at < cutoff` va `is_read = true`

### Notification Channels

| Channel | Trang thai | Mo ta |
|---|---|---|
| `in_app` | TODO | Real-time qua Socket.io |
| `email` | TODO | Queue BullMQ → Resend API |
| `push` | Planned | Web push notification |

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/notifications/notifications.service.ts` | Send, read/unread, bulk, cleanup |
| `backend/src/modules/notifications/entities/notification.entity.ts` | Notification entity |

---

## 7. Analytics & Tracking Flow

### Mo ta
He thong analytics tu xay, khong dung third-party. Ghi nhan page views va custom events. Cung cap dashboard thong ke, bieu do theo thoi gian, thong ke thiet bi, nguon truy cap, top pages.

### Diagram — Track Pageview

```
 Client (Browser)          AnalyticsController         AnalyticsService         DB
   |                            |                          |                      |
   |  POST /analytics/pageview  |                          |                      |
   |  { page_url, page_title,   |                          |                      |
   |    session_id, referer }   |                          |                      |
   |--------------------------->|                          |                      |
   |                            |  trackPageView(dto,      |                      |
   |                            |    ip, userAgent, userId) |                     |
   |                            |------------------------->|                      |
   |                            |                          |  detectDeviceType()  |
   |                            |                          |  (tablet/mobile/     |
   |                            |                          |   desktop)           |
   |                            |                          |                      |
   |                            |                          |  Create PageView:    |
   |                            |                          |  { page_url,         |
   |                            |                          |    page_title,       |
   |                            |                          |    session_id,       |
   |                            |                          |    referer,          |
   |                            |                          |    ip_address,       |
   |                            |                          |    user_agent,       |
   |                            |                          |    user_id,          |
   |                            |                          |    device_type }     |
   |                            |                          |--------------------->|
   |  <-- PageView record       |                          |                      |
```

### Diagram — Track Event

```
 Client                   AnalyticsController         AnalyticsService         DB
   |                            |                          |                    |
   |  POST /analytics/event     |                          |                    |
   |  { name, session_id,       |                          |                    |
   |    data }                  |                          |                    |
   |--------------------------->|                          |                    |
   |                            |  trackEvent(dto, userId) |                    |
   |                            |------------------------->|                    |
   |                            |                          |  Create Event:     |
   |                            |                          |  { name,           |
   |                            |                          |    session_id,     |
   |                            |                          |    data (JSON),    |
   |                            |                          |    user_id }       |
   |                            |                          |------------------>|
   |  <-- Event record          |                          |                    |
```

### Diagram — Dashboard Stats

```
 Admin                    AnalyticsController         AnalyticsService         DB
   |                            |                          |                    |
   |  GET /analytics/dashboard  |                          |                    |
   |  ?date_from&date_to        |                          |                    |
   |--------------------------->|                          |                    |
   |                            |  getDashboardStats()     |                    |
   |                            |------------------------->|                    |
   |                            |                          |  Promise.all([     |
   |                            |                          |    COUNT(pageviews)|
   |                            |                          |    COUNT(DISTINCT  |
   |                            |                          |      session_id)   |
   |                            |                          |    COUNT(events)   |
   |                            |                          |  ])                |
   |                            |                          |------------------->|
   |  <-- {                     |                          |                    |
   |    pageviews: N,           |                          |                    |
   |    unique_sessions: N,     |                          |                    |
   |    events: N               |                          |                    |
   |  }                         |                          |                    |
```

### Cac buoc chi tiet

1. **AnalyticsService.trackPageView()** (`analytics.service.ts:27`):
   - Detect device type tu User-Agent: `detectDeviceType()` (`analytics.service.ts:181`)
     - Regex check: tablet → `/tablet|ipad|playbook|silk/`
     - Mobile → `/mobile|iphone|ipod|android.*mobile|windows phone/`
     - Default → `desktop`
   - Save PageView record

2. **AnalyticsService.trackEvent()** (`analytics.service.ts:49`):
   - Luu event voi `name` (vd: `product_view`, `add_to_cart`, `purchase`), `session_id`, `data` (JSON)

3. **AnalyticsService.getDashboardStats()** (`analytics.service.ts:62`):
   - 3 queries song song (Promise.all):
     - Total pageviews (COUNT)
     - Unique sessions (COUNT DISTINCT session_id)
     - Total events (COUNT)

4. **Bieu do theo thoi gian**: `getPageViewStats()` (`analytics.service.ts:91`)
   - Group by: `day` (`%Y-%m-%d`), `week` (`%Y-%u`), `month` (`%Y-%m`)
   - Dung `DATE_FORMAT()` cua MySQL

5. **Top trang**: `getTopPages()` (`analytics.service.ts:110`)
   - Group by `page_url`, count views, order DESC, limit (default 10)

6. **Thiet bi**: `getDeviceStats()` (`analytics.service.ts:129`)
   - Group by `device_type` (desktop, mobile, tablet)

7. **Doanh thu**: `getRevenueChart()` (`analytics.service.ts:144`)
   - Dua tren event name `'purchase'`, SUM `JSON_EXTRACT(data, '$.amount')`

8. **Nguon truy cap**: `getTrafficSources()` (`analytics.service.ts:163`)
   - Group by `referer`, count, top 20

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/analytics/analytics.service.ts` | Track, dashboard, charts, device stats |
| `backend/src/modules/analytics/entities/page-view.entity.ts` | PageView entity |
| `backend/src/modules/analytics/entities/event.entity.ts` | Event entity |

---

## 8. Multi-tenant Flow

### Mo ta
He thong SaaS multi-tenant voi data isolation theo `tenant_id`. Moi tenant co slug duy nhat, custom domain, settings rieng. Ho tro plan subscription voi usage tracking va feature gating.

### Diagram — Tenant Creation

```
 Admin/User              TenantsController          TenantsService             DB
   |                            |                          |                    |
   |  POST /tenants             |                          |                    |
   |  { name, domain }          |                          |                    |
   |--------------------------->|                          |                    |
   |                            |  create(data)            |                    |
   |                            |------------------------->|                    |
   |                            |                          |  generateUniqueSlug|
   |                            |                          |  (name)            |
   |                            |                          |  [Trung? -> them   |
   |                            |                          |   suffix: -1, -2]  |
   |                            |                          |                    |
   |                            |                          |  Create tenant:    |
   |                            |                          |  { name, slug,     |
   |                            |                          |    domain,         |
   |                            |                          |    owner_id,       |
   |                            |                          |    is_active }     |
   |                            |                          |------------------->|
   |  <-- Tenant { id, slug }   |                          |                    |
```

### Cac buoc chi tiet — Tenant

1. **TenantsService.create()** (`tenants.service.ts:25`):
   - Tu dong sinh slug tu name (slugify library): `generateUniqueSlug()` (`tenants.service.ts:85`)
   - Neu slug trung → them suffix `-1`, `-2`, ... cho den khi unique
2. **Tim theo slug**: `findBySlug(slug)` (`tenants.service.ts:35`)
3. **Tim theo domain**: `findByDomain(domain)` (`tenants.service.ts:42`)
4. **Tim theo owner**: `findByOwner(userId)` (`tenants.service.ts:49`)
5. **Kich hoat/vo hieu hoa**: `activate(id)`, `deactivate(id)` (`tenants.service.ts:56,63`)
6. **Cap nhat settings**: `updateSettings(id, settings)` (`tenants.service.ts:73`) — merge voi settings hien tai

### Diagram — Plan Subscription

```
 Tenant Admin             PlansController            PlansService              DB
   |                            |                          |                    |
   |  POST /plans/subscribe     |                          |                    |
   |  { plan_id }               |                          |                    |
   |--------------------------->|                          |                    |
   |                            |  subscribe(tenantId,     |                    |
   |                            |    planId)               |                    |
   |                            |------------------------->|                    |
   |                            |                          |                    |
   |                            |                          |  1. findById(plan) |
   |                            |                          |  2. getSubscription|
   |                            |                          |     (current?)     |
   |                            |                          |  3. [has active?]  |
   |                            |                          |     -> cancel it   |
   |                            |                          |     status=CANCEL  |
   |                            |                          |  4. Tinh period:   |
   |                            |                          |     monthly: +1m   |
   |                            |                          |     yearly: +1y    |
   |                            |                          |     lifetime: +100y|
   |                            |                          |     trial? +Xd     |
   |                            |                          |  5. Create sub:    |
   |                            |                          |     tenant_id,     |
   |                            |                          |     plan_id,       |
   |                            |                          |     status,        |
   |                            |                          |     period_start,  |
   |                            |                          |     period_end     |
   |                            |                          |------------------->|
   |  <-- Subscription          |                          |                    |
```

### Cac buoc chi tiet — Plans & Subscriptions

1. **PlansService.getActivePlans()** (`plans.service.ts:31`):
   - Filter: `is_active = true, deleted_at IS NULL`
   - Sort: `sort_order ASC`

2. **PlansService.subscribe()** (`plans.service.ts:41`):
   - Lay plan info
   - Kiem tra subscription hien tai → huy neu dang `ACTIVE`
   - Tinh `current_period_end` dua tren `billing_cycle`:
     - `monthly`: +1 thang
     - `yearly`: +1 nam
     - `lifetime` / `free`: +100 nam
   - Neu plan co `trial_days > 0` → status = `TRIALING`, period = trial days

3. **PlansService.cancel()** (`plans.service.ts:91`):
   - Set status = `CANCELLED`, `cancelled_at = now`, `cancel_reason`

4. **PlansService.renew()** (`plans.service.ts:108`):
   - Reset status = `ACTIVE`, tinh period moi tu hien tai

### Diagram — Usage Checking

```
 Any Service               PlansService                    DB
   |                            |                           |
   |  checkUsage(tenantId,      |                           |
   |    'products')             |                           |
   |--------------------------->|                           |
   |                            |  1. getSubscription()     |
   |                            |  2. findById(plan)        |
   |                            |  3. Map metric to limit:  |
   |                            |     products → max_products|
   |                            |     storage → max_storage |
   |                            |     users → max_users     |
   |                            |     api_calls → 100000   |
   |                            |  4. SUM(usage.value)      |
   |                            |     in current period     |
   |                            |-------------------------->|
   |  <-- { used, limit,        |                           |
   |        allowed }           |                           |
```

### Cac buoc chi tiet — Usage

1. **PlansService.checkUsage()** (`plans.service.ts:152`):
   - Lay subscription hien tai
   - Map metric sang plan limit (tu `PlanFeatures`):
     - `products` → `features.max_products`
     - `storage_bytes` → `features.max_storage_gb * 1024^3`
     - `users` → `features.max_users`
     - `api_calls` → `100000` (default)
   - Tinh tong usage trong period hien tai (SUM)
   - Tra ve `{ used, limit, allowed: used < limit }`

2. **PlansService.recordUsage()** (`plans.service.ts:192`):
   - Ghi usage record: `{ tenant_id, metric, value, period_start, period_end }`

3. **PlansService.isFeatureAllowed()** (`plans.service.ts:213`):
   - Kiem tra boolean feature cua plan (vd: `custom_domain`, `api_access`)

### SubscriptionStatus

```
  ACTIVE     ← Dang hoat dong
  TRIALING   ← Dang dung thu
  CANCELLED  ← Da huy
  PAST_DUE   ← Qua han thanh toan
```

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/tenants/tenants.service.ts` | CRUD tenant, slug, domain, settings |
| `backend/src/modules/plans/plans.service.ts` | Plans, subscribe, cancel, renew, usage |
| `backend/src/modules/plans/entities/plan.entity.ts` | Plan entity, PlanFeatures interface |
| `backend/src/modules/plans/entities/subscription.entity.ts` | Subscription entity |
| `backend/src/modules/plans/entities/usage.entity.ts` | Usage tracking entity |

---

## 9. Webhook Delivery Flow

### Mo ta
He thong webhook cho phep tenant dang ky URL de nhan thong bao khi co event xay ra. Moi webhook co HMAC-SHA256 secret de xac thuc. Ho tro retry voi exponential backoff.

### Diagram — Trigger & Delivery

```
 Event (vd: order.created)
    |
    v
 WebhooksService.trigger(event, payload, tenantId)
    |
    |  1. Tim webhooks:
    |     is_active = true
    |     tenant_id match
    |     events array contains event
    |
    v
 +------+------+------+
 | WH-1 | WH-2 | WH-3 |   ← matched webhooks
 +--+---+--+---+--+---+
    |      |      |
    v      v      v
 sendWebhook() cho moi webhook
    |
    |  1. JSON.stringify({
    |       event, data, timestamp
    |     })
    |
    |  2. HMAC-SHA256 signature:
    |     createHmac('sha256', secret)
    |       .update(body).digest('hex')
    |
    |  3. POST to webhook.url
    |     Headers:
    |       Content-Type: application/json
    |       X-Webhook-Signature: {sig}
    |       X-Webhook-Event: {event}
    |     Body: JSON payload
    |     Timeout: 10s
    |
    |  4. Log WebhookDelivery:
    |     { webhook_id, event, payload,
    |       response_status, response_body,
    |       attempt, success, duration_ms,
    |       next_retry_at }
    |
    +-----+-----+
    |           |
   [OK]      [FAIL]
    |           |
    v           v
 success=true  success=false
 failure_cnt=0 failure_cnt++
               next_retry_at:
                 attempt 1: +5m
                 attempt 2: +25m
                 attempt 3: +125m
                 (max 3 retries)
```

### Cac buoc chi tiet

1. **WebhooksService.trigger()** (`webhooks.service.ts:70`):
   - Query: `is_active = true, deleted_at IS NULL`, filter by `tenantId`
   - Loc webhook co event match: `events.includes(event)`
   - Goi `sendWebhook()` cho moi matched webhook

2. **sendWebhook()** (`webhooks.service.ts:105`):
   - Tao body: `{ event, data: payload, timestamp }`
   - Tao signature: `generateSignature(body, webhook.secret)` (`webhooks.service.ts:234`)
     - HMAC-SHA256: `createHmac('sha256', secret).update(payload).digest('hex')`
   - POST voi timeout 10s (AbortSignal.timeout)
   - Ghi `WebhookDelivery` record
   - Cap nhat webhook: `last_triggered_at`, `failure_count`

3. **Retry logic** (`webhooks.service.ts:142`):
   - Exponential backoff: `Math.pow(5, attempt) * 60 * 1000` ms
     - Attempt 1: 5^1 * 60s = 5 phut
     - Attempt 2: 5^2 * 60s = 25 phut
     - Attempt 3: Max, khong retry nua
   - `MAX_RETRIES = 3` (`webhooks.service.ts:32`)

4. **Manual retry**: `retry(deliveryId)` (`webhooks.service.ts:176`)

### Available Events

```typescript
// webhooks.service.ts:15
export const AVAILABLE_EVENTS = [
  'order.created',      'order.updated',
  'order.cancelled',    'order.completed',
  'payment.received',   'payment.refunded',
  'product.created',    'product.updated',
  'product.deleted',
  'user.registered',    'user.updated',
  'inventory.low',
  'review.created',
];
```

### Webhook Security — HMAC Verification

```
Receiver side verification:

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(requestBody)
    .digest('hex');

  if (req.headers['x-webhook-signature'] !== expectedSig) {
    // Reject — signature mismatch
  }
```

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/webhooks/webhooks.service.ts` | CRUD, trigger, send, retry, HMAC |
| `backend/src/modules/webhooks/entities/webhook.entity.ts` | Webhook entity |
| `backend/src/modules/webhooks/entities/webhook-delivery.entity.ts` | Delivery log entity |

---

## 10. Search Flow

### Mo ta
Tim kiem toan cuc tren nhieu bang (products, articles, pages) dung MySQL LIKE. Ket qua duoc scoring, merge, sap xep theo relevance, va phan trang.

### Diagram

```
 Client                   SearchController           SearchService              DB
   |                            |                          |                      |
   |  GET /search               |                          |                      |
   |  ?query=ao&type=all        |                          |                      |
   |  &page=1&limit=20          |                          |                      |
   |--------------------------->|                          |                      |
   |                            |  search(dto)             |                      |
   |                            |------------------------->|                      |
   |                            |                          |                      |
   |                            |                          |  searchTerm = '%ao%' |
   |                            |                          |                      |
   |                            |                          |  [type=all/product]  |
   |                            |                          |  Query products:     |
   |                            |                          |  WHERE name LIKE ?   |
   |                            |                          |    OR description    |
   |                            |                          |    LIKE ?            |
   |                            |                          |  Score:              |
   |                            |                          |    name match = 3    |
   |                            |                          |    short_desc = 2    |
   |                            |                          |    description = 1   |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |                            |                          |  [type=all/article]  |
   |                            |                          |  Query articles:     |
   |                            |                          |  WHERE title LIKE ?  |
   |                            |                          |    OR content LIKE ? |
   |                            |                          |  Score:              |
   |                            |                          |    title match = 3   |
   |                            |                          |    excerpt = 2       |
   |                            |                          |    content = 1       |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |                            |                          |  [type=all/page]     |
   |                            |                          |  Query pages:        |
   |                            |                          |  WHERE title LIKE ?  |
   |                            |                          |    OR content LIKE ? |
   |                            |                          |  Score:              |
   |                            |                          |    title = 3         |
   |                            |                          |    content = 1       |
   |                            |                          |--------------------->|
   |                            |                          |                      |
   |                            |                          |  Merge all results   |
   |                            |                          |  Sort by score DESC  |
   |                            |                          |  Paginate            |
   |                            |                          |                      |
   |  <-- { items: [            |                          |                      |
   |    { type, id, title,      |                          |                      |
   |      excerpt, url, image,  |                          |                      |
   |      score }               |                          |                      |
   |  ], total }                |                          |                      |
```

### Cac buoc chi tiet

1. **SearchService.search()** (`search.service.ts:27`):
   - Tao `searchTerm = '%{query}%'`
   - Tim tren tung bang theo `type` param:

2. **Products** (`search.service.ts:34`):
   - WHERE: `name LIKE ? OR description LIKE ? OR short_description LIKE ?`
   - Filter: `deleted_at IS NULL AND is_active = 1`
   - Score: name=3, short_description=2, description=1
   - URL: `/products/{slug}`
   - Image: `JSON_EXTRACT(images, '$[0].url')`

3. **Articles** (`search.service.ts:69`):
   - WHERE: `title LIKE ? OR content LIKE ? OR excerpt LIKE ?`
   - Filter: `deleted_at IS NULL AND status = 'published'`
   - Score: title=3, excerpt=2, content=1
   - URL: `/articles/{slug}`
   - Image: `featured_image`

4. **Pages** (`search.service.ts:104`):
   - WHERE: `title LIKE ? OR content LIKE ?`
   - Filter: `deleted_at IS NULL AND is_active = 1`
   - Score: title=3, content=1
   - URL: `/pages/{slug}`

5. **Merge & Sort**: Gop tat ca results, sort by `score DESC`
6. **Pagination**: Slice theo `offset = (page-1)*limit`

### SearchResult Interface

```typescript
interface SearchResult {
  type: 'product' | 'article' | 'page';
  id: string;
  title: string;
  excerpt: string;
  url: string;
  image: string | null;
  score: number;
}
```

### Luu y
- Dung raw SQL (DataSource.query) de toi uu performance
- Graceful error handling: neu bang chua ton tai (table missing), bo qua (try/catch)
- Score-based ranking thay vi simple LIKE

### Code Reference

| File | Mo ta |
|---|---|
| `backend/src/modules/search/search.service.ts` | Tim kiem toan cuc, scoring, merge |
| `backend/src/modules/search/dto/search.dto.ts` | Search query DTO |

---

## 11. Export/Import Flow

### Mo ta
He thong export/import data cho phep xuat va nhap du lieu hang loat. Ho tro format CSV va XLSX. Validate tung dong khi import, bao cao so dong thanh cong va loi.

### Diagram — Export

```
 Admin                   ExportController           ExportService
   |                            |                          |
   |  POST /export              |                          |
   |  { entity_type: 'products',|                          |
   |    format: 'xlsx',         |                          |
   |    filters: { ... } }      |                          |
   |--------------------------->|                          |
   |                            |  export(dto)             |
   |                            |------------------------->|
   |                            |                          |
   |                            |                          |  1. Query data by
   |                            |                          |     entity_type + filters
   |                            |                          |
   |                            |                          |  2. Generate file:
   |                            |                          |     CSV: comma-separated
   |                            |                          |     XLSX: xlsx package
   |                            |                          |
   |  <-- File download         |                          |
   |  (Content-Disposition:     |                          |
   |   attachment)              |                          |
```

### Diagram — Import

```
 Admin                   ImportController           ImportService
   |                            |                          |
   |  POST /import              |                          |
   |  (multipart)               |                          |
   |  { entity_type, file }     |                          |
   |--------------------------->|                          |
   |                            |  import(dto, file)       |
   |                            |------------------------->|
   |                            |                          |
   |                            |                          |  1. Parse file
   |                            |                          |     (CSV or XLSX)
   |                            |                          |
   |                            |                          |  2. For each row:
   |                            |                          |     - Validate against
   |                            |                          |       entity rules
   |                            |                          |     - [Valid?]
   |                            |                          |       -> Insert/Update
   |                            |                          |     - [Invalid?]
   |                            |                          |       -> Add to errors
   |                            |                          |
   |  <-- {                     |                          |
   |    success: 150,           |                          |
   |    errors: [               |                          |
   |      { row: 5,             |                          |
   |        message: '...' }    |                          |
   |    ]                       |                          |
   |  }                         |                          |
```

### Cac buoc chi tiet

1. **Export**:
   - Nhan `entity_type` (products, orders, users, articles)
   - Ap dung `filters` de loc data
   - Tao file: CSV (dung delimiter) hoac XLSX (dung `xlsx` package)
   - Tra ve file download voi `Content-Disposition: attachment`

2. **Import**:
   - Parse file upload (CSV/XLSX)
   - Validate tung dong theo rules cua entity:
     - Products: name required, price > 0, SKU unique
     - Users: email format, unique
   - Insert hoac update (upsert) tung record
   - Thu thap errors: `[{ row, message }]`
   - Tra ve summary: `{ success: count, errors: [...] }`

### Supported Entity Types

| Entity Type | Export Fields | Import Validation |
|---|---|---|
| `products` | name, sku, price, stock, category, status | Name required, price > 0 |
| `orders` | order_number, status, total, date, customer | Read-only (export only) |
| `users` | name, email, role, created_at | Email format + unique |
| `articles` | title, status, author, published_at | Title required |

---

## Tong ket — Ma trang thai

### OrderStatus

| Status | Ma | Mo ta |
|---|---|---|
| PENDING | `pending` | Cho xac nhan |
| CONFIRMED | `confirmed` | Da xac nhan |
| PROCESSING | `processing` | Dang xu ly |
| SHIPPING | `shipping` | Dang giao |
| DELIVERED | `delivered` | Da giao |
| CANCELLED | `cancelled` | Da huy |
| RETURNED | `returned` | Da tra hang |

### PaymentStatus

| Status | Ma | Mo ta |
|---|---|---|
| PENDING | `pending` | Cho thanh toan |
| PAID | `paid` | Da thanh toan |
| FAILED | `failed` | That bai |
| REFUNDED | `refunded` | Da hoan tien |

### ArticleStatus

| Status | Ma | Mo ta |
|---|---|---|
| DRAFT | `draft` | Ban nhap |
| PUBLISHED | `published` | Da xuat ban |
| ARCHIVED | `archived` | Luu tru |

### ContactStatus

| Status | Ma | Mo ta |
|---|---|---|
| NEW | `new` | Moi tao |
| IN_PROGRESS | `in_progress` | Dang xu ly |
| RESOLVED | `resolved` | Da giai quyet |
| CLOSED | `closed` | Da dong |

### UserRole

| Role | Ma | Quyen |
|---|---|---|
| ADMIN | `admin` | Full access |
| MANAGER | `manager` | Quan ly noi dung, don hang |
| EDITOR | `editor` | Chinh sua noi dung |
| USER | `user` | Mua hang, xem |
