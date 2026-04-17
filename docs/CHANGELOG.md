# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.0] - 2026-04-17 — Comprehensive review + hardening (6 rounds, ~80 fixes)

Audit toàn diện kiến trúc, syntax, logic, nghiệp vụ, hiệu năng, security, UX qua 6 rounds với multiple AI agents song song. **Tất cả Critical/High đã fix; backend + frontend typecheck pass.**

### Security (Critical/High)

**Auth & Account takeover prevention**
- Email normalize (`UsersService.normalizeEmail`) áp dụng cho register/login/forgot/OAuth — chống takeover qua case manipulation (`User@Ex` vs `user@ex`)
- OAuth `validateOAuthUser`: BLOCK auto-link OAuth provider vào tài khoản password hiện có (chống compromised provider chiếm account); chỉ link cùng provider ID hoặc OAuth-only account
- 2FA `generateSecret` yêu cầu password verification (chống session hijack short-term enable 2FA)
- 2FA `disable` step-up auth: yêu cầu BOTH password AND TOTP code (chống bypass khi password leak)
- 2FA backup code: atomic `JSON_REMOVE + JSON_SEARCH` UPDATE (chống race khi 2 request cùng dùng 1 code)
- Password change: `IsStrongPassword` (trước chỉ MinLength 6); revoke tokens TRƯỚC khi update (giảm window race)
- Refresh token: phân biệt rõ expired vs revoked vs forged (trước tất cả thành "reuse detected")
- Forgot password: block deleted/inactive users; normalize email
- Cookie SameSite/Secure: env-driven (`COOKIE_SAMESITE`), `none+secure` cho cross-origin AJAX prod
- OAuth callback: token via URL fragment (`#token=...`) thay vì query (chống leak referrer/log)

**Authorization & IDOR**
- Tenant guard: admin chỉ override `x-tenant-id` ở endpoint có `@AllowCrossTenant()` (whitelist) — chống compromised admin truy cập all tenants
- API key revoke: verify `tenant_id === user.tenantId` (chống cross-tenant revoke)
- Reviews: yêu cầu user đã có order DELIVERED chứa product + block duplicate review

**Payments**
- VNPay `vnp_IpAddr`: lấy từ request (X-Forwarded-For → req.ip), `sanitizeIp()`. Trước hardcoded `127.0.0.1` → VNPay reject prod
- Stripe webhook: raw body middleware tại `/api/payments/callback/stripe` (Stripe verify cần raw bytes, không phải parsed JSON)
- Payment callback: `extractCallbackAmount()` validate amount khớp với `payment.amount` trước khi mark PAID (chống tampered webhook)

**Injection & Path traversal**
- Media `buildKey()`: whitelist folder regex `^[a-z0-9/_-]*$`, reject `..`, cap 100 chars (chống path traversal)
- Reports CSV: prefix `'` cho cell `^[=+\-@\t\r]` (chống Excel formula injection)
- Search: LIKE wildcard escape (`%`, `_`, `\`); boolean special chars stripped
- Audit interceptor: recursive sanitize nested objects (trước chỉ shallow keys); thêm `backup_code`, `accesstoken`, `apikey`, `private_key` vào blocklist

**Rate limiting & DoS**
- Contacts POST: `@Throttle(5/60s)` chống spam form
- Chat tool rate limit: per-user (customerId) thay vì per-conversation (chống bypass spawn nhiều conv)
- Chat gateway CORS: whitelist từ `CORS_ORIGINS` env (trước `origin: true`); `maxHttpBufferSize: 64KB`
- GDPR export: caps cho orders 5000, items 20000, media 5000, audit 1000 (chống OOM)
- Categories: in-memory cache 5min; bound 500 roots + 2000 grandchildren
- Sitemap: cache 1h; cap 5000 articles + 1000 pages
- Inventory `getLowStockItems`: cap 1000/5000 (chống OOM)
- Search: 5s query timeout `Promise.race`; 200/source result cap; min 2 chars
- Frontend `next.config.ts` images: whitelist S3/R2/social CDN (trước `hostname: '**'`)

### Business Logic (Critical/High)

**Cart**
- `addItem`: snapshot price từ DB (trước `price: 0`); check stock trước khi add; atomic increment `quantity + N` cho existing item; `ER_DUP_ENTRY` fallback cho race
- `updateItemQuantity`: validate quantity > 0 + check stock
- `mergeGuestCart`: validate stock + refresh price từ DB cho mỗi item; skip item out-of-stock thay vì block toàn merge
- Composite UNIQUE `(cart_id, product_id, variant_id)` chống duplicate (migration 1713657600000)

**Orders**
- Total formula đúng: `total = max(0, subtotal − discount + shipping + tax)` (trước `total = subtotal`)
- Reserve inventory atomic TRƯỚC khi tạo order; rollback nếu fail
- DB transaction wrap order + items save (atomic, no half-state)
- `cancelOrder`: atomic UPDATE `WHERE status = current`; release stock + revoke promotion
- Promotion `recordUsage` fail → release slot (chống orphan)
- `createDirect`: validate quantity > 0 cho mỗi item

**Promotions**
- Atomic check-and-increment: `UPDATE used_count + 1 WHERE used_count < usage_limit` (chống over-use khi 2 user cùng dùng mã cuối)
- Tách `reserveAndCalculate` / `recordUsage` / `releaseSlot` / `revokeForOrder` cho 2-phase commit

**Inventory**
- `adjustStock`: atomic UPDATE `quantity + delta` với guard `quantity + delta >= 0` (chống race khi 2 admin)
- `getMovements`: pagination page+limit (trước hardcoded take 100)

**Notifications**
- `markAsRead`: atomic UPDATE `WHERE id + user_id` (chống race + IDOR trong 1 query)

**Tenants & Plans**
- Tenant slug: `SELECT FOR UPDATE` + retry random suffix + `ER_DUP_ENTRY` catch (chống TOCTOU race)
- Plans `assertQuotaAvailable`: atomic check-and-reserve trong transaction (chống race exceed quota)

### Performance (High)

- Settings: in-memory cache TTL 60s (settings đọc rất nhiều ở auth flows)
- Categories: cache + bulk reorder UPDATE CASE WHEN (trước N+1)
- Sitemap: 1h cache + bound queries
- Audit logs cleanup cron: batch DELETE 10K + sleep 100ms (chống lock DB hàng phút trên million rows)
- Webhook retry cron: Redis distributed lock SETNX EX 540s (chống duplicate delivery multi-instance)
- Composite indexes: `audit_logs(user_id, created_at)`, `audit_logs(resource_type, resource_id, created_at)` (migration 1713657600000)
- `BaseEntity.deleted_at` indexed + migration 1713744000000 cho 35 tables
- Analytics: `trackPageView/trackEvent` chuyển từ sync DB write sang BullMQ async (chống pool exhaust 1000 req/s); PII sanitize ở worker
- Reports: cap 100k orders + 366-day range; tenant filter
- i18n bulk import: `INSERT ON DUPLICATE KEY` chunks 500 (trước N+1 find+save)
- Queue webhook attempts 5 (match `MAX_WEBHOOK_ATTEMPTS` cron)

### Frontend (Critical/High)

**Critical bug fix**
- `proxy.ts`: bỏ `next-intl` middleware — cấu trúc `app/` không dùng `[locale]/...` segment, middleware gây 404 TẤT CẢ route trong `(auth)/(public)/(dashboard)`. Trang `/login`, `/products`, `/cart` đều 404 trước fix
- `useMediaQuery`: dùng `useSyncExternalStore` (chống setState in useEffect cascading render)
- `useApi`: tách `paramsKey = JSON.stringify(params)` thành `useMemo` (chống deps array complex expression)
- `useCtaSettings`: lazy initializer thay vì setState in useEffect

**State management**
- `cart-store` + `auth-store`: namespace `webtemplate-*-v1` chống key collision
- Logout: clear cart-store (chống leak data sang user khác trong cùng browser)

**UX**
- 5 `loading.tsx` mới: orders/[id], checkout, products/[slug], blog/[slug], profile
- Checkout phone input: `type="tel"` + `inputMode="tel"` + `autoComplete="tel"`
- Checkout submit: `disabled={isSubmitting}` + "Dang xu ly..."
- Cart quantity buttons: `min-w-[44px] min-h-[44px]` WCAG touch target; debounced 150ms; aria-hidden cho decorative icons

### Architecture

- `@AllowCrossTenant()` decorator + `TenantGuard` opt-in pattern
- `TransformInterceptor`: pass-through Stream/Buffer/StreamableFile/headersSent (chống corrupt file download/GDPR ZIP)
- `Setup2FADto`, `RegenerateBackupCodesDto` (tách backup-code rotation khỏi disable)
- `OrdersService` inject `DataSource` cho transaction support

### Audit Logging

- AuthService: ghi log `auth.login` / `auth.login_failed` / `auth.password_change` / `auth.logout` với IP+UA
- TwoFactorService: `auth.2fa_enable` / `auth.2fa_disable` / `auth.2fa_backup_used`
- AuditInterceptor: filter sensitive recursive (password, token, secret, apikey, backup_code)

### Migrations

- `1713657600000-AddCartUniqueAuditIndexes` — cart_items composite UNIQUE + audit_logs composite indexes
- `1713744000000-AddDeletedAtIndexes` — `deleted_at` index cho 35 tables (idempotent: skip nếu đã có)

### Notes

- `BE typecheck`, `FE typecheck`, `BE jest tests`: tất cả pass sau 6 rounds
- Audit logs cron sleep 100ms giữa batches → cleanup 1M rows ~10s thay vì lock DB
- `CORS_ORIGINS`, `IMAGE_HOSTS`, `COOKIE_SAMESITE`: env-configurable cho deployment

---

## [1.1.0] - 2026-04-17

### Added

**Authentication & Security**
- Auth hardening: JWT strategy rejects deleted/inactive users, account lockout via Redis (5 attempts / 15 min TTL), OAuth Google + Facebook with conditional strategy registration, email verification flow, resend verification
- 2FA: backup codes SHA-256 persist with single-use removal, regenerate backup codes with password confirmation
- Frontend SSR auth gate via `proxy.ts` (Next.js 16), OAuth `/auth/callback` page, `/verify-email` page, 2FA re-login via sessionStorage, remember-me switches localStorage/sessionStorage
- Users soft delete revokes all refresh tokens (forwardRef AuthService), self-delete guard on DELETE /users/:id

**Payments**
- VNPay: full HMAC-SHA512 signature, URL builder, callback verification (2.1.0 spec)
- Momo AIO v2: HMAC-SHA256 signature, fetch-based payment URL creation, IPN callback verification
- Stripe: Checkout Session creation, webhook signature verification (package + manual fallback), VND zero-decimal handling
- Frontend checkout: redirect to gateway URL after order creation, `/payment/result` page for VNPay return

**Media & Files**
- Frontend media upload wiring: drag-drop + click, per-file progress, 10MB guard, mime whitelist
- ZIP bundle download (POST /media/download/bulk, max 100 items / 100MB)
- File preview: PDF viewer (react-pdf), DOCX viewer (mammoth), image viewer, modal lazy-loaded
- Rich text editor: Tiptap with extensions, custom IframeEmbed node with URL normalization (Google Forms, YouTube, Vimeo, Maps)

**Reports & Async**
- Reports module: sales/products/customers/inventory in CSV/XLSX/PDF/JSON formats
- Weekly report cron (Mon 8am): generates PDF + XLSX, emails all active admins with per-admin error isolation
- BullMQ Dead Letter Queue: auto-move on failure, /admin/dlq endpoint for inspection
- Webhook retry with per-delivery `next_retry_at` + exponential backoff (2/4/8/16/32 min, max 5 attempts), then DLQ
- Cron jobs: audit logs cleanup (3am), refresh tokens cleanup (4am), webhook retry (every 10 min)

**Infrastructure**
- Global RedisModule (ioredis) with `maxRetriesPerRequest: null` for BullMQ compatibility
- Redis-backed rate limiting: login attempts (INCR + EXPIRE), GDPR export (SET NX + EXPIRE)
- Mail attachment offload: files >1MB uploaded to S3 `tmp/mail-attach/` prefix (7-day lifecycle), worker downloads before send
- Email templates: `weekly_report` template, `verify_email` with CTA button + fallback link
- HTML sanitization with iframe whitelist (docs.google.com, YouTube, Vimeo, Maps) applied to pages/articles

**Frontend UX**
- Analytics charts (Recharts): Line/Bar/Pie real implementations
- WebSocket notifications: `/notifications` namespace with auth token, bell + badge + popover in admin topbar
- Floating CTA bar + mobile bottom tab bar
- Admin sidebar role filter (Users/Settings/Logs/API Keys/Webhooks → ADMIN only)

**Data Export**
- GDPR data export (GET /users/:id/export) with Redis rate limit (1 per 24h)

### Changed
- `createPaymentUrl` signature changed to `async Promise<string>` to support Momo/Stripe HTTP calls
- `password_hash` column now nullable (OAuth users have no password)
- User entity adds: `backup_codes_hash`, `email_verification_jti`, `provider`, `provider_id`

### Migrations
- `1713312000000-AddAuthHardeningColumns`
- `1713398400000-AddWebhookNextRetryAt`

## [1.0.0] - 2026-04-16

### Added

**Core Modules**
- Auth module: JWT login/register, refresh token rotation, 2FA (TOTP), OAuth (Google, Facebook), password reset via email
- Users module: CRUD, role-based access (admin/user), profile management, soft delete
- Settings module: Key-value app configuration, public/private settings, Redis cache
- Logs module: Audit logs, access logs, entity change tracking, statistics
- Media module: File upload with Sharp image processing, S3-compatible storage (AWS S3 / Cloudflare R2), folder organization

**E-Commerce Modules**
- Products module: Product CRUD with variants, pricing, SKU, slug generation, featured products
- Categories module: Hierarchical categories, tree structure, drag-and-drop reordering
- Inventory module: Stock tracking, auto-decrement on order, low-stock alerts
- Cart module: Shopping cart, guest-to-user merge on login
- Orders module: Order workflow (pending -> confirmed -> processing -> shipped -> delivered), order number generation
- Payments module: Payment processing, gateway callbacks, refund support
- Reviews module: Product reviews with rating, moderation (approve/reject), admin reply
- Promotions module: Discount codes, percentage/fixed/free-shipping types, validation rules

**CMS Modules**
- Articles module: Blog posts with publish/draft workflow, categories, tags, cover images
- Pages module: Static pages, WYSIWYG content, homepage configuration
- Navigation module: Dynamic menus with nested items, location-based (header/footer/sidebar)
- SEO module: Auto-generated sitemap.xml, robots.txt, per-page meta tags

**Advanced Modules**
- Notifications module: Real-time via WebSocket (Socket.IO), in-app notification center
- Analytics module: Page view tracking, custom events, dashboard stats, revenue analytics, device breakdown
- Search module: Full-text search across products, articles, pages, FAQ
- Export/Import module: Excel (XLSX) and CSV export/import for all data entities
- i18n module: Multi-language translation management, export/import translations
- Contacts module: Public contact form, admin management with status tracking
- FAQ module: FAQ CRUD with categories, helpfulness voting, manual reordering

**SaaS Modules**
- Tenants module: Multi-tenant organization management with data isolation
- Plans module: Subscription plans with feature limits, usage tracking
- API Keys module: API key generation with scoped access control
- Webhooks module: Webhook registration, event-driven delivery with retry (3 attempts, exponential backoff)
- Email Templates module: Template CRUD with Handlebars rendering, preview, seed defaults

**Infrastructure**
- BaseEntity with ULID primary keys, timestamps, soft delete
- Global JWT auth guard with `@Public()` decorator
- Role-based access with `@Roles()` decorator
- Response transform interceptor (unified `{ data, meta }` format)
- Request logging interceptor
- Global exception filter with Vietnamese error messages
- Custom validation pipe with class-validator
- Docker Compose for development (MySQL 8 + Redis 7)
- TypeORM migrations and seed system

**Frontend**
- Next.js 14 with App Router and standalone output
- Tailwind CSS styling with Radix UI components
- Public pages: landing, products, blog, cart, checkout, contact, FAQ, search
- Auth pages: login, register, forgot-password, reset-password, 2FA verification
- User dashboard: orders, profile, settings, wishlist
- Admin panel: products, categories, orders, articles, pages, navigation, settings, analytics, and more
- Zustand state management
- React Hook Form + Zod validation
- Recharts for analytics charts
- Socket.IO client for real-time notifications

**Deployment**
- Multi-stage Docker builds for backend and frontend
- Production docker-compose with nginx reverse proxy
- Nginx configuration with SSL support, gzip, caching, rate limiting
- Deploy script with dev/staging/prod modes
- Backup script with rotation
- Migration and seed scripts
- Developer setup script
