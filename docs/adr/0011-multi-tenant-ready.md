# ADR-0011: Multi-tenant ready (Tenants + API Keys + Webhooks modules)

- **Status**: accepted
- **Date**: 2026-03-20
- **Tags**: saas, architecture

## Context

Template muon serve ca SaaS use case. SaaS = multi-tenant — 1 instance, nhieu khach hang (tenant) rieng biet.

3 architecture patterns:
1. **DB rieng per tenant** — isolate nhat, ton resource
2. **Schema rieng** (cung DB, khac schema) — isolation vua
3. **Shared schema + tenant_id column** — don gian, scale tot

## Decision

Default pattern **shared schema + tenant_id** + 3 module ho tro:

### Tenants module
- `tenants` table: id, name, slug, plan_id, settings JSON, status
- Middleware `TenantMiddleware` — extract tenant tu subdomain (`acme.app.com`) hoac header `X-Tenant-Id`
- Gan tenant_id vao mọi truy van qua TypeORM scope

### API Keys module
- `api_keys` table: tenant_id, key_hash (bcrypt), scopes, expires_at, last_used_at
- Guard `ApiKeyGuard` — xac thuc header `X-API-Key`
- User-facing dashboard: generate/revoke key
- Rate limit per-key

### Webhooks module
- `webhooks` table: tenant_id, event, url, secret, active
- Event bus emit → find matching webhook → retry 3x voi exponential backoff
- HMAC signature header `X-Webhook-Signature`

### Multi-tenant "off" mode
- Template chay single-tenant: khong dung Tenants module
- `TENANT_MODE=single` trong .env → skip tenant middleware

## Rationale

- Shared schema cho solo/small SaaS: scale 1000+ tenant trong 1 DB OK
- API Keys + Webhooks la standard SaaS feature, it repo tu viet
- Off mode = template van chay duoc cho non-SaaS app

## Consequences

### Tich cuc
- Fork = SaaS-ready (nhieu tuan viec viet tay)
- Tenants management built-in
- Developer focus product, khong phai tenant plumbing

### Tieu cuc
- Phuc tap them (non-SaaS app khong can)
- `tenant_id` column moi table → storage overhead
- Query khong filter tenant_id → data leak (security risk)

### Rui ro
- **Missing tenant filter**: service khong join tenant_id → cross-tenant data leak → mitigation: BaseService enforce, ESLint rule
- **Noisy neighbor**: 1 tenant heavy query lam cham tenant khac → mitigation: rate limit per-tenant, DB index tren tenant_id

## Alternatives Considered

### DB rieng per tenant
- **Uu**: isolate 100%
- **Nhuoc**: scaling, backup cost

### Schema rieng
- **Uu**: middle ground
- **Nhuoc**: MySQL schema = DB → khong ap dung, Postgres moi lam duoc

### Khong multi-tenant (chi single)
- **Nhuoc**: khong cover SaaS use case

## Implementation Notes

- `backend/src/modules/tenants/`
- `backend/src/common/middleware/tenant.middleware.ts`
- docs/FLOWS.md "Multi-Tenant Flow"

## References

- docs/BUSINESS-FEATURES.md Tenants section
