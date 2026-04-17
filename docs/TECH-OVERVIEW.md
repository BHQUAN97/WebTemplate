# WebTemplate — Tong Quan Cong Nghe & Kien Truc

> Tai lieu tong quan ve he thong WebTemplate — kien truc, stack cong nghe, ly do lua chon, va kha nang mo rong.

---

## 1. Tong quan he thong

WebTemplate la mot full-stack web application template, thiet ke theo kien truc **modular monolith** voi kha nang chuyen doi sang microservices. He thong gom 3 thanh phan chinh:

```
                          Internet
                            │
                      ┌─────▼─────┐
                      │   Nginx   │  Reverse proxy, SSL termination,
                      │  (port 80/443) │  static file serving, load balancing
                      └─────┬─────┘
                            │
              ┌─────────────┼─────────────┐
              │                           │
        ┌─────▼─────┐              ┌──────▼──────┐
        │  Frontend  │              │   Backend   │
        │  Next.js   │              │   NestJS    │
        │ (port 6000)│──── API ────>│ (port 6001) │
        └────────────┘   /api/*     └──────┬──────┘
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                        ┌─────▼─────┐ ┌────▼────┐ ┌────▼────┐
                        │  MySQL 8  │ │ Redis 7 │ │   S3    │
                        │(port 6002)│ │(port 6003)│ │ Storage │
                        └───────────┘ └─────────┘ └─────────┘
```

### Vai tro tung thanh phan

| Thanh phan | Vai tro | Port |
|---|---|---|
| **Nginx** | Reverse proxy, SSL, serve static files, cache, rate limiting | 80/443 |
| **Frontend (Next.js 14)** | Server-side rendering (SSR), client-side interactivity, App Router | 6000 |
| **Backend (NestJS 10)** | REST API, business logic, authentication, background jobs | 6001 |
| **MySQL 8** | Primary database — entities, relations, FULLTEXT search | 6002 |
| **Redis 7** | Session cache, BullMQ job broker, pub/sub cho Socket.io | 6003 |
| **S3 Storage** | File upload, image storage (AWS S3 hoac Cloudflare R2) | - |

### Luong request dien hinh

```
Browser → Nginx → Next.js (SSR/RSC)
                     ↓ (fetch API)
                   NestJS API (/api/*)
                     ↓
                   TypeORM → MySQL
                     ↓
                   Response JSON
                     ↓
                   Next.js render HTML
                     ↓
Browser ← Nginx ← HTML + hydration
```

---

## 2. Stack cong nghe chi tiet

### 2.1. Runtime: Node.js 20 LTS

| Thuoc tinh | Gia tri |
|---|---|
| Phien ban | 20.x LTS |
| Module system | ESM (ES Modules) |
| Package manager | npm |

**Ly do chon:** Node.js 20 LTS dam bao on dinh lau dai, ho tro native ES modules, va toi uu performance voi V8 engine moi nhat.

---

### 2.2. Backend: NestJS 10

| Thuoc tinh | Gia tri |
|---|---|
| Framework | NestJS 10 |
| Language | TypeScript (strict mode) |
| Architecture | Modular monolith, DI container |
| API style | RESTful, prefix `/api` |
| Entry point | `backend/src/main.ts` |

**Dac diem kiến truc:**
- **Dependency Injection (DI):** Moi service, guard, interceptor duoc inject tu dong qua NestJS DI container
- **Decorators:** Su dung TypeScript decorators cho routing, validation, authorization (`@Public()`, `@Roles()`, `@CurrentUser()`)
- **Module system:** 30 modules co the bat/tat doc lap qua `DEFAULT_MODULE_CONFIG`
- **Global pipeline:** Request di qua Guards → Interceptors → Pipes → Controller → Service → Repository

**Cau hinh trong `main.ts`:**
- Helmet (security headers)
- Cookie parser (refresh token)
- CORS (ho tro multi-origin, wildcard subdomain)
- Global prefix `/api`
- Trust proxy (hoat dong sau Nginx)

---

### 2.3. Frontend: Next.js 14

| Thuoc tinh | Gia tri |
|---|---|
| Framework | Next.js 14 |
| React version | React 19 |
| Router | App Router (`app/` directory) |
| Rendering | SSR + CSR hybrid |
| Output | Standalone |

**Dac diem:**
- **App Router:** Su dung route groups `(public)`, `(auth)`, `(dashboard)`, `admin` de to chuc layouts
- **4 Layout rieng biet:**
  - `(public)` — Header + Footer, trang cong khai
  - `(auth)` — Centered card, minimal design cho login/register
  - `(dashboard)` — Sidebar + content, user dashboard
  - `admin` — Full sidebar + topbar, admin panel
- **Server Components** mac dinh, `'use client'` chi khi can interactivity

---

### 2.4. Database: MySQL 8

| Thuoc tinh | Gia tri |
|---|---|
| Version | MySQL 8.x |
| Engine | InnoDB (default) |
| Port | 6002 |
| Timezone | +07:00 (Vietnam) |
| Database name | `webtemplate` |

**Tinh nang su dung:**
- **InnoDB:** ACID transactions, row-level locking, foreign keys
- **FULLTEXT index:** Tim kiem full-text cho products, articles
- **JSON columns:** Luu product variants attributes, tenant settings, plan features
- **Soft delete:** `deleted_at` column (nullable timestamp) tren tat ca entity

**Cau hinh TypeORM:**
```typescript
{
  type: 'mysql',
  autoLoadEntities: true,
  synchronize: process.env.NODE_ENV !== 'production', // Chi dev
  logging: process.env.DB_LOGGING === 'true',
  timezone: '+07:00',
}
```

---

### 2.5. Cache & Message Broker: Redis 7

| Thuoc tinh | Gia tri |
|---|---|
| Version | Redis 7.x |
| Port | 6003 |

**Cac vai tro:**
- **Session cache:** Luu session, refresh token
- **Application cache:** Cache queries thuong xuyen (products, categories)
- **BullMQ broker:** Job queue cho email, image processing, export
- **Socket.io adapter:** Pub/sub cho real-time notifications across instances

---

### 2.6. ORM: TypeORM

| Thuoc tinh | Gia tri |
|---|---|
| Version | Latest compatible voi NestJS 10 |
| Pattern | Active Record + Repository |

**Tinh nang su dung:**
- **Entities:** Moi entity extend `BaseEntity` (ULID, timestamps, soft delete)
- **Relations:** `@ManyToOne`, `@OneToMany`, `@ManyToMany` voi lazy/eager loading
- **Migrations:** Generate va run qua `scripts/migrate.sh`
- **Soft delete:** `@DeleteDateColumn` + `softRemove()` — du lieu khong bi xoa that
- **Query Builder:** Cho cac truy van phuc tap (search, filter, join)

---

### 2.7. Authentication: JWT + Passport.js

| Thuoc tinh | Gia tri |
|---|---|
| Strategy | JWT (access + refresh token) |
| Access token | 15 phut, luu trong memory/localStorage |
| Refresh token | 7 ngay, luu trong HTTP-only cookie |
| Password hash | bcrypt (12 salt rounds) |
| Checksum | SHA-256 |
| 2FA | TOTP (chua implement UI) |
| OAuth | Google, Facebook (backend ready) |

**Luong auth:**
1. User login → backend tra `access_token` + set `refresh_token` cookie
2. Frontend luu access_token, gui kem trong `Authorization: Bearer` header
3. Token het han → frontend goi `/auth/refresh` voi cookie → nhan token moi
4. `JwtAuthGuard` applied globally, bypass bang `@Public()` decorator

---

### 2.8. Storage: S3-compatible

| Thuoc tinh | Gia tri |
|---|---|
| Provider | AWS S3 hoac Cloudflare R2 |
| Image processing | Sharp |

**Tinh nang:**
- Upload file qua FormData
- Sharp xu ly anh: resize, compress, tao thumbnail
- Tuong thich S3 API — de chuyen doi giua AWS va R2

---

### 2.9. Real-time: Socket.io

| Thuoc tinh | Gia tri |
|---|---|
| Library | Socket.io |
| Adapter | Redis adapter |

**Dac diem:**
- Redis adapter cho phep scale ngang (nhieu instances van nhan events)
- Backend ready, frontend chua implement day du

---

### 2.10. Queue: BullMQ

| Thuoc tinh | Gia tri |
|---|---|
| Library | BullMQ |
| Broker | Redis 7 |

**Cac job types:**
- Email sending (Resend API + Handlebars templates)
- Image processing (resize, compress voi Sharp)
- Data export (CSV, Excel)

---

### 2.11. UI Framework

| Thuoc tinh | Gia tri |
|---|---|
| CSS | Tailwind CSS 4 |
| Primitives | Radix UI |
| Pattern | Shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |

**Approach:** Shadcn pattern — copy components vao `components/ui/`, customize theo nhu cau. Khong phu thuoc vao npm package, toan quyen kiem soat code.

---

### 2.12. State Management

| Pham vi | Tool |
|---|---|
| Global state | Zustand (persist middleware) |
| Form state | React Hook Form + Zod |
| Server state | Custom `useApi` hook |

**Zustand stores:**
- `auth-store` — user, token, isAuthenticated (sessionStorage)
- `cart-store` — items, promo, computed totals (localStorage)
- `ui.store` — sidebar state, theme
- `notification.store` — real-time notifications
- `wishlist-store` — danh sach yeu thich

---

### 2.13. Validation

| Layer | Tool |
|---|---|
| Backend | class-validator + class-transformer |
| Frontend | Zod schemas |

**Quy tac validation dong bo FE + BE:**
- Email: valid format, required
- Password: min 8 ky tu, 1 chu hoa, 1 so, 1 ky tu dac biet
- Phone: 10-11 so, bat dau bang 0
- Price: so duong
- Name: 2-100 ky tu

---

### 2.14. Testing

| Loai | Tool |
|---|---|
| Unit test (BE) | Jest |
| Unit test (FE) | Vitest |
| E2E test | Playwright |
| Test runner | `npm test`, `npx playwright test` |

---

### 2.15. Deployment

| Thanh phan | Tool |
|---|---|
| Container | Docker multi-stage build |
| Orchestration | Docker Compose |
| Reverse proxy | Nginx |
| SSL | Certbot (Let's Encrypt) |
| Process manager | PM2 (ngoai Docker) |

**Docker files:**
- `docker-compose.yml` — Dev (MySQL + Redis)
- `docker-compose.prod.yml` — Production (all services + Nginx)
- `deploy.sh` — Script deploy cho dev/staging/prod

---

## 3. So sanh voi cac framework khac

### 3.1. Backend: NestJS vs Express thuan

| Tieu chi | NestJS | Express thuan |
|---|---|---|
| Cau truc | Module + DI container, enforce separation | Tu do, de tro thanh spaghetti |
| TypeScript | First-class, decorators built-in | Can cau hinh them |
| Dependency Injection | Co san, auto-inject | Can thu vien ngoai (inversify, tsyringe) |
| Guards/Interceptors | Built-in pipeline | Phai tu xay middleware chain |
| Validation | Tich hop class-validator | Tu cau hinh |
| Testing | Module testing voi DI mock | Tu setup |
| Learning curve | Cao hon | Thap hon |
| Boilerplate | Nhieu hon | It hon |

**Ket luan:** NestJS phu hop cho du an lon, can cau truc chat che, nhieu developer. Express phu hop cho API nho, prototype nhanh.

### 3.2. Frontend: Next.js vs Create React App (CRA)

| Tieu chi | Next.js 14 | CRA / Vite React |
|---|---|---|
| Rendering | SSR + SSG + ISR + CSR | Chi CSR |
| SEO | Tot (server render HTML) | Kem (client render) |
| Routing | File-based (App Router) | Can react-router |
| Layouts | Nested layouts built-in | Tu implement |
| API routes | Co (Route Handlers) | Khong |
| Performance | Image optimization, code splitting tu dong | Can cau hinh |
| Deployment | Standalone output, Docker-ready | Static files |

**Ket luan:** Next.js cho du an can SEO, multi-layout, SSR. CRA/Vite cho SPA don gian, admin panels.

---

## 4. Kha nang mo rong

### 4.1. Horizontal Scaling (nhieu instance)

```
                    Load Balancer
                    ┌────┼────┐
                    │    │    │
                  App1  App2  App3   ← NestJS instances
                    │    │    │
                    └────┼────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
           MySQL      Redis     S3 Storage
          (Primary)  (Shared)   (Shared)
```

**Da ho tro:**
- **Stateless API:** JWT-based auth, khong luu session tren server
- **Redis adapter:** Socket.io events phat cho tat ca instances
- **BullMQ:** Jobs phan phoi tu dong giua workers
- **S3 storage:** Shared file storage, khong phu thuoc local disk

**Can them:**
- Docker Swarm hoac Kubernetes cho orchestration
- MySQL connection pooling (TypeORM da ho tro)
- Health check endpoint cho load balancer

### 4.2. Vertical Scaling (tang tai nguyen)

- **Redis Cluster:** Chuyen tu single Redis sang Redis Cluster cho throughput cao hon
- **MySQL Replica:** Read replicas cho cac truy van doc nhieu (reports, analytics)
- **Worker scaling:** Tang so BullMQ workers doc lap voi API server

### 4.3. Microservices Migration Path

He thong thiet ke theo **modular monolith** — moi module (auth, products, orders...) doc lap ve logic, chi share BaseEntity va BaseService. Khi can chuyen sang microservices:

```
Hien tai (Monolith):
┌─────────────────────────────┐
│  NestJS App                 │
│  ├── Auth Module            │
│  ├── Products Module        │
│  ├── Orders Module          │
│  └── ... (30 modules)       │
└─────────────────────────────┘

Tuong lai (Microservices):
┌──────────┐ ┌───────────┐ ┌──────────┐
│ Auth     │ │ Products  │ │ Orders   │
│ Service  │ │ Service   │ │ Service  │
└────┬─────┘ └─────┬─────┘ └────┬─────┘
     │             │             │
     └──────── Message Bus ──────┘
            (Redis / RabbitMQ)
```

**Buoc chuyen doi:**
1. Tach module thanh NestJS microservice (NestJS ho tro san `@nestjs/microservices`)
2. Chuyen giao tiep tu direct import sang message patterns (TCP/Redis/RabbitMQ)
3. Moi service co database rieng (database-per-service pattern)
4. API Gateway phia truoc route request den dung service

### 4.4. Multi-tenant Scaling

He thong da ho tro multi-tenant qua:
- `TenantGuard` — isolate data theo `tenantId`
- `x-tenant-id` header — cho phep admin truy cap cross-tenant
- `Tenant` entity voi `Plan` — gioi han tai nguyen theo plan (max_users, max_products, max_storage)

**Mo rong:** Chuyen tu shared database (hien tai) sang database-per-tenant khi can isolation manh hon.

---

## Tong ket

WebTemplate la mot **production-ready template** cho cac du an web tu e-commerce den SaaS. Thiet ke de:
- **Bat dau nhanh:** Clone, bat modules can thiet, bat dau code
- **Mo rong de:** Tu single server den cluster, tu monolith den microservices
- **Bao tri tot:** Module doc lap, code patterns nhat quan, documentation day du
