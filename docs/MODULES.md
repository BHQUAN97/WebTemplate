# Modules Reference

WebTemplate consists of 29 feature modules organized into 5 categories. Each module is self-contained with its own controller, service, entities, and DTOs.

## Module Overview

| # | Module | Category | Required | Description |
|---|--------|----------|----------|-------------|
| 1 | Auth | Core | Yes | Authentication and authorization |
| 2 | Users | Core | Yes | User management |
| 3 | Settings | Core | Yes | App configuration |
| 4 | Logs | Core | Yes | Audit and access logging |
| 5 | Media | Core | No | File upload and management |
| 6 | Products | E-Commerce | No | Product catalog |
| 7 | Categories | E-Commerce | No | Product categorization |
| 8 | Inventory | E-Commerce | No | Stock tracking |
| 9 | Cart | E-Commerce | No | Shopping cart |
| 10 | Orders | E-Commerce | No | Order management |
| 11 | Payments | E-Commerce | No | Payment processing |
| 12 | Reviews | E-Commerce | No | Product reviews |
| 13 | Promotions | E-Commerce | No | Discount codes |
| 14 | Articles | CMS | No | Blog/news |
| 15 | Pages | CMS | No | Static pages |
| 16 | Navigation | CMS | No | Dynamic menus |
| 17 | SEO | CMS | No | Search engine optimization |
| 18 | Notifications | Advanced | No | Real-time notifications |
| 19 | Analytics | Advanced | No | Traffic and revenue analytics |
| 20 | Search | Advanced | No | Full-text search |
| 21 | Export/Import | Advanced | No | Data export/import |
| 22 | i18n | Advanced | No | Internationalization |
| 23 | Contacts | Advanced | No | Contact form |
| 24 | FAQ | Advanced | No | FAQ management |
| 25 | Tenants | SaaS | No | Multi-tenancy |
| 26 | Plans | SaaS | No | Subscription plans |
| 27 | API Keys | SaaS | No | API key management |
| 28 | Webhooks | SaaS | No | Webhook management |
| 29 | Email Templates | SaaS | No | Email template CRUD |

---

## Core Modules

### 1. Auth

Authentication and authorization with JWT, refresh tokens, 2FA, and OAuth.

- **Required**: Yes (cannot disable)
- **Dependencies**: Users
- **Entities**: `RefreshTokenEntity`
- **API Endpoints**: 7 (register, login, refresh, logout, change-password, forgot-password, reset-password)
- **Configuration**:
  - `JWT_ACCESS_SECRET` — access token signing key
  - `JWT_REFRESH_SECRET` — refresh token signing key
  - `JWT_ACCESS_EXPIRES` — access token lifetime (default: `15m`)
  - `JWT_REFRESH_EXPIRES` — refresh token lifetime (default: `7d`)
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
  - `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET` — Facebook OAuth
  - `TOTP_ISSUER` — 2FA issuer name

### 2. Users

User CRUD, role management, and profile management.

- **Required**: Yes (cannot disable)
- **Dependencies**: Auth (for guards)
- **Entities**: `UserEntity`
- **API Endpoints**: 6 (list, me, create, update, update-me, delete)
- **Roles**: `admin`, `user`
- **Configuration**: None (uses Auth config)

### 3. Settings

Key-value settings store for app configuration. Supports public and private settings.

- **Required**: Yes (cannot disable)
- **Dependencies**: None
- **Entities**: `SettingEntity`
- **API Endpoints**: 4 (get, get-public, update, bulk-update)
- **Configuration**: None
- **Notes**: Public settings cached in Redis (5 min TTL)

### 4. Logs

Audit logging, access logging, and entity change tracking.

- **Required**: Yes (cannot disable)
- **Dependencies**: None
- **Entities**: `AuditLogEntity`, `AccessLogEntity`
- **API Endpoints**: 4 (audit, access, stats, changelog)
- **Configuration**: None
- **Notes**: LoggingInterceptor auto-records all requests

### 5. Media

File upload with image processing (Sharp), S3-compatible storage, and folder organization.

- **Required**: No
- **Dependencies**: None
- **Entities**: `MediaFileEntity`
- **API Endpoints**: 4 (upload, list, delete, folders)
- **Configuration**:
  - `S3_ENDPOINT` — S3/R2 endpoint
  - `S3_BUCKET` — bucket name
  - `S3_ACCESS_KEY` / `S3_SECRET_KEY` — credentials
  - `S3_REGION` — region (default: `auto`)
  - `S3_PUBLIC_URL` — public CDN URL
- **To Disable**: Remove `MediaModule` from `AppModule` imports

---

## E-Commerce Modules

### 6. Products

Product catalog with variants, pricing, images, and slug generation.

- **Required**: No
- **Dependencies**: Categories, Inventory
- **Entities**: `ProductEntity`, `ProductVariantEntity`
- **API Endpoints**: 7 (list, get, get-by-slug, featured, create, update, delete)
- **Configuration**: None
- **To Disable**: Remove from `AppModule` imports. Remove dependent modules (Cart, Orders, Reviews)

### 7. Categories

Hierarchical product categories with tree structure and reordering.

- **Required**: No (but required by Products)
- **Dependencies**: None
- **Entities**: `CategoryEntity`
- **API Endpoints**: 5 (list, tree, create, update, reorder)
- **Configuration**: None
- **Notes**: Category tree cached in Redis (10 min TTL)

### 8. Inventory

Stock tracking, low-stock alerts, and reservation management.

- **Required**: No
- **Dependencies**: Products
- **Entities**: `InventoryLogEntity`
- **API Endpoints**: Integrated with Products
- **Configuration**: None
- **Notes**: Stock auto-decremented on order confirmation, restored on cancellation

### 9. Cart

Shopping cart with guest-to-user merge capability.

- **Required**: No
- **Dependencies**: Products
- **Entities**: `CartEntity`, `CartItemEntity`
- **API Endpoints**: 5 (get, add-item, update-item, remove-item, merge)
- **Configuration**: None

### 10. Orders

Order management with status workflow and order number generation.

- **Required**: No
- **Dependencies**: Products, Cart, Inventory, Payments
- **Entities**: `OrderEntity`, `OrderItemEntity`
- **API Endpoints**: 5 (list, get, create, update-status, cancel)
- **Configuration**: None
- **Status Flow**: `pending` -> `confirmed` -> `processing` -> `shipped` -> `delivered` / `cancelled` / `refunded`

### 11. Payments

Payment processing with callback handling and refund support.

- **Required**: No
- **Dependencies**: Orders
- **Entities**: `PaymentEntity`
- **API Endpoints**: 3 (process, callback, refund)
- **Configuration**: Payment gateway-specific env vars
- **Supported Methods**: COD, VNPay (extensible)

### 12. Reviews

Product review submission with moderation (approve/reject) and admin reply.

- **Required**: No
- **Dependencies**: Products, Users
- **Entities**: `ReviewEntity`
- **API Endpoints**: 5 (list, create, approve, reject, reply)
- **Configuration**: None

### 13. Promotions

Discount code management with validation rules.

- **Required**: No
- **Dependencies**: None
- **Entities**: `PromotionEntity`
- **API Endpoints**: 5 (list, active, create, validate, delete)
- **Configuration**: None
- **Discount Types**: `percentage`, `fixed_amount`, `free_shipping`

---

## CMS Modules

### 14. Articles

Blog and news articles with publish/draft workflow.

- **Required**: No
- **Dependencies**: Media (for images)
- **Entities**: `ArticleEntity`
- **API Endpoints**: 7 (list, published, get-by-slug, create, update, publish, unpublish)
- **Configuration**: None

### 15. Pages

Static pages with WYSIWYG content and homepage configuration.

- **Required**: No
- **Dependencies**: None
- **Entities**: `PageEntity`
- **API Endpoints**: 5 (list, get-by-slug, homepage, create, update)
- **Configuration**: None

### 16. Navigation

Dynamic navigation menus with nested items and location-based retrieval.

- **Required**: No
- **Dependencies**: None
- **Entities**: `NavigationEntity`, `NavigationItemEntity`
- **API Endpoints**: 5 (list, get-by-location, create, update, update-items)
- **Configuration**: None
- **Locations**: `header`, `footer`, `sidebar`

### 17. SEO

SEO tools including sitemap generation, robots.txt, and per-page meta tags.

- **Required**: No
- **Dependencies**: Products, Articles, Pages
- **Entities**: `SeoMetaEntity`
- **API Endpoints**: 3 (sitemap.xml, robots.txt, meta)
- **Configuration**: None
- **Notes**: Sitemap auto-generates from published content

---

## Advanced Modules

### 18. Notifications

Real-time notifications via WebSocket (Socket.IO) and in-app notification center.

- **Required**: No
- **Dependencies**: Users
- **Entities**: `NotificationEntity`
- **API Endpoints**: 4 (list, unread-count, mark-read, mark-all-read)
- **Configuration**: None
- **WebSocket Events**: `notification:new`, `notification:read`

### 19. Analytics

Page view tracking, custom events, dashboard stats, and revenue analytics.

- **Required**: No
- **Dependencies**: Orders (for revenue)
- **Entities**: `AnalyticsEventEntity`
- **API Endpoints**: 8 (pageview, event, dashboard, pageviews, top-pages, devices, revenue, sources)
- **Configuration**: None
- **Notes**: Aggregation runs via BullMQ worker

### 20. Search

Full-text search across products, articles, pages, and FAQ.

- **Required**: No
- **Dependencies**: Products, Articles, Pages, FAQ
- **Entities**: None (queries other entities)
- **API Endpoints**: 1 (search)
- **Configuration**: None

### 21. Export / Import

Data export to Excel/CSV and import from files.

- **Required**: No
- **Dependencies**: All data modules
- **Entities**: None
- **API Endpoints**: 2 (export, import)
- **Configuration**: None
- **Supported Formats**: XLSX, CSV
- **Exportable Entities**: products, orders, users, articles

### 22. i18n

Multi-language translation management.

- **Required**: No
- **Dependencies**: None
- **Entities**: `I18nTranslationEntity`
- **API Endpoints**: 6 (get-locale, list, create, update, locales, export, import)
- **Configuration**: None
- **Default Locale**: `vi` (Vietnamese)

### 23. Contacts

Contact form for public submissions with admin management.

- **Required**: No
- **Dependencies**: None
- **Entities**: `ContactEntity`
- **API Endpoints**: 4 (submit, list, update, stats)
- **Configuration**: None
- **Statuses**: `unread`, `read`, `replied`, `archived`

### 24. FAQ

FAQ management with categories, voting, and reordering.

- **Required**: No
- **Dependencies**: None
- **Entities**: `FaqItemEntity`
- **API Endpoints**: 5 (list, create, update, vote, reorder)
- **Configuration**: None

---

## SaaS Modules

### 25. Tenants

Multi-tenant organization management with data isolation.

- **Required**: No
- **Dependencies**: Users, Plans
- **Entities**: `TenantEntity`
- **API Endpoints**: 4 (list, my, create, update)
- **Configuration**: None

### 26. Plans

Subscription plan management with usage tracking.

- **Required**: No
- **Dependencies**: Tenants
- **Entities**: `PlanEntity`, `SubscriptionEntity`
- **API Endpoints**: 7 (list, create, update, delete, subscribe, cancel, usage)
- **Configuration**: None

### 27. API Keys

API key generation with scoped access control.

- **Required**: No
- **Dependencies**: Users, Tenants
- **Entities**: `ApiKeyEntity`
- **API Endpoints**: 4 (generate, list, revoke, scopes)
- **Configuration**: None
- **Key Format**: `wt_live_xxxxxxxxxxxxxxxxxxxx`

### 28. Webhooks

Webhook registration with event-driven delivery and retry.

- **Required**: No
- **Dependencies**: Users, Tenants
- **Entities**: `WebhookEntity`, `WebhookDeliveryEntity`
- **API Endpoints**: 6 (list, create, update, delete, deliveries, test)
- **Configuration**: None
- **Available Events**: `order.created`, `order.updated`, `payment.completed`, `user.created`
- **Retry Policy**: 3 attempts with exponential backoff

### 29. Email Templates

Email template management with Handlebars rendering.

- **Required**: No
- **Dependencies**: None
- **Entities**: `EmailTemplateEntity`
- **API Endpoints**: 5 (list, create, update, preview, send, seed)
- **Configuration**:
  - `RESEND_API_KEY` — Resend API key
  - `EMAIL_FROM` — sender email address

---

## How to Disable a Module

1. Remove the module import from `backend/src/app.module.ts`:
```typescript
// Comment out or remove
// import { ArticlesModule } from './modules/articles/articles.module.js';

@Module({
  imports: [
    // ...
    // ArticlesModule,  // Disabled
  ],
})
```

2. Remove related frontend pages (optional).
3. Rebuild: `npm run build`.

**Cannot disable**: Auth, Users, Settings, Logs (core dependencies).
