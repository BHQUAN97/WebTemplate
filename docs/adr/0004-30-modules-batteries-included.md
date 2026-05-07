# ADR-0004: 30+ modules pre-built (batteries-included philosophy)

- **Status**: accepted
- **Date**: 2026-02-15
- **Tags**: scope, template-philosophy

## Context

Cau hoi thiet ke template: **Empty skeleton** (chi auth + users, user tu build) hay **Batteries-included** (pre-build nhieu module, user xoa cai khong can)?

- Empty skeleton: flexible, khong bloat
- Batteries-included: fork = chay duoc ngay, tiet kiem tuan

Target user: solo dev/small team muon launch **nhanh**. Khong phai dev enterprise can custom moi thu.

## Decision

**Batteries-included** voi 30+ modules chia 5 group:

### Core (required, khong xoa duoc — xem ADR-0013)
- Auth, Users, Settings, Logs

### E-commerce
- Products, Categories, Cart, Orders, Payments (Stripe + MoMo ready), Reviews, Promotions, Loyalty, Inventory, Shipping

### CMS
- Articles, Pages, Navigation, FAQ, Contacts, Media, SEO, i18n

### SaaS
- Tenants (multi-tenancy), Plans (subscription tiers), API Keys, Webhooks, Email Templates, Notifications

### Ops
- Analytics, Search (Meilisearch-ready), Export/Import (Excel, CSV, PDF), Audit

Template cover **3 use case common**:
1. **E-commerce**: xoa CMS/SaaS modules, giu e-commerce
2. **SaaS**: xoa e-commerce, giu SaaS + CMS
3. **Hybrid**: giu tat ca

## Rationale

- Fork = production-ready trong 1 ngay (vs 1 thang tu build)
- Modules follow BaseEntity/BaseService → xoa = don gian
- Docs (ADR-0010) huong dan xoa module khong can
- Solo dev = tiet kiem thoi gian > bundle size

## Consequences

### Tich cuc
- Time to first feature: **1 ngay** thay vi 1-2 tuan
- Quality cao: module da test, co docs
- Pattern reference: module X lam the nao = tham khao module Y
- Onboarding fast

### Tieu cuc
- Repo **nang**: ~300+ file backend, ~250+ file frontend
- Bundle size lon neu khong tree-shake
- "Unused code" feel khi dev chi can 1 module

### Rui ro
- **Modules conflict** (Products khong compatible voi Tenants neu xoa Tenants) → mitigation: docs FLOWS.md cap 12 flow, liet ke dependency
- **Security**: 30 modules = 30 attack surface → mitigation: `/security` audit agent

## Alternatives Considered

### Empty skeleton (minimal)
- **Nhuoc**: dev phai build tu dau nhieu thu

### Plugin system (install module per project)
- **Uu**: chi lay cai can
- **Nhuoc**: phuc tap plugin registry, module khong stable

### Fork-then-strip (nhu hien tai)
- **Uu**: chosen

## Implementation Notes

- README `Module Groups` section list day du
- docs/BUSINESS-FEATURES.md (1,339 lines) mo ta 12 flow

## References

- docs/MODULES.md — 29 modules reference
- Related: ADR-0013 (core modules immutable)
