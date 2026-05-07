# ADR-0001: Monorepo Next.js 14 + NestJS 10 + TypeORM + MySQL 8

- **Status**: accepted
- **Date**: 2026-02-01
- **Deciders**: BHQUAN97
- **Tags**: stack, template

## Context

Template muc tieu: solo dev/small team khoi tao e-commerce/SaaS/CMS trong **1-2 ngay thay vi 1-2 tuan**. Stack phai:
- Quen thuoc (TS ca 2 dau), gradual learning
- Phong phu ecosystem (mat hang HR de tim)
- Ho tro tot SSR (SEO cho e-commerce)
- Scale horizontal (Nest stateless)
- MySQL phobien hon PostgreSQL o thi truong VN

## Decision

**Monorepo** 1 git repo, 2 folder top-level:

```
WebTemplate/
├── frontend/        # Next.js 14 App Router, React 19
├── backend/         # NestJS 10, TypeORM, MySQL 8
├── nginx/           # Reverse proxy config
├── docs/            # 9,900 words doc (ADR-0010)
├── docker-compose.yml (dev)
├── docker-compose.prod.yml
├── docker-compose.shared-infra.yml
├── docker-compose.shared-vps.yml
├── deploy.sh
└── package.json     # root scripts
```

### Stack
- **Frontend**: Next.js 14 (App Router, standalone output, SSR), React 19, TypeScript 5, Tailwind 4, Radix UI
- **Backend**: NestJS 10, TypeORM 0.3, MySQL 8 (utf8mb4), Redis 7 + BullMQ
- **Both**: TypeScript strict, ESM (`.js` extension imports)

### Ports
- Frontend 6000, Backend 6001, MySQL 6002, Redis 6003

## Rationale

- Monorepo: 1 clone, 1 branch, 1 deploy → solo-friendly
- NestJS: decorator-based, DI → giong Spring Boot / ASP.NET, developer BE da quen concept
- Next.js: SSR out-of-box, App Router la huong tuong lai
- TypeORM: active record pattern de hoc, support MySQL tot
- MySQL: thi truong VN pho bien, VPS mac dinh

## Consequences

### Tich cuc
- Fork repo = co full stack
- Shared types de dang (FE/BE cung TS)
- Deploy 1 command
- Doc chung tap trung

### Tieu cuc
- Monorepo lon (>300 file) → clone cham lan dau
- Khong modular → muon chi FE/BE rieng phai tach tay

### Rui ro
- Stack loi thoi sau 2-3 nam → mitigation: ADR reference giup dev hieu intent de migrate

## Alternatives Considered

### Next.js + Prisma (fullstack, khong NestJS)
- **Uu**: 1 service, don gian
- **Nhuoc**: BE logic nang = Next.js API routes bi beo, khong tach scale duoc

### Nuxt.js + Laravel
- **Nhuoc**: Laravel PHP, team khong quen TS hon

### Remix + Fastify
- **Nhuoc**: Remix ecosystem nho hon, it resources

### Express + Vue 3
- **Nhuoc**: cho chi phoi Vue, Express routing khong structured bang Nest

## References

- Duoc dung boi: LeQuyDon, FashionEcom, VietNet2026
- Related: ADR-0002, ADR-0003
