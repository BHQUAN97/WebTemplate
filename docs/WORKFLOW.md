# WebTemplate — Quy Trinh Lam Viec

Tai lieu nay mo ta quy trinh lam viec hang ngay cho developer, tu setup den deploy.

---

## 1. Dev Workflow (Developer hang ngay)

```
1. git pull origin main
2. git checkout -b feat/feature-name
3. docker compose up -d                    # Start MySQL (6002) + Redis (6003)
4. cd backend && npm run start:dev         # NestJS dev server (port 6001)
5. cd frontend && npm run dev              # Next.js dev server (port 6000)
6. Code -> Test -> Commit
7. git push origin HEAD
8. Tao PR -> Review -> Merge
```

### URLs khi dev
| Service  | URL                           |
|----------|-------------------------------|
| Frontend | http://localhost:6000          |
| Backend  | http://localhost:6001/api      |
| Admin    | http://localhost:6000/admin    |
| MySQL    | localhost:6002                 |
| Redis    | localhost:6003                 |

### Setup lan dau (1 lenh)
```bash
./scripts/setup-dev.sh
```
Script se tu dong: check Node.js 20+, check Docker, copy `.env`, install deps, start MySQL + Redis, run migrations, seed admin user.

**Default admin:**
- Email: `admin@webtemplate.local`
- Password: `Admin@123`

---

## 2. Module Development Workflow

### Backend — Them module moi

```
1. Tao folder: backend/src/modules/{name}/
2. Tao entity: entities/{name}.entity.ts (extend BaseEntity)
3. Tao DTOs:
   - dto/create-{name}.dto.ts
   - dto/update-{name}.dto.ts
   - dto/query-{name}.dto.ts (neu can pagination/filter)
4. Tao service: {name}.service.ts (extend BaseService<Entity>)
5. Tao controller: {name}.controller.ts (CRUD + custom endpoints)
6. Tao module: {name}.module.ts (exports service)
7. Import vao app.module.ts
```

### Cau truc folder chuan
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

### Quy tac khi tao module
- Entity **phai** extend `BaseEntity` (co san ULID, timestamps, soft delete)
- Service **nen** extend `BaseService<Entity>` de co CRUD + pagination san
- DTO dung `class-validator` decorators, validation messages bang **tieng Viet**
- Controller comment business logic bang tieng Viet, technical bang English
- Route khong can auth → dung `@Public()` decorator
- Route chi admin → dung `@Roles('admin')` decorator

### Frontend — Them module tuong ung

```
1. Them types vao lib/types/index.ts
2. Tao API module: lib/api/modules/{name}.api.ts
3. Tao validation: lib/validations/{name}.schema.ts
4. Tao pages:
   - app/admin/{name}/page.tsx            (danh sach)
   - app/admin/{name}/new/page.tsx        (tao moi)
   - app/admin/{name}/[id]/page.tsx       (chinh sua)
   - app/(public)/{name}/page.tsx         (trang public, neu can)
```

### Quy tac frontend
- Functional components + hooks (khong class components)
- State: Zustand cho global, React Hook Form + Zod cho forms
- UI: Radix UI primitives + Tailwind CSS
- API calls qua `lib/api/` modules
- Validation: Zod schemas trong `lib/validations/`

---

## 3. Database Migration Workflow

```bash
# 1. Thay doi entity (them/sua columns, relations)

# 2. Generate migration tu entity changes
./scripts/migrate.sh generate TenMigration

# 3. Review migration file trong backend/src/database/migrations/
#    Kiem tra SQL co dung y dinh khong

# 4. Run migration
./scripts/migrate.sh run

# 5. Test lai ung dung

# 6. Commit migration file CUNG VOI entity change
git add backend/src/modules/{name}/entities/
git add backend/src/database/migrations/
git commit -m "feat(db): add migration for {name} entity"
```

### Cac lenh migration

| Lenh | Mo ta |
|------|-------|
| `./scripts/migrate.sh run` | Chay tat ca migrations chua apply |
| `./scripts/migrate.sh revert` | Revert migration gan nhat |
| `./scripts/migrate.sh generate TenMigration` | Generate migration tu entity changes |
| `./scripts/migrate.sh seed` | Seed admin user + initial data |

### Luu y
- Migration file chay **1 lan duy nhat** — KHONG sua migration da apply
- Neu can thay doi, tao migration MOI
- Luon test migration tren dev truoc khi merge

---

## 4. Testing Workflow

### Backend tests

```bash
cd backend

# Unit tests
npm test

# Unit tests (watch mode)
npm run test:watch

# E2E tests (can MySQL + Redis dang chay)
npm run test:e2e

# Coverage report
npm run test:cov
```

### Frontend E2E tests (Playwright)

```bash
cd frontend

# Chay tat ca e2e tests (can backend running)
npx playwright test

# Xem browser khi test
npx playwright test --headed

# Chay 1 file test cu the
npx playwright test e2e/auth.spec.ts

# Xem report HTML
npx playwright show-report
```

### Test files hien co
**Backend E2E:**
- `backend/test/app.e2e-spec.ts` — App health check
- `backend/test/auth.e2e-spec.ts` — Login, register, refresh token
- `backend/test/users.e2e-spec.ts` — CRUD users
- `backend/test/products.e2e-spec.ts` — CRUD products
- `backend/test/orders.e2e-spec.ts` — Order flow

**Frontend E2E:**
- `frontend/e2e/auth.spec.ts` — Login, register UI
- `frontend/e2e/admin.spec.ts` — Admin panel navigation
- `frontend/e2e/public.spec.ts` — Public pages rendering

---

## 5. Git Convention

### Branch naming
| Prefix | Khi nao |
|--------|---------|
| `feat/` | Feature moi |
| `fix/` | Sua bug |
| `refactor/` | Refactor, khong doi behavior |
| `chore/` | Config, deps, CI/CD |
| `docs/` | Documentation |
| `test/` | Them/sua tests |

### Commit message format
```
type(scope): mo ta ngan gon

Vi du:
feat(products): them filter theo gia va danh muc
fix(auth): sua loi refresh token het han
refactor(cart): tach logic tinh tong vao utils
chore(deps): update next.js len 14.2
docs(api): them JSDoc cho auth endpoints
test(orders): them e2e test cho order flow
```

### Branch workflow
```
main (production-ready)
  └── feat/product-filter     # feature branch
  └── fix/login-redirect      # bugfix branch
```

---

## 6. Code Review Checklist

Khi review PR, kiem tra tat ca cac muc sau:

### Functionality
- [ ] Logic dung theo yeu cau
- [ ] Edge cases da xu ly (null, empty, invalid input)
- [ ] Error messages than thien bang tieng Viet (user-facing)

### Security
- [ ] SQL injection: dung parameterized queries / TypeORM
- [ ] XSS: sanitize input, escape output
- [ ] CSRF: dung JWT + cookie settings dung
- [ ] Authorization: kiem tra role truoc moi action
- [ ] Sensitive data: KHONG log passwords, tokens

### Performance
- [ ] Pagination cho list endpoints (khong tra tat ca)
- [ ] Database index cho cot thuong query
- [ ] Redis cache cho data it thay doi
- [ ] Image optimization (Sharp + lazy loading)

### Validation
- [ ] Validation o ca Frontend (Zod) va Backend (class-validator)
- [ ] Validation rules DONG BO giua FE va BE:
  - Email: valid format, required
  - Password: min 8 chars, 1 uppercase, 1 number, 1 special char
  - Phone: 10-11 digits, bat dau bang 0
  - Price: so duong
  - Name: 2-100 ky tu

### UI/UX
- [ ] Responsive (mobile-first)
- [ ] Loading states khi fetch data
- [ ] Error states khi API fail
- [ ] Empty states khi khong co data
- [ ] Print-friendly (admin reports)

### Code Quality
- [ ] Moi function > 20 dong co comment muc dich
- [ ] Comment business logic bang tieng Viet
- [ ] Comment technical/API bang tieng Anh
- [ ] Khong co dead code, console.log con sot
- [ ] Test coverage cho logic quan trong

---

## 7. Validation Rules (FE + BE dong bo)

| Truong | Rule | Error message (tieng Viet) |
|--------|------|---------------------------|
| Email | Valid format, required | "Email khong hop le" |
| Password | Min 8, 1 uppercase, 1 number, 1 special | "Mat khau phai co it nhat 8 ky tu, 1 chu hoa, 1 so, 1 ky tu dac biet" |
| Phone | 10-11 digits, starts with 0 | "So dien thoai khong hop le" |
| Price | Positive number | "Gia phai la so duong" |
| Name | 2-100 chars | "Ten phai tu 2 den 100 ky tu" |

---

## 8. Deploy Workflow

### Development
```bash
./deploy.sh dev
# Chi start MySQL + Redis, install deps, run migrations
# Developer tu chay backend va frontend
```

### Staging
```bash
./deploy.sh staging
# Build Docker images + start tat ca containers
```

### Production (VPS rieng)
```bash
./deploy.sh prod
# Build images, stop old containers, start moi
# Co safety check: khong cho deploy voi default JWT secrets
```

### Shared VPS (chung infra)
```bash
./deploy.sh shared
# Chi build + start backend + frontend
# Dung shared MySQL/Redis/Nginx tu docker-compose.shared-infra.yml
```

Xem chi tiet tung mode trong [DEPLOY-GUIDE.md](./DEPLOY-GUIDE.md).
