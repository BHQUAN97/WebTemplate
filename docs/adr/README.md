# WebTemplate — Architecture Decision Records

> **Starter kit / template repo** cho e-commerce, SaaS, CMS hybrid. ADR tai day ghi lai ly do thiet ke template nay nhu vay → khi fork, dev hieu duoc intent va tradeoff.

## Index

- [ADR-0001](0001-monorepo-next-nest.md) — Monorepo Next.js 14 + NestJS 10 + TypeORM + MySQL 8
- [ADR-0002](0002-base-entity-ulid-soft-delete.md) — BaseEntity bat buoc: ULID + timestamps + soft delete
- [ADR-0003](0003-base-service-crud-hooks.md) — BaseService Template Method voi hooks (beforeSave/validate/afterSave)
- [ADR-0004](0004-30-modules-batteries-included.md) — 30+ modules pre-built (batteries-included philosophy)
- [ADR-0005](0005-four-docker-compose-modes.md) — 4 docker-compose: dev, prod, shared-infra, shared-vps
- [ADR-0006](0006-zero-downtime-deploy-auto-rollback.md) — deploy.sh zero-downtime + health check + auto-rollback
- [ADR-0007](0007-validation-sync-be-fe.md) — Validation uniform BE (class-validator) + FE (Zod) — sync rules
- [ADR-0008](0008-jwt-refresh-rotation-2fa.md) — JWT access 15m + refresh 7d rotation + TOTP 2FA + OAuth
- [ADR-0009](0009-zustand-over-redux.md) — Zustand + React Hook Form + Zod (khong Redux, khong React Query)
- [ADR-0010](0010-docs-first-9900-words.md) — Docs-first: 9,900 words documentation lam spec cho developer
- [ADR-0011](0011-multi-tenant-ready.md) — Multi-tenant ready (Tenants, API Keys, Webhooks modules)
- [ADR-0012](0012-bullmq-async-jobs.md) — BullMQ cho async jobs (email, image processing, export)
- [ADR-0013](0013-required-immutable-modules.md) — Auth/Users/Settings/Logs la required, khong duoc xoa
