# Architecture

## System Overview

WebTemplate is a modular monolith with a clear separation between frontend and backend. Both communicate through a REST API with JWT authentication. The system supports multi-tenancy, real-time notifications via WebSocket, background job processing with BullMQ, and S3-compatible file storage.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (Browser)                       │
│                  Next.js SSR + CSR + Hydration               │
└──────────────┬──────────────────────────────┬───────────────┘
               │ REST API                      │ WebSocket
               │ (JWT Bearer)                  │ (Socket.IO)
┌──────────────▼──────────────────────────────▼───────────────┐
│                     NestJS Backend (port 6001)               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Guards   │  │Intercept.│  │  Pipes   │  │  Filters   │  │
│  │ JWT Auth  │  │Transform │  │Validation│  │ Exception  │  │
│  │ Roles    │  │ Logging  │  │          │  │            │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘  │
│       └──────────────┴─────────────┴──────────────┘          │
│                          │                                    │
│  ┌───────────────────────▼────────────────────────────────┐  │
│  │                    Feature Modules                      │  │
│  │  Auth │ Users │ Products │ Orders │ Articles │ ...      │  │
│  └───────────┬───────────────┬──────────────┬─────────────┘  │
│              │               │              │                 │
│  ┌───────────▼──┐  ┌────────▼──┐  ┌───────▼──────────────┐  │
│  │   TypeORM    │  │   Redis   │  │   BullMQ Workers     │  │
│  │  Entities    │  │   Cache   │  │   Email, Webhooks    │  │
│  │  Repository  │  │  Sessions │  │   Analytics, Export  │  │
│  └──────┬───────┘  └─────┬────┘  └──────────────────────┘  │
│         │                │                                    │
└─────────┼────────────────┼────────────────────────────────────┘
          │                │
   ┌──────▼─────┐   ┌─────▼──────┐
   │  MySQL 8.0 │   │  Redis 7   │
   │  Port 6002 │   │  Port 6003 │
   └────────────┘   └────────────┘
```

## Backend Architecture

### NestJS Module Structure

Each module follows a consistent structure:

```
modules/{name}/
├── {name}.module.ts          # Module definition + imports
├── {name}.controller.ts      # HTTP endpoints
├── {name}.service.ts         # Business logic
├── dto/                      # Request/response DTOs with class-validator
│   ├── create-{name}.dto.ts
│   └── update-{name}.dto.ts
└── entities/                 # TypeORM entities
    └── {name}.entity.ts
```

### Global Providers

Registered in `AppModule` via `APP_*` tokens:

| Provider | Type | Description |
|----------|------|-------------|
| `JwtAuthGuard` | Guard | Validates JWT on every request. Skip with `@Public()` |
| `RolesGuard` | Guard | Checks `@Roles('admin')` decorator |
| `TransformInterceptor` | Interceptor | Wraps response in `{ data, meta }` |
| `LoggingInterceptor` | Interceptor | Logs request method, URL, duration |
| `AllExceptionsFilter` | Filter | Catches all errors, formats response |
| `CustomValidationPipe` | Pipe | Validates DTOs, returns Vietnamese messages |

### BaseEntity Pattern

All entities extend `BaseEntity`:

```typescript
abstract class BaseEntity {
  id: string;          // ULID (26 chars), auto-generated
  created_at: Date;    // Auto-set on insert
  updated_at: Date;    // Auto-set on update
  deleted_at: Date;    // Soft delete (nullable)
}
```

### Config Modules

Loaded via `@nestjs/config` with `.env` files:

| Config | File | Keys |
|--------|------|------|
| `appConfig` | `app.config.ts` | name, port, env, url |
| `jwtConfig` | `jwt.config.ts` | access/refresh secrets, expiry |
| `storageConfig` | `storage.config.ts` | S3 endpoint, bucket, keys |
| `redisConfig` | `redis.config.ts` | host, port |
| `getDatabaseConfig` | `database.config.ts` | MySQL connection options |

## Frontend Architecture

### Next.js App Router

```
frontend/src/
├── app/
│   ├── (auth)/              # Auth pages (login, register, forgot-password)
│   ├── (public)/            # Public pages (products, blog, cart, checkout)
│   ├── (dashboard)/         # User dashboard (orders, profile, settings)
│   ├── admin/               # Admin panel (all management pages)
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # Radix UI + shadcn/ui components
│   ├── admin/               # Admin-specific components
│   ├── public/              # Public-facing components
│   └── shared/              # Shared components
└── lib/
    ├── api/                 # API client + module-specific API calls
    │   └── modules/         # Per-module API functions
    ├── hooks/               # Custom React hooks
    ├── stores/              # Zustand stores
    ├── types/               # TypeScript interfaces
    ├── utils/               # Utility functions
    └── validations/         # Zod schemas for form validation
```

### Route Groups

| Group | Path | Purpose |
|-------|------|---------|
| `(auth)` | `/login`, `/register`, etc. | Unauthenticated pages |
| `(public)` | `/products`, `/blog`, `/cart` | Public-facing pages |
| `(dashboard)` | `/orders`, `/profile` | Authenticated user pages |
| `admin` | `/admin/*` | Admin panel (requires admin role) |

### State Management

- **Zustand** for client-side global state (auth, cart, notifications)
- **React Hook Form + Zod** for form state and validation
- **Server Components** for data fetching where possible

## Authentication Flow

```
┌──────────┐     POST /auth/login       ┌──────────┐
│  Client  │ ──────────────────────────▶ │  Server  │
│          │   { email, password }       │          │
│          │                             │          │
│          │  ◀──────────────────────────│          │
│          │   { accessToken }           │          │
│          │   Set-Cookie: refreshToken  │          │
│          │   (httpOnly, secure)        │          │
│          │                             │          │
│          │     GET /api/users/me       │          │
│          │ ──────────────────────────▶ │          │
│          │   Authorization: Bearer AT  │          │
│          │                             │          │
│          │  ◀──────────────────────────│          │
│          │   { user data }             │          │
│          │                             │          │
│          │    POST /auth/refresh       │          │
│          │ ──────────────────────────▶ │          │
│          │   Cookie: refreshToken      │          │
│          │                             │          │
│          │  ◀──────────────────────────│          │
│          │   { new accessToken }       │          │
│          │   Set-Cookie: new RT        │          │
└──────────┘                             └──────────┘

Token lifecycle:
- Access Token:  15 minutes (in memory/localStorage)
- Refresh Token: 7 days (httpOnly cookie)
- Rotation: new RT issued on each refresh
```

## Order Flow

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐
│  Cart   │───▶│  Order   │───▶│  Payment  │───▶│  Complete  │
│ (items) │    │ (pending)│    │ (process) │    │ (shipped)  │
└─────────┘    └──────────┘    └───────────┘    └────────────┘
                    │                │                │
                    ▼                ▼                ▼
              ┌──────────┐    ┌───────────┐    ┌────────────┐
              │ Inventory │    │  Webhook  │    │   Email    │
              │ Reserved  │    │  Notify   │    │  Confirm   │
              └──────────┘    └───────────┘    └────────────┘

Order statuses: pending → confirmed → processing → shipped → delivered
                                                  → cancelled
                                                  → refunded
```

## Multi-Tenant Architecture

Each tenant operates as an isolated organization within the shared database.

```
┌─────────────────────────────────────────────┐
│              Shared Database                 │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Tenant A │  │ Tenant B │  │ Tenant C │  │
│  │          │  │          │  │          │  │
│  │ Users    │  │ Users    │  │ Users    │  │
│  │ Products │  │ Products │  │ Products │  │
│  │ Orders   │  │ Orders   │  │ Orders   │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│                                              │
│  Isolation via tenant_id foreign key         │
│  on all tenant-scoped entities               │
└─────────────────────────────────────────────┘
```

- Tenant data isolated by `tenant_id` column
- Plans define feature limits (products, orders, storage)
- API keys scoped per tenant
- Webhooks dispatched per tenant events

## Caching Strategy

```
Redis usage:
├── Session/Auth
│   ├── refresh_tokens:{userId}     # Active refresh tokens
│   └── blacklist:{tokenId}         # Revoked tokens (TTL = token expiry)
├── Cache
│   ├── settings:public             # Public settings (TTL: 5min)
│   ├── categories:tree             # Category tree (TTL: 10min)
│   ├── products:featured           # Featured products (TTL: 5min)
│   └── seo:meta:{path}            # SEO meta per page (TTL: 15min)
├── Rate Limiting
│   └── ratelimit:{ip}:{endpoint}   # Request counts
└── BullMQ Queues
    ├── email                       # Email sending jobs
    ├── webhooks                    # Webhook delivery jobs
    ├── analytics                   # Analytics aggregation
    └── export                     # Export generation jobs
```

## Queue Workers (BullMQ)

| Queue | Purpose | Concurrency |
|-------|---------|-------------|
| `email` | Send transactional emails via Resend | 5 |
| `webhooks` | Deliver webhook payloads with retry | 3 |
| `analytics` | Aggregate page views and events | 1 |
| `export` | Generate Excel/CSV exports | 2 |
| `media` | Image resizing and optimization | 2 |

## Database Schema Overview

Key entity relationships:

```
users ──┬──< orders ──< order_items ──> products
        │                                   │
        ├──< reviews ─────────────────────> ┘
        │                                   │
        ├──< cart ──< cart_items ──────────> ┘
        │                                   │
        └──< notifications          categories ──< products
                                              │
tenants ──< users                    articles ──< article_categories
        │                                   
plans ──< tenant_subscriptions       pages
                                     
navigation ──< navigation_items     faq_items
                                     
settings (key-value)                 contacts
                                     
audit_logs                           i18n_translations
                                     
api_keys                             webhooks ──< webhook_deliveries
                                     
email_templates                      promotions
```

All entities use:
- ULID primary keys (26 characters, sortable)
- `snake_case` column naming
- Soft delete via `deleted_at` timestamp
- `created_at` and `updated_at` auto-timestamps
