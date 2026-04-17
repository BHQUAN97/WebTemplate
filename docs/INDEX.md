# WebTemplate — File Index & Project Map

Toan bo file trong project, phan loai theo chuc nang. Tong cong ~190 files (khong tinh node_modules, .git, package-lock.json).

---

## Root Config (6 files)

- `.env.example` — Template bien moi truong (DB, Redis, JWT, S3, Email, OAuth, 2FA)
- `.gitignore` — Git ignore rules
- `CLAUDE.md` — Project rules cho Claude Code (stack, conventions, modules)
- `README.md` — Project README
- `deploy.sh` — Deploy script: dev/staging/prod/shared modes
- `docker-compose.yml` — Dev infrastructure: MySQL 8 (6002) + Redis 7 (6003)

## Docker Compose (3 files)

- `docker-compose.prod.yml` — Production stack: MySQL + Redis + Backend + Frontend + Nginx (5 services, healthchecks, volumes)
- `docker-compose.shared-vps.yml` — Shared VPS: chi Backend + Frontend, dung shared-net external network
- `docker-compose.shared-infra.yml` — Shared infrastructure: MySQL + Redis + Nginx + Certbot cho nhieu project

## Scripts (6 files)

- `scripts/setup-dev.sh` — One-command dev setup: check deps, copy .env, install, start DB, migrate, seed
- `scripts/init-first-time.sh` — VPS first-time setup: Docker, user deploy, UFW, fail2ban, swap, Node.js
- `scripts/init-ssl.sh` — SSL setup: certbot ACME challenge, request cert, copy to volume, cron auto-renew
- `scripts/backup.sh` — Backup MySQL dump + uploads, rotate (giu 7 ngay)
- `scripts/migrate.sh` — Migration CLI: run/revert/generate/seed commands
- `scripts/init-databases.sql` — SQL init databases cho shared MySQL (WebTemplate + placeholder cho projects khac)

## Nginx Config (4 files)

- `nginx/nginx.conf` — Default nginx: HTTP, gzip, rate limiting, proxy to frontend/backend, static cache
- `nginx/nginx.prod.conf` — Production nginx: HTTPS + HTTP redirect, SSL (Let's Encrypt), HSTS, security headers
- `nginx/shared-nginx.conf` — Shared VPS main nginx: certbot challenge, include conf.d/*.conf
- `nginx/conf.d/webtemplate.conf` — Per-project server block: upstream, SSL, rate limiting, proxy rules

## Documentation (8 files)

- `docs/API.md` — API endpoints reference
- `docs/ARCHITECTURE.md` — System architecture overview
- `docs/CHANGELOG.md` — Change log
- `docs/DATABASE.md` — Database schema documentation
- `docs/DEPLOY-GUIDE.md` — Step-by-step deployment guide (4 modes)
- `docs/DEPLOYMENT.md` — Deployment overview
- `docs/INDEX.md` — This file: project file index
- `docs/MODULES.md` — Backend modules documentation
- `docs/WORKFLOW.md` — Developer workflow guide

---

## Backend (131 files)

### Config & Setup (10 files)

- `backend/.dockerignore` — Docker ignore (node_modules, dist, tests)
- `backend/.prettierrc` — Prettier config
- `backend/Dockerfile` — Multi-stage build: builder (npm ci + build) -> production (non-root, port 6001)
- `backend/README.md` — Backend README
- `backend/eslint.config.mjs` — ESLint config
- `backend/nest-cli.json` — NestJS CLI config
- `backend/package.json` — Backend dependencies + scripts
- `backend/tsconfig.build.json` — TypeScript build config
- `backend/tsconfig.json` — TypeScript config
- `backend/dist/tsconfig.tsbuildinfo` — Build info cache

### Entry Point (4 files)

- `backend/src/main.ts` — App bootstrap: CORS, Helmet, prefix /api, validation pipe
- `backend/src/app.module.ts` — Root module: imports all modules, global guards/interceptors/pipes
- `backend/src/app.controller.ts` — Root controller (health check)
- `backend/src/app.service.ts` — Root service
- `backend/src/app.controller.spec.ts` — Root controller unit test

### Config (6 files)

- `backend/src/config/index.ts` — Config barrel export
- `backend/src/config/app.config.ts` — App config: name, URL, port, CORS
- `backend/src/config/database.config.ts` — TypeORM MySQL config + DataSource export
- `backend/src/config/jwt.config.ts` — JWT config: access/refresh secrets, expiry
- `backend/src/config/redis.config.ts` — Redis + BullMQ config
- `backend/src/config/storage.config.ts` — S3/R2 storage config

### Common — Base Patterns (20 files)

#### Entities
- `backend/src/common/entities/base.entity.ts` — BaseEntity: ULID primary key, createdAt, updatedAt, deletedAt (soft delete)

#### Services
- `backend/src/common/services/base.service.ts` — Generic BaseService<T>: CRUD, pagination, soft delete, findOne, findAll

#### DTOs
- `backend/src/common/dto/pagination.dto.ts` — PaginationDto: page, limit, sort, order

#### Decorators
- `backend/src/common/decorators/api-paginated.decorator.ts` — Swagger decorator cho paginated response
- `backend/src/common/decorators/current-user.decorator.ts` — @CurrentUser() param decorator
- `backend/src/common/decorators/public.decorator.ts` — @Public() route decorator (skip auth)
- `backend/src/common/decorators/roles.decorator.ts` — @Roles('admin') route decorator

#### Guards
- `backend/src/common/guards/jwt-auth.guard.ts` — JWT authentication guard (global)
- `backend/src/common/guards/roles.guard.ts` — Role-based access guard
- `backend/src/common/guards/tenant.guard.ts` — Multi-tenant isolation guard

#### Interceptors
- `backend/src/common/interceptors/logging.interceptor.ts` — Request/response logging
- `backend/src/common/interceptors/timeout.interceptor.ts` — Request timeout handler
- `backend/src/common/interceptors/transform.interceptor.ts` — Response format standardization

#### Filters
- `backend/src/common/filters/http-exception.filter.ts` — Global exception handler, error format

#### Pipes
- `backend/src/common/pipes/validation.pipe.ts` — DTO validation pipe (class-validator)

#### Logger
- `backend/src/common/logger/app-logger.service.ts` — Custom logger service

#### Utils
- `backend/src/common/utils/date.ts` — Date formatting utilities
- `backend/src/common/utils/hash.ts` — Password hashing (bcrypt)
- `backend/src/common/utils/module-config.ts` — Dynamic module config helper
- `backend/src/common/utils/response.ts` — Standardized API response builder
- `backend/src/common/utils/sanitize.ts` — Input sanitization (XSS prevention)
- `backend/src/common/utils/slug.ts` — URL slug generation (Vietnamese diacritics support)
- `backend/src/common/utils/ulid.ts` — ULID generator

#### Barrel Exports
- `backend/src/common/index.ts` — Common barrel export
- `backend/src/common/interfaces/index.ts` — Common interfaces
- `backend/src/common/constants/index.ts` — App constants

### Database Seeds (1 file)

- `backend/src/database/seeds/admin-seed.ts` — Seed admin user (admin@webtemplate.local / Admin@123)

### Modules — Auth (9 files)

- `backend/src/modules/auth/auth.module.ts` — Auth module: JWT strategy, PassportModule
- `backend/src/modules/auth/auth.controller.ts` — Auth endpoints: login, register, refresh, logout, forgot/reset password
- `backend/src/modules/auth/auth.service.ts` — Auth logic: hash, compare, JWT sign/verify, token rotation
- `backend/src/modules/auth/strategies/jwt.strategy.ts` — Passport JWT strategy
- `backend/src/modules/auth/entities/refresh-token.entity.ts` — RefreshToken entity
- `backend/src/modules/auth/dto/login.dto.ts` — Login DTO (email + password)
- `backend/src/modules/auth/dto/register.dto.ts` — Register DTO (email, password, name)
- `backend/src/modules/auth/dto/change-password.dto.ts` — Change password DTO
- `backend/src/modules/auth/dto/forgot-password.dto.ts` — Forgot password DTO (email)
- `backend/src/modules/auth/dto/reset-password.dto.ts` — Reset password DTO (token + new password)
- `backend/src/modules/auth/dto/refresh-token.dto.ts` — Refresh token DTO
- `backend/src/modules/auth/dto/match.decorator.ts` — Password match validation decorator

### Modules — Users (6 files)

- `backend/src/modules/users/users.module.ts` — Users module
- `backend/src/modules/users/users.controller.ts` — Users CRUD + profile management
- `backend/src/modules/users/users.service.ts` — Users service (extend BaseService)
- `backend/src/modules/users/entities/user.entity.ts` — User entity: email, password, role, avatar, phone, 2FA fields
- `backend/src/modules/users/dto/create-user.dto.ts` — Create user DTO
- `backend/src/modules/users/dto/update-user.dto.ts` — Update user DTO
- `backend/src/modules/users/dto/update-profile.dto.ts` — Update own profile DTO

### Modules — Products (7 files)

- `backend/src/modules/products/products.module.ts` — Products module
- `backend/src/modules/products/products.controller.ts` — Products CRUD + search + filter
- `backend/src/modules/products/products.service.ts` — Products service
- `backend/src/modules/products/entities/product.entity.ts` — Product entity: name, slug, price, description, images, SEO
- `backend/src/modules/products/entities/product-variant.entity.ts` — Product variant entity: size, color, SKU, stock
- `backend/src/modules/products/entities/product-attribute.entity.ts` — Product attribute entity: key-value attributes
- `backend/src/modules/products/dto/create-product.dto.ts` — Create product DTO
- `backend/src/modules/products/dto/update-product.dto.ts` — Update product DTO
- `backend/src/modules/products/dto/query-products.dto.ts` — Query products DTO: filters, sort, pagination

### Modules — Categories (6 files)

- `backend/src/modules/categories/categories.module.ts` — Categories module
- `backend/src/modules/categories/categories.controller.ts` — Categories CRUD
- `backend/src/modules/categories/categories.service.ts` — Categories service (tree structure)
- `backend/src/modules/categories/entities/category.entity.ts` — Category entity: name, slug, parent, image, sort order
- `backend/src/modules/categories/dto/create-category.dto.ts` — Create category DTO
- `backend/src/modules/categories/dto/update-category.dto.ts` — Update category DTO
- `backend/src/modules/categories/dto/query-categories.dto.ts` — Query categories DTO

### Modules — Orders (6 files)

- `backend/src/modules/orders/orders.module.ts` — Orders module
- `backend/src/modules/orders/orders.controller.ts` — Orders CRUD + status management
- `backend/src/modules/orders/orders.service.ts` — Orders service: create, update status, calculate totals
- `backend/src/modules/orders/entities/order.entity.ts` — Order entity: user, status, total, address, notes
- `backend/src/modules/orders/entities/order-item.entity.ts` — Order item entity: product, quantity, price
- `backend/src/modules/orders/dto/create-order.dto.ts` — Create order DTO
- `backend/src/modules/orders/dto/update-order-status.dto.ts` — Update order status DTO
- `backend/src/modules/orders/dto/query-orders.dto.ts` — Query orders DTO

### Modules — Cart (5 files)

- `backend/src/modules/cart/cart.module.ts` — Cart module
- `backend/src/modules/cart/cart.controller.ts` — Cart endpoints: add, update, remove, clear
- `backend/src/modules/cart/cart.service.ts` — Cart service
- `backend/src/modules/cart/entities/cart.entity.ts` — Cart entity: user reference
- `backend/src/modules/cart/entities/cart-item.entity.ts` — Cart item entity: product, variant, quantity
- `backend/src/modules/cart/dto/add-to-cart.dto.ts` — Add to cart DTO
- `backend/src/modules/cart/dto/update-cart-item.dto.ts` — Update cart item DTO

### Modules — Articles (6 files)

- `backend/src/modules/articles/articles.module.ts` — Articles (blog) module
- `backend/src/modules/articles/articles.controller.ts` — Articles CRUD + publish/unpublish
- `backend/src/modules/articles/articles.service.ts` — Articles service
- `backend/src/modules/articles/entities/article.entity.ts` — Article entity: title, slug, content, excerpt, featured image, author
- `backend/src/modules/articles/dto/create-article.dto.ts` — Create article DTO
- `backend/src/modules/articles/dto/update-article.dto.ts` — Update article DTO
- `backend/src/modules/articles/dto/query-articles.dto.ts` — Query articles DTO

### Modules — Reviews (5 files)

- `backend/src/modules/reviews/reviews.module.ts` — Reviews module
- `backend/src/modules/reviews/reviews.controller.ts` — Reviews CRUD
- `backend/src/modules/reviews/reviews.service.ts` — Reviews service
- `backend/src/modules/reviews/entities/review.entity.ts` — Review entity: user, product, rating, comment
- `backend/src/modules/reviews/dto/create-review.dto.ts` — Create review DTO
- `backend/src/modules/reviews/dto/query-reviews.dto.ts` — Query reviews DTO

### Modules — Promotions (6 files)

- `backend/src/modules/promotions/promotions.module.ts` — Promotions/coupons module
- `backend/src/modules/promotions/promotions.controller.ts` — Promotions CRUD + validate coupon
- `backend/src/modules/promotions/promotions.service.ts` — Promotions service
- `backend/src/modules/promotions/entities/promotion.entity.ts` — Promotion entity: code, discount type/value, validity period
- `backend/src/modules/promotions/entities/promotion-usage.entity.ts` — Promotion usage tracking entity
- `backend/src/modules/promotions/dto/create-promotion.dto.ts` — Create promotion DTO
- `backend/src/modules/promotions/dto/update-promotion.dto.ts` — Update promotion DTO
- `backend/src/modules/promotions/dto/query-promotions.dto.ts` — Query promotions DTO

### Modules — Inventory (4 files)

- `backend/src/modules/inventory/inventory.module.ts` — Inventory module
- `backend/src/modules/inventory/inventory.controller.ts` — Inventory endpoints: check stock, adjust
- `backend/src/modules/inventory/inventory.service.ts` — Inventory service
- `backend/src/modules/inventory/entities/inventory.entity.ts` — Inventory entity: product/variant, quantity, warehouse
- `backend/src/modules/inventory/entities/inventory-movement.entity.ts` — Inventory movement: in/out/adjust history
- `backend/src/modules/inventory/dto/adjust-inventory.dto.ts` — Adjust inventory DTO

### Modules — Payments (5 files)

- `backend/src/modules/payments/payments.module.ts` — Payments module
- `backend/src/modules/payments/payments.controller.ts` — Payment endpoints: create, callback, status
- `backend/src/modules/payments/payments.service.ts` — Payments service (VNPay integration placeholder)
- `backend/src/modules/payments/entities/payment.entity.ts` — Payment entity: order, method, status, amount, transaction ID
- `backend/src/modules/payments/dto/create-payment.dto.ts` — Create payment DTO
- `backend/src/modules/payments/dto/payment-callback.dto.ts` — Payment gateway callback DTO

### Modules — Media (5 files)

- `backend/src/modules/media/media.module.ts` — Media/file upload module
- `backend/src/modules/media/media.controller.ts` — Upload, list, delete files
- `backend/src/modules/media/media.service.ts` — Media service: upload to S3/local, Sharp resize
- `backend/src/modules/media/entities/media.entity.ts` — Media entity: filename, URL, mime type, size, dimensions
- `backend/src/modules/media/dto/upload-media.dto.ts` — Upload media DTO
- `backend/src/modules/media/dto/query-media.dto.ts` — Query media DTO

### Modules — Pages (5 files)

- `backend/src/modules/pages/pages.module.ts` — CMS pages module
- `backend/src/modules/pages/pages.controller.ts` — Pages CRUD
- `backend/src/modules/pages/pages.service.ts` — Pages service
- `backend/src/modules/pages/entities/page.entity.ts` — Page entity: title, slug, content, SEO metadata
- `backend/src/modules/pages/dto/create-page.dto.ts` — Create page DTO
- `backend/src/modules/pages/dto/update-page.dto.ts` — Update page DTO

### Modules — Contacts (6 files)

- `backend/src/modules/contacts/contacts.module.ts` — Contact form module
- `backend/src/modules/contacts/contacts.controller.ts` — Contacts: submit (public) + list/reply (admin)
- `backend/src/modules/contacts/contacts.service.ts` — Contacts service
- `backend/src/modules/contacts/entities/contact.entity.ts` — Contact entity: name, email, phone, message, status
- `backend/src/modules/contacts/dto/create-contact.dto.ts` — Create contact DTO (public form)
- `backend/src/modules/contacts/dto/update-contact.dto.ts` — Update contact DTO (admin reply)
- `backend/src/modules/contacts/dto/query-contacts.dto.ts` — Query contacts DTO

### Modules — FAQ (5 files)

- `backend/src/modules/faq/faq.module.ts` — FAQ module
- `backend/src/modules/faq/faq.controller.ts` — FAQ CRUD
- `backend/src/modules/faq/faq.service.ts` — FAQ service
- `backend/src/modules/faq/entities/faq.entity.ts` — FAQ entity: question, answer, category, sort order
- `backend/src/modules/faq/dto/create-faq.dto.ts` — Create FAQ DTO
- `backend/src/modules/faq/dto/update-faq.dto.ts` — Update FAQ DTO

### Modules — Settings (5 files)

- `backend/src/modules/settings/settings.module.ts` — App settings module (KHONG duoc xoa)
- `backend/src/modules/settings/settings.controller.ts` — Settings CRUD (admin only)
- `backend/src/modules/settings/settings.service.ts` — Settings service: key-value config
- `backend/src/modules/settings/entities/setting.entity.ts` — Setting entity: key, value, type, group
- `backend/src/modules/settings/dto/create-setting.dto.ts` — Create setting DTO
- `backend/src/modules/settings/dto/update-setting.dto.ts` — Update setting DTO

### Modules — Logs (5 files)

- `backend/src/modules/logs/logs.module.ts` — Audit logging module (KHONG duoc xoa)
- `backend/src/modules/logs/logs.controller.ts` — Logs: list, filter, export
- `backend/src/modules/logs/logs.service.ts` — Logs service
- `backend/src/modules/logs/entities/audit-log.entity.ts` — Audit log: user, action, entity, old/new values
- `backend/src/modules/logs/entities/access-log.entity.ts` — Access log: IP, user agent, endpoint, response time
- `backend/src/modules/logs/entities/changelog.entity.ts` — Changelog: version, changes, date
- `backend/src/modules/logs/dto/query-logs.dto.ts` — Query logs DTO

### Modules — Analytics (5 files)

- `backend/src/modules/analytics/analytics.module.ts` — Analytics module
- `backend/src/modules/analytics/analytics.controller.ts` — Analytics: dashboard data, track events
- `backend/src/modules/analytics/analytics.service.ts` — Analytics service: aggregate, report
- `backend/src/modules/analytics/entities/page-view.entity.ts` — Page view entity: URL, referrer, user agent
- `backend/src/modules/analytics/entities/event.entity.ts` — Event entity: name, properties, user
- `backend/src/modules/analytics/dto/query-analytics.dto.ts` — Query analytics DTO (date range)
- `backend/src/modules/analytics/dto/track-event.dto.ts` — Track event DTO
- `backend/src/modules/analytics/dto/track-pageview.dto.ts` — Track pageview DTO

### Modules — Navigation (5 files)

- `backend/src/modules/navigation/navigation.module.ts` — Navigation/menu module
- `backend/src/modules/navigation/navigation.controller.ts` — Navigation CRUD
- `backend/src/modules/navigation/navigation.service.ts` — Navigation service (tree structure)
- `backend/src/modules/navigation/entities/navigation.entity.ts` — Navigation entity: name, position (header/footer/sidebar)
- `backend/src/modules/navigation/entities/navigation-item.entity.ts` — Navigation item: label, URL, icon, parent, sort
- `backend/src/modules/navigation/dto/create-navigation.dto.ts` — Create navigation DTO
- `backend/src/modules/navigation/dto/update-navigation.dto.ts` — Update navigation DTO

### Modules — Notifications (5 files)

- `backend/src/modules/notifications/notifications.module.ts` — Notifications module
- `backend/src/modules/notifications/notifications.controller.ts` — Notifications: list, mark read, delete
- `backend/src/modules/notifications/notifications.service.ts` — Notifications service (+ WebSocket ready)
- `backend/src/modules/notifications/entities/notification.entity.ts` — Notification entity: user, type, title, data, read status
- `backend/src/modules/notifications/dto/create-notification.dto.ts` — Create notification DTO
- `backend/src/modules/notifications/dto/query-notifications.dto.ts` — Query notifications DTO

### Modules — Email Templates (5 files)

- `backend/src/modules/email-templates/email-templates.module.ts` — Email template module
- `backend/src/modules/email-templates/email-templates.controller.ts` — Templates CRUD + preview + send
- `backend/src/modules/email-templates/email-templates.service.ts` — Email service: Handlebars compile, Resend send
- `backend/src/modules/email-templates/entities/email-template.entity.ts` — Email template entity: name, subject, body (Handlebars), variables
- `backend/src/modules/email-templates/dto/create-email-template.dto.ts` — Create email template DTO
- `backend/src/modules/email-templates/dto/update-email-template.dto.ts` — Update email template DTO
- `backend/src/modules/email-templates/dto/preview-email.dto.ts` — Preview email DTO
- `backend/src/modules/email-templates/dto/send-email.dto.ts` — Send email DTO

### Modules — Plans (6 files)

- `backend/src/modules/plans/plans.module.ts` — Subscription plans module
- `backend/src/modules/plans/plans.controller.ts` — Plans CRUD + subscribe/cancel
- `backend/src/modules/plans/plans.service.ts` — Plans service
- `backend/src/modules/plans/entities/plan.entity.ts` — Plan entity: name, price, features, limits
- `backend/src/modules/plans/entities/subscription.entity.ts` — Subscription entity: user, plan, start/end dates, status
- `backend/src/modules/plans/entities/usage.entity.ts` — Usage tracking entity: resource, count, period
- `backend/src/modules/plans/dto/create-plan.dto.ts` — Create plan DTO
- `backend/src/modules/plans/dto/update-plan.dto.ts` — Update plan DTO
- `backend/src/modules/plans/dto/subscribe.dto.ts` — Subscribe DTO

### Modules — Export/Import (4 files)

- `backend/src/modules/export-import/export-import.module.ts` — Export/Import module (Excel/CSV)
- `backend/src/modules/export-import/export-import.controller.ts` — Export/Import endpoints
- `backend/src/modules/export-import/export-import.service.ts` — Export/Import service
- `backend/src/modules/export-import/dto/export.dto.ts` — Export config DTO (format, columns, filters)
- `backend/src/modules/export-import/dto/import.dto.ts` — Import config DTO

### Modules — Search (3 files)

- `backend/src/modules/search/search.module.ts` — Global search module
- `backend/src/modules/search/search.controller.ts` — Search endpoint: multi-entity search
- `backend/src/modules/search/search.service.ts` — Search service: full-text search across entities
- `backend/src/modules/search/dto/search.dto.ts` — Search DTO: query, entity filter, pagination

### Modules — SEO (3 files)

- `backend/src/modules/seo/seo.module.ts` — SEO module
- `backend/src/modules/seo/seo.controller.ts` — SEO endpoints: sitemap, robots.txt, meta tags
- `backend/src/modules/seo/seo.service.ts` — SEO service: generate sitemap, structured data

### Modules — API Keys (4 files)

- `backend/src/modules/api-keys/api-keys.module.ts` — API keys module
- `backend/src/modules/api-keys/api-keys.controller.ts` — API keys CRUD: create, list, revoke
- `backend/src/modules/api-keys/api-keys.service.ts` — API keys service: generate, validate, rate limit
- `backend/src/modules/api-keys/entities/api-key.entity.ts` — API key entity: key hash, name, permissions, expires
- `backend/src/modules/api-keys/dto/create-api-key.dto.ts` — Create API key DTO

### Modules — Tenants (5 files)

- `backend/src/modules/tenants/tenants.module.ts` — Multi-tenant module
- `backend/src/modules/tenants/tenants.controller.ts` — Tenants CRUD
- `backend/src/modules/tenants/tenants.service.ts` — Tenants service
- `backend/src/modules/tenants/entities/tenant.entity.ts` — Tenant entity: name, slug, config, status
- `backend/src/modules/tenants/dto/create-tenant.dto.ts` — Create tenant DTO
- `backend/src/modules/tenants/dto/update-tenant.dto.ts` — Update tenant DTO

### Modules — Webhooks (5 files)

- `backend/src/modules/webhooks/webhooks.module.ts` — Webhooks module
- `backend/src/modules/webhooks/webhooks.controller.ts` — Webhooks CRUD: register, test, list deliveries
- `backend/src/modules/webhooks/webhooks.service.ts` — Webhooks service: dispatch, retry, sign payload
- `backend/src/modules/webhooks/entities/webhook.entity.ts` — Webhook entity: URL, events, secret, active
- `backend/src/modules/webhooks/entities/webhook-delivery.entity.ts` — Webhook delivery log: payload, response, status
- `backend/src/modules/webhooks/dto/create-webhook.dto.ts` — Create webhook DTO
- `backend/src/modules/webhooks/dto/update-webhook.dto.ts` — Update webhook DTO

### Modules — i18n (5 files)

- `backend/src/modules/i18n/i18n.module.ts` — Internationalization module
- `backend/src/modules/i18n/i18n.controller.ts` — i18n: get translations, bulk update
- `backend/src/modules/i18n/i18n.service.ts` — i18n service: translation management
- `backend/src/modules/i18n/entities/locale.entity.ts` — Locale entity: code (vi, en), name, default flag
- `backend/src/modules/i18n/entities/translation.entity.ts` — Translation entity: locale, key, value, namespace
- `backend/src/modules/i18n/dto/create-translation.dto.ts` — Create translation DTO
- `backend/src/modules/i18n/dto/bulk-translations.dto.ts` — Bulk import/export translations DTO

### Backend Tests (6 files)

- `backend/test/setup.ts` — Test setup: create testing module, DB connection
- `backend/test/jest-e2e.json` — Jest E2E config
- `backend/test/app.e2e-spec.ts` — App health check E2E test
- `backend/test/auth.e2e-spec.ts` — Auth flow E2E: login, register, refresh, logout
- `backend/test/users.e2e-spec.ts` — Users CRUD E2E tests
- `backend/test/products.e2e-spec.ts` — Products CRUD E2E tests
- `backend/test/orders.e2e-spec.ts` — Orders flow E2E tests

---

## Frontend (96 files)

### Config & Setup (12 files)

- `frontend/.dockerignore` — Docker ignore
- `frontend/.gitignore` — Git ignore
- `frontend/AGENTS.md` — Agent instructions: read Next.js docs before writing code
- `frontend/CLAUDE.md` — Points to AGENTS.md
- `frontend/Dockerfile` — 3-stage build: deps -> builder -> runner (standalone, non-root, port 6000)
- `frontend/README.md` — Frontend README
- `frontend/eslint.config.mjs` — ESLint config
- `frontend/next.config.ts` — Next.js 14 config (standalone output)
- `frontend/next-env.d.ts` — Next.js TypeScript declarations
- `frontend/package.json` — Frontend dependencies + scripts
- `frontend/playwright.config.ts` — Playwright E2E test config
- `frontend/postcss.config.mjs` — PostCSS config (Tailwind CSS)
- `frontend/tsconfig.json` — TypeScript config
- `frontend/tsconfig.tsbuildinfo` — Build info cache

### App — Root (4 files)

- `frontend/src/app/layout.tsx` — Root layout: providers, fonts, global styles
- `frontend/src/app/page.tsx` — Root page (redirect to public)
- `frontend/src/app/globals.css` — Global CSS + Tailwind imports
- `frontend/src/app/favicon.ico` — Site favicon
- `frontend/src/env.d.ts` — Environment variable types

### App — Auth Pages (6 files)

- `frontend/src/app/(auth)/layout.tsx` — Auth layout: centered card
- `frontend/src/app/(auth)/login/page.tsx` — Login page
- `frontend/src/app/(auth)/register/page.tsx` — Register page
- `frontend/src/app/(auth)/forgot-password/page.tsx` — Forgot password page
- `frontend/src/app/(auth)/reset-password/page.tsx` — Reset password page
- `frontend/src/app/(auth)/verify-2fa/page.tsx` — 2FA verification page

### App — Public Pages (18 files)

- `frontend/src/app/(public)/layout.tsx` — Public layout: header + footer
- `frontend/src/app/(public)/page.tsx` — Landing/home page (server component)
- `frontend/src/app/(public)/landing-client.tsx` — Landing page client component
- `frontend/src/app/(public)/about/page.tsx` — About page
- `frontend/src/app/(public)/blog/page.tsx` — Blog listing page
- `frontend/src/app/(public)/blog/blog-client.tsx` — Blog listing client component
- `frontend/src/app/(public)/blog/[slug]/page.tsx` — Blog post page
- `frontend/src/app/(public)/blog/[slug]/blog-post-client.tsx` — Blog post client component
- `frontend/src/app/(public)/products/page.tsx` — Products listing page
- `frontend/src/app/(public)/products/products-client.tsx` — Products listing client component
- `frontend/src/app/(public)/products/[slug]/page.tsx` — Product detail page
- `frontend/src/app/(public)/products/[slug]/product-detail-client.tsx` — Product detail client component
- `frontend/src/app/(public)/cart/page.tsx` — Cart page
- `frontend/src/app/(public)/cart/cart-client.tsx` — Cart client component
- `frontend/src/app/(public)/checkout/page.tsx` — Checkout page
- `frontend/src/app/(public)/checkout/checkout-client.tsx` — Checkout client component
- `frontend/src/app/(public)/contact/page.tsx` — Contact page
- `frontend/src/app/(public)/contact/contact-client.tsx` — Contact form client component
- `frontend/src/app/(public)/faq/page.tsx` — FAQ page
- `frontend/src/app/(public)/faq/faq-client.tsx` — FAQ client component
- `frontend/src/app/(public)/search/page.tsx` — Search results page
- `frontend/src/app/(public)/search/search-client.tsx` — Search client component
- `frontend/src/app/(public)/[slug]/page.tsx` — Dynamic CMS page (catch-all slug)
- `frontend/src/app/(public)/[slug]/cms-page-client.tsx` — CMS page client component

### App — Dashboard Pages (User) (6 files)

- `frontend/src/app/(dashboard)/layout.tsx` — Dashboard layout: sidebar + header
- `frontend/src/app/(dashboard)/page.tsx` — Dashboard home (user overview)
- `frontend/src/app/(dashboard)/profile/page.tsx` — User profile page
- `frontend/src/app/(dashboard)/settings/page.tsx` — User settings page
- `frontend/src/app/(dashboard)/orders/page.tsx` — User orders list
- `frontend/src/app/(dashboard)/orders/[id]/page.tsx` — User order detail
- `frontend/src/app/(dashboard)/wishlist/page.tsx` — User wishlist

### App — Admin Pages (16 files)

- `frontend/src/app/admin/layout.tsx` — Admin layout: sidebar + topbar
- `frontend/src/app/admin/page.tsx` — Admin dashboard: stats, charts, recent activity
- `frontend/src/app/admin/products/page.tsx` — Admin products list
- `frontend/src/app/admin/products/new/page.tsx` — Admin create product
- `frontend/src/app/admin/products/[id]/page.tsx` — Admin edit product
- `frontend/src/app/admin/categories/page.tsx` — Admin categories management
- `frontend/src/app/admin/orders/page.tsx` — Admin orders list
- `frontend/src/app/admin/orders/[id]/page.tsx` — Admin order detail + status management
- `frontend/src/app/admin/articles/page.tsx` — Admin articles list
- `frontend/src/app/admin/articles/new/page.tsx` — Admin create article
- `frontend/src/app/admin/articles/[id]/page.tsx` — Admin edit article
- `frontend/src/app/admin/customers/page.tsx` — Admin customers/users management
- `frontend/src/app/admin/media/page.tsx` — Admin media library
- `frontend/src/app/admin/promotions/page.tsx` — Admin promotions/coupons
- `frontend/src/app/admin/plans/page.tsx` — Admin subscription plans
- `frontend/src/app/admin/logs/page.tsx` — Admin audit logs viewer
- `frontend/src/app/admin/analytics/page.tsx` — Admin analytics dashboard
- `frontend/src/app/admin/reports/page.tsx` — Admin reports (sales, revenue)
- `frontend/src/app/admin/settings/page.tsx` — Admin app settings

### Components — Admin (2 files)

- `frontend/src/components/admin/sidebar.tsx` — Admin sidebar navigation
- `frontend/src/components/admin/topbar.tsx` — Admin top bar: search, notifications, user menu

### Components — Public (2 files)

- `frontend/src/components/public/header.tsx` — Public site header: nav, cart, auth
- `frontend/src/components/public/footer.tsx` — Public site footer: links, social, copyright

### Components — Shared (16 files)

- `frontend/src/components/shared/confirm-dialog.tsx` — Confirmation dialog (delete, etc.)
- `frontend/src/components/shared/data-table.tsx` — Reusable data table: sort, filter, pagination
- `frontend/src/components/shared/date-range-picker.tsx` — Date range picker component
- `frontend/src/components/shared/empty-state.tsx` — Empty state illustration + message
- `frontend/src/components/shared/error-boundary.tsx` — React error boundary
- `frontend/src/components/shared/export-button.tsx` — Export to Excel/CSV button
- `frontend/src/components/shared/footer.tsx` — Shared footer variant
- `frontend/src/components/shared/form-field.tsx` — Form field wrapper: label, input, error
- `frontend/src/components/shared/header.tsx` — Shared header variant
- `frontend/src/components/shared/image-upload.tsx` — Image upload with preview + crop
- `frontend/src/components/shared/loading-spinner.tsx` — Loading spinner/skeleton
- `frontend/src/components/shared/page-header.tsx` — Page header: title, breadcrumb, actions
- `frontend/src/components/shared/pagination.tsx` — Pagination component
- `frontend/src/components/shared/print-button.tsx` — Print button (admin reports)
- `frontend/src/components/shared/product-card.tsx` — Product card: image, name, price, rating
- `frontend/src/components/shared/rich-text-editor.tsx` — Rich text editor (articles, pages)
- `frontend/src/components/shared/search-input.tsx` — Search input with debounce
- `frontend/src/components/shared/star-rating.tsx` — Star rating display/input
- `frontend/src/components/shared/stat-card.tsx` — Stat card: value, label, trend
- `frontend/src/components/shared/status-badge.tsx` — Status badge: color-coded labels

### Components — UI (Radix primitives) (18 files)

- `frontend/src/components/ui/avatar.tsx` — Avatar component (Radix)
- `frontend/src/components/ui/badge.tsx` — Badge component
- `frontend/src/components/ui/button.tsx` — Button component (variants: primary, secondary, destructive, ghost)
- `frontend/src/components/ui/card.tsx` — Card component
- `frontend/src/components/ui/checkbox.tsx` — Checkbox component (Radix)
- `frontend/src/components/ui/dialog.tsx` — Dialog/modal component (Radix)
- `frontend/src/components/ui/dropdown-menu.tsx` — Dropdown menu component (Radix)
- `frontend/src/components/ui/input.tsx` — Input component
- `frontend/src/components/ui/label.tsx` — Label component (Radix)
- `frontend/src/components/ui/popover.tsx` — Popover component (Radix)
- `frontend/src/components/ui/select.tsx` — Select component (Radix)
- `frontend/src/components/ui/separator.tsx` — Separator component (Radix)
- `frontend/src/components/ui/skeleton.tsx` — Skeleton loading component
- `frontend/src/components/ui/switch.tsx` — Switch/toggle component (Radix)
- `frontend/src/components/ui/table.tsx` — Table component
- `frontend/src/components/ui/tabs.tsx` — Tabs component (Radix)
- `frontend/src/components/ui/textarea.tsx` — Textarea component
- `frontend/src/components/ui/toast.tsx` — Toast notification component
- `frontend/src/components/ui/tooltip.tsx` — Tooltip component (Radix)

### Lib — API Client (18 files)

- `frontend/src/lib/api/client.ts` — Base API client: axios instance, interceptors, token refresh
- `frontend/src/lib/api/modules/analytics.api.ts` — Analytics API: dashboard data, track events
- `frontend/src/lib/api/modules/articles.api.ts` — Articles API: CRUD, publish
- `frontend/src/lib/api/modules/auth.api.ts` — Auth API: login, register, refresh, forgot/reset password
- `frontend/src/lib/api/modules/cart.api.ts` — Cart API: add, update, remove, checkout
- `frontend/src/lib/api/modules/categories.api.ts` — Categories API: CRUD, tree
- `frontend/src/lib/api/modules/contacts.api.ts` — Contacts API: submit form
- `frontend/src/lib/api/modules/faq.api.ts` — FAQ API: list FAQs
- `frontend/src/lib/api/modules/media.api.ts` — Media API: upload, list, delete
- `frontend/src/lib/api/modules/notifications.api.ts` — Notifications API: list, mark read
- `frontend/src/lib/api/modules/orders.api.ts` — Orders API: create, list, detail, cancel
- `frontend/src/lib/api/modules/pages.api.ts` — Pages API: get CMS page by slug
- `frontend/src/lib/api/modules/products.api.ts` — Products API: list, detail, search, filter
- `frontend/src/lib/api/modules/reports.api.ts` — Reports API: sales, revenue, top products
- `frontend/src/lib/api/modules/reviews.api.ts` — Reviews API: create, list by product
- `frontend/src/lib/api/modules/search.api.ts` — Search API: global search
- `frontend/src/lib/api/modules/settings.api.ts` — Settings API: get/update app settings
- `frontend/src/lib/api/modules/users.api.ts` — Users API: CRUD, profile

### Lib — Hooks (8 files)

- `frontend/src/lib/hooks/index.ts` — Hooks barrel export
- `frontend/src/lib/hooks/use-api.ts` — useApi: generic data fetching hook (SWR-like)
- `frontend/src/lib/hooks/use-debounce.ts` — useDebounce: debounce value changes
- `frontend/src/lib/hooks/use-form-validation.ts` — useFormValidation: React Hook Form + Zod integration
- `frontend/src/lib/hooks/use-media-query.ts` — useMediaQuery: responsive breakpoint detection
- `frontend/src/lib/hooks/use-pagination.ts` — usePagination: pagination state management
- `frontend/src/lib/hooks/use-socket.ts` — useSocket: Socket.IO connection hook
- `frontend/src/lib/hooks/use-toast.ts` — useToast: toast notification hook

### Lib — Stores (Zustand) (8 files)

- `frontend/src/lib/stores/index.ts` — Stores barrel export
- `frontend/src/lib/stores/auth-store.ts` — Auth store: user, tokens, login/logout
- `frontend/src/lib/stores/auth.store.ts` — Auth store (alternate naming)
- `frontend/src/lib/stores/cart-store.ts` — Cart store: items, add/remove/update
- `frontend/src/lib/stores/cart.store.ts` — Cart store (alternate naming)
- `frontend/src/lib/stores/admin.ts` — Admin store: sidebar state, current section
- `frontend/src/lib/stores/notification.store.ts` — Notification store: unread count, list
- `frontend/src/lib/stores/ui.store.ts` — UI store: theme, sidebar collapsed, modals
- `frontend/src/lib/stores/wishlist-store.ts` — Wishlist store: add/remove products

### Lib — Validations (Zod) (9 files)

- `frontend/src/lib/validations/index.ts` — Validations barrel export
- `frontend/src/lib/validations/auth.schema.ts` — Auth schemas: login, register, forgot/reset password
- `frontend/src/lib/validations/article.schema.ts` — Article schema: title, content, slug
- `frontend/src/lib/validations/category.schema.ts` — Category schema: name, slug, parent
- `frontend/src/lib/validations/contact.schema.ts` — Contact schema: name, email, phone, message
- `frontend/src/lib/validations/order.schema.ts` — Order schema: items, address, payment
- `frontend/src/lib/validations/product.schema.ts` — Product schema: name, price, description, variants
- `frontend/src/lib/validations/settings.schema.ts` — Settings schema: key-value pairs
- `frontend/src/lib/validations/user.schema.ts` — User schema: email, name, phone, role

### Lib — Types (1 file)

- `frontend/src/lib/types/index.ts` — TypeScript interfaces: User, Product, Order, Category, Article, etc.

### Lib — Utils (3 files)

- `frontend/src/lib/cn.ts` — cn() utility: Tailwind class merge (clsx + tailwind-merge)
- `frontend/src/lib/utils.ts` — General utilities
- `frontend/src/lib/utils/format.ts` — Format utilities: currency, date, phone

### Lib — Other (1 file)

- `frontend/src/proxy.ts` — API proxy config (dev)

### Public Assets (5 files)

- `frontend/public/file.svg` — File icon
- `frontend/public/globe.svg` — Globe icon
- `frontend/public/next.svg` — Next.js logo
- `frontend/public/vercel.svg` — Vercel logo
- `frontend/public/window.svg` — Window icon

### Frontend E2E Tests (4 files)

- `frontend/e2e/setup.ts` — Playwright test setup
- `frontend/e2e/auth.spec.ts` — Auth E2E: login, register flow
- `frontend/e2e/admin.spec.ts` — Admin E2E: navigation, CRUD operations
- `frontend/e2e/public.spec.ts` — Public pages E2E: home, products, blog

---

## Module Summary (29 backend modules)

| # | Module | Files | Mo ta |
|---|--------|-------|-------|
| 1 | auth | 12 | JWT authentication, login, register, password reset |
| 2 | users | 7 | User management, profile |
| 3 | products | 9 | Products, variants, attributes |
| 4 | categories | 7 | Category tree |
| 5 | orders | 8 | Order management, status |
| 6 | cart | 7 | Shopping cart |
| 7 | articles | 7 | Blog/CMS articles |
| 8 | reviews | 6 | Product reviews, ratings |
| 9 | promotions | 8 | Coupons, discounts |
| 10 | inventory | 6 | Stock management |
| 11 | payments | 6 | Payment gateway (VNPay) |
| 12 | media | 6 | File upload, S3/R2 |
| 13 | pages | 6 | CMS pages |
| 14 | contacts | 7 | Contact form |
| 15 | faq | 6 | FAQ management |
| 16 | settings | 6 | App configuration |
| 17 | logs | 7 | Audit logs, access logs |
| 18 | analytics | 8 | Page views, events, reports |
| 19 | navigation | 7 | Menu management |
| 20 | notifications | 6 | User notifications |
| 21 | email-templates | 8 | Email template management, Resend |
| 22 | plans | 9 | Subscription plans, usage |
| 23 | export-import | 5 | Excel/CSV export/import |
| 24 | search | 4 | Global search |
| 25 | seo | 3 | Sitemap, robots.txt, meta |
| 26 | api-keys | 5 | API key management |
| 27 | tenants | 6 | Multi-tenancy |
| 28 | webhooks | 7 | Webhook dispatch |
| 29 | i18n | 7 | Internationalization |

**Required modules (KHONG duoc xoa):** Auth, Users, Settings, Logs

---

## Port Map

| Port | Service | Ghi chu |
|------|---------|---------|
| 6000 | Frontend (Next.js) | Public |
| 6001 | Backend API (NestJS) | /api prefix |
| 6002 | MySQL 8 | Internal 3306 |
| 6003 | Redis 7 | Internal 6379 |
| 80 | Nginx HTTP | Production |
| 443 | Nginx HTTPS | Production |
