# WebTemplate

Full-stack web application template with e-commerce, CMS, multi-tenant SaaS, and admin dashboard. Production-ready with 30 backend modules and comprehensive frontend.

## Tech Stack

| Layer      | Technology                                      |
|------------|------------------------------------------------|
| Frontend   | Next.js 14, React 19, TypeScript, Tailwind CSS |
| Backend    | NestJS 10, TypeORM, MySQL 8, Redis 7, BullMQ  |
| UI         | Radix UI, Recharts, Lucide Icons               |
| Auth       | JWT (access + refresh), 2FA (TOTP), OAuth      |
| Storage    | S3-compatible (AWS S3 / Cloudflare R2)         |
| Email      | Resend API + Handlebars templates              |
| Deploy     | Docker, Nginx, docker-compose                  |

## Quick Start

```bash
# 1. Clone and setup
git clone <repo-url> && cd WebTemplate
./scripts/setup-dev.sh

# 2. Start backend
cd backend && npm run start:dev

# 3. Start frontend (new terminal)
cd frontend && npm run dev
```

Open http://localhost:6000 (frontend) or http://localhost:6001/api (backend).

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (80/443)                     │
│              Reverse Proxy + SSL + Cache              │
└──────────────┬──────────────────────┬────────────────┘
               │                      │
       ┌───────▼───────┐     ┌───────▼────────┐
       │  Frontend      │     │  Backend        │
       │  Next.js 14    │     │  NestJS 10      │
       │  Port 6000     │     │  Port 6001      │
       │                │     │                 │
       │  App Router    │────▶│  /api/*         │
       │  SSR + CSR     │     │  JWT Guards     │
       │  Tailwind CSS  │     │  TypeORM        │
       └───────────────┘     └──┬──────┬───────┘
                                │      │
                        ┌───────▼┐  ┌──▼──────┐
                        │ MySQL  │  │  Redis   │
                        │ 8.0    │  │  7       │
                        │ :6002  │  │  :6003   │
                        └────────┘  └─────────┘
```

## Modules

### Core
| Module       | Description                          |
|-------------|--------------------------------------|
| Auth        | JWT login/register, refresh, 2FA, OAuth, password reset |
| Users       | User CRUD, roles (admin/user), profile management |
| Settings    | App configuration, key-value store   |
| Logs        | Audit logs, access logs, changelog   |
| Media       | File upload, image processing (Sharp), S3 storage |

### E-Commerce
| Module       | Description                          |
|-------------|--------------------------------------|
| Products    | Products with variants, pricing, inventory |
| Categories  | Hierarchical categories, tree structure |
| Inventory   | Stock tracking, low-stock alerts     |
| Cart        | Shopping cart, guest merge on login   |
| Orders      | Order workflow, status management     |
| Payments    | Payment processing, refunds          |
| Reviews     | Product reviews, rating, moderation  |
| Promotions  | Discount codes, rules engine         |

### CMS
| Module       | Description                          |
|-------------|--------------------------------------|
| Articles    | Blog posts, publish/draft workflow   |
| Pages       | Static pages, homepage config        |
| Navigation  | Dynamic menus, location-based        |
| SEO         | Meta tags, sitemap, robots.txt       |

### Advanced
| Module       | Description                          |
|-------------|--------------------------------------|
| Notifications | Real-time (WebSocket), email, in-app |
| Analytics   | Page views, events, dashboard, revenue |
| Search      | Full-text search across entities     |
| Export/Import | Excel/CSV export and import         |
| i18n        | Multi-language translations          |
| Contacts    | Contact form submissions             |
| FAQ         | FAQ management, voting, reorder      |

### SaaS
| Module       | Description                          |
|-------------|--------------------------------------|
| Tenants     | Multi-tenant organization management |
| Plans       | Subscription plans, usage tracking   |
| API Keys    | API key generation, scoped access    |
| Webhooks    | Webhook management, delivery tracking |
| Email Templates | Email template CRUD, preview, send |

## API Endpoints

All endpoints are prefixed with `/api`. See [docs/API.md](docs/API.md) for full documentation.

| Module       | Endpoints | Auth Required |
|-------------|-----------|---------------|
| Auth        | 7         | Partial       |
| Users       | 6         | Yes           |
| Products    | 7         | Partial       |
| Categories  | 5         | Partial       |
| Orders      | 5         | Yes           |
| Payments    | 3         | Yes           |
| Cart        | 5         | Yes           |
| Reviews     | 5         | Partial       |
| Promotions  | 5         | Partial       |
| Articles    | 7         | Partial       |
| Pages       | 5         | Partial       |
| Navigation  | 5         | Partial       |
| SEO         | 3         | No            |
| Media       | 4         | Yes           |
| Notifications | 4       | Yes           |
| Analytics   | 8         | Partial       |
| Search      | 1         | No            |
| Settings    | 4         | Partial       |
| Logs        | 4         | Yes (admin)   |
| Contacts    | 3         | Partial       |
| FAQ         | 5         | Partial       |
| Tenants     | 4         | Yes           |
| Plans       | 7         | Partial       |
| API Keys    | 4         | Yes           |
| Webhooks    | 5         | Yes           |
| Email Tmpl  | 5         | Yes (admin)   |
| Export/Import | 2       | Yes (admin)   |
| i18n        | 6         | Partial       |

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable           | Default              | Description              |
|-------------------|----------------------|--------------------------|
| DB_HOST           | localhost            | MySQL host               |
| DB_PORT           | 6002                 | MySQL port               |
| DB_NAME           | webtemplate          | Database name            |
| DB_USER           | wtuser               | Database user            |
| DB_PASSWORD       | wtpass               | Database password        |
| REDIS_HOST        | localhost            | Redis host               |
| REDIS_PORT        | 6003                 | Redis port               |
| JWT_ACCESS_SECRET | (change me)          | JWT access token secret  |
| JWT_REFRESH_SECRET| (change me)          | JWT refresh token secret |
| APP_PORT          | 6001                 | Backend API port         |
| APP_URL           | http://localhost:6000| Frontend URL             |
| API_URL           | http://localhost:6001| Backend URL              |

## Development

```bash
# Start infrastructure (MySQL + Redis)
docker compose up -d

# Backend (terminal 1)
cd backend
npm install
npm run start:dev     # http://localhost:6001

# Frontend (terminal 2)
cd frontend
npm install
npm run dev           # http://localhost:6000

# Run backend tests
cd backend && npm test

# Run e2e tests
cd backend && npm run test:e2e

# Run frontend e2e tests
cd frontend && npx playwright test
```

## Production Deployment

```bash
# One-command deploy
./deploy.sh prod

# Or manually with docker-compose
docker compose -f docker-compose.prod.yml up -d

# Backup
./scripts/backup.sh

# Migrations
./scripts/migrate.sh run
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide.

## Project Structure

```
WebTemplate/
├── backend/                  # NestJS 10 API
│   ├── src/
│   │   ├── common/          # Guards, interceptors, pipes, decorators
│   │   ├── config/          # App, DB, JWT, Redis, S3 config
│   │   ├── database/        # Migrations and seeds
│   │   ├── modules/         # 29 feature modules
│   │   └── main.ts          # Entry point
│   ├── test/                # E2E tests
│   └── Dockerfile
├── frontend/                 # Next.js 14
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # UI components
│   │   └── lib/             # API, hooks, stores, types
│   ├── e2e/                 # Playwright tests
│   └── Dockerfile
├── nginx/                    # Reverse proxy config
├── scripts/                  # Utility scripts
├── docs/                     # Documentation
├── docker-compose.yml        # Dev infrastructure
├── docker-compose.prod.yml   # Production stack
└── deploy.sh                 # Deploy script
```

## Documentation

| Tai lieu | Mo ta | Dong |
|----------|-------|------|
| [TECH-OVERVIEW.md](docs/TECH-OVERVIEW.md) | Tong quan cong nghe, kien truc, stack chi tiet, so sanh framework | 434 |
| [BASE-PATTERNS.md](docs/BASE-PATTERNS.md) | **Base patterns BE + FE**: BaseEntity, BaseService, Guards, Interceptors, API Client, Zustand, Hooks, Validation. Huong dan tao module/page moi | 1,844 |
| [FLOWS.md](docs/FLOWS.md) | **11 luong xu ly chi tiet**: Auth, Authorization, Order, Media Upload, CMS, Notification, Analytics, Multi-tenant, Webhook, Search, Export/Import | 1,672 |
| [BUSINESS-FEATURES.md](docs/BUSINESS-FEATURES.md) | **Tong hop tinh nang nghiep vu** 12 nhom module, use cases, data model, API, cross-module links | 1,339 |
| [WORKFLOW.md](docs/WORKFLOW.md) | Quy trinh lam viec: dev workflow, module development, migration, testing, git convention, code review checklist | 314 |
| [DEPLOY-GUIDE.md](docs/DEPLOY-GUIDE.md) | **Huong dan trien khai chi tiet** 4 modes: Dev, Production, Shared VPS, Docker All-in-One. SSL, backup, monitoring, troubleshooting | 757 |
| [INDEX.md](docs/INDEX.md) | **File index toan bo project** ~450 files voi mo ta tung file | 717 |
| [API.md](docs/API.md) | API documentation tat ca endpoints, request/response examples | 1,404 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Kien truc he thong, module structure, auth flow, caching, queue | 284 |
| [DATABASE.md](docs/DATABASE.md) | Schema conventions, entity relationships, migration workflow, indexes | 275 |
| [MODULES.md](docs/MODULES.md) | 29 modules reference: description, required/optional, dependencies, endpoints | 404 |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Prerequisites, setup, deployment options | 381 |
| [CHANGELOG.md](docs/CHANGELOG.md) | Version history | 80 |

**Tong: ~9,900 dong tai lieu**

### Doc theo muc dich

| Ban muon... | Doc |
|------------|-----|
| Hieu tong quan project | [TECH-OVERVIEW](docs/TECH-OVERVIEW.md) → [ARCHITECTURE](docs/ARCHITECTURE.md) |
| Tao module BE moi | [BASE-PATTERNS](docs/BASE-PATTERNS.md) section "Cach tao module moi" |
| Tao page FE moi | [BASE-PATTERNS](docs/BASE-PATTERNS.md) section "Cach tao page moi" |
| Hieu luong xu ly | [FLOWS](docs/FLOWS.md) |
| Xem tinh nang nghiep vu | [BUSINESS-FEATURES](docs/BUSINESS-FEATURES.md) |
| Deploy project | [DEPLOY-GUIDE](docs/DEPLOY-GUIDE.md) |
| Tim file trong project | [INDEX](docs/INDEX.md) |
| Tich hop API | [API](docs/API.md) |
| Setup VPS lan dau | [DEPLOY-GUIDE](docs/DEPLOY-GUIDE.md) section "Mode 2: Production" |
| Shared VPS voi project khac | [DEPLOY-GUIDE](docs/DEPLOY-GUIDE.md) section "Mode 3: Shared VPS" |

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feat/your-feature`
3. Follow coding conventions:
   - Business logic comments in Vietnamese
   - Technical/API comments in English
   - Commit format: `type(scope): description`
   - Types: `feat`, `fix`, `refactor`, `chore`, `docs`
4. Run tests before committing
5. Submit pull request

## License

Private — All rights reserved.
