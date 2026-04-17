# WebTemplate — Project CLAUDE.md

## Stack
- **Frontend**: Next.js 14 (App Router, standalone output) + React 19 + TypeScript + Tailwind CSS 4 + Radix UI
- **Backend**: NestJS 10 + TypeORM + MySQL 8 + Redis 7 + BullMQ
- **Auth**: JWT (access 15m + refresh 7d cookie) + 2FA (TOTP) + OAuth
- **Storage**: S3-compatible (AWS S3 / Cloudflare R2) + Sharp image processing
- **Email**: Resend API + Handlebars templates

## Ports
- Frontend: 6000
- Backend API: 6001
- MySQL: 6002
- Redis: 6003

## Key Files
- `backend/src/main.ts` — Backend entry, CORS, helmet, prefix `/api`
- `backend/src/app.module.ts` — Root module, global guards/interceptors/pipes
- `backend/src/common/entities/base.entity.ts` — ULID + timestamps + soft delete
- `backend/src/config/` — app, jwt, database, redis, storage configs
- `frontend/src/app/` — Next.js App Router pages
- `frontend/src/lib/` — API client, hooks, stores, types, validations
- `docker-compose.yml` — Dev infrastructure (MySQL + Redis)
- `docker-compose.prod.yml` — Production stack (all services + nginx)

## Coding Rules

### Backend
- Tat ca entity phai extend `BaseEntity` (ULID, timestamps, soft delete)
- Service logic dung BaseService pattern khi co the
- DTO dung `class-validator` decorators
- Controller comments bang tieng Viet (business), English (technical)
- Moi function > 20 dong phai co comment muc dich
- Dung `@Public()` decorator cho routes khong can auth
- Dung `@Roles('admin')` cho admin-only routes
- Validation messages bang tieng Viet cho end-user facing errors
- Import dung `.js` extension (ESM compat)

### Frontend
- Functional components + hooks only (khong class components)
- State: Zustand cho global, React Hook Form + Zod cho forms
- UI: Radix UI primitives + Tailwind CSS
- API calls qua `lib/api/` modules
- Validation: Zod schemas trong `lib/validations/`

### Validation Rules (FE + BE phai dong bo)
- Email: valid format, required
- Password: min 8 chars, 1 uppercase, 1 number, 1 special char
- Phone: 10-11 digits, starts with 0
- Price: positive number
- Name: 2-100 chars

## Required Modules (KHONG duoc xoa)
- Auth — JWT authentication
- Users — User management
- Settings — App configuration
- Logs — Audit logging

## Dev Commands
```bash
# Start infrastructure
docker compose up -d

# Backend dev
cd backend && npm run start:dev

# Frontend dev
cd frontend && npm run dev

# Backend tests
cd backend && npm test
cd backend && npm run test:e2e

# Frontend e2e tests
cd frontend && npx playwright test

# Build
cd backend && npm run build
cd frontend && npm run build

# Migrations
./scripts/migrate.sh run
./scripts/migrate.sh generate MigrationName
./scripts/migrate.sh seed

# Deploy
./deploy.sh dev|staging|prod

# Backup
./scripts/backup.sh
```

## Git Convention
- Branch: `feat/feature-name`, `fix/bug-name`
- Commit: `type(scope): description`
- Types: feat, fix, refactor, chore, docs, test

## Module Structure Pattern
```
modules/{name}/
├── {name}.module.ts
├── {name}.controller.ts
├── {name}.service.ts
├── dto/
│   ├── create-{name}.dto.ts
│   └── update-{name}.dto.ts
└── entities/
    └── {name}.entity.ts
```

## Chua lam / TODO
- (Tat ca cac muc truoc day da hoan thanh — xem CHANGELOG.md version 1.1.0)
- Email sending (Resend) — code da wire, can test voi API key that
- Momo/Stripe payment — code da xong, can test voi merchant credentials that
