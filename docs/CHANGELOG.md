# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
