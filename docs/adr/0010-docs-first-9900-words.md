# ADR-0010: Docs-first — 9,900 words documentation lam spec cho developer

- **Status**: accepted
- **Date**: 2026-03-15
- **Tags**: docs, template-philosophy

## Context

Template = code tai su dung. Neu chi co code khong co docs:
- Developer fork phai tu doc tung file
- Intent/why khong ro → khi sua se break
- Support cost cao

Template gia tri cao = **code + docs day du**.

## Decision

**14 tai lieu** tai `docs/` tong ~9,900 word:

| Doc | Lines | Muc dich |
|---|---|---|
| TECH-OVERVIEW.md | 434 | Stack deep-dive, framework comparison |
| **BASE-PATTERNS.md** | 1,844 | Critical: BaseEntity, BaseService, Guards, Zustand |
| **FLOWS.md** | 1,672 | 11 end-to-end flow (Auth, Order, Upload, CMS, Multi-tenant...) |
| BUSINESS-FEATURES.md | 1,339 | 12 module group, use case, data model, endpoint |
| WORKFLOW.md | 314 | Dev workflow, PR checklist |
| **DEPLOY-GUIDE.md** | 757 | 4 deployment mode, SSL, backup |
| INDEX.md | 717 | File-by-file index (~450 file) |
| API.md | 1,404 | All 100+ endpoint, request/response example |
| ARCHITECTURE.md | 284 | System diagram, auth flow |
| DATABASE.md | 275 | Schema convention, migration, index |
| MODULES.md | 404 | 29 module reference (deps, endpoints) |
| DEPLOYMENT.md | 381 | Prerequisites |
| CHANGELOG.md | 80 | Version history |
| DESIGN-SYSTEM.md | TBD | UI design token |

### Principles
- **WHY over WHAT**: giai thich ly do, khong chi what
- **Examples**: code snippet thuc te
- **Cross-reference**: link giua cac doc
- **Vietnamese business, English technical**

## Rationale

- Doc chinh la SPEC khi fork
- Developer co the onboard trong 1 ngay (vs 1 tuan)
- Support cost giam

## Consequences

### Tich cuc
- Fork = co full context
- Tu hoc pattern bang examples
- Search-friendly (grep keyword)
- Self-service, khong can hoi author

### Tieu cuc
- **Docs drift** khi code thay doi → risk lon nhat
- Maintenance cost: moi commit kiem tra docs

### Rui ro
- **Stale docs** → mitigation: PR template yeu cau "update docs neu co architectural change"
- **Over-document**: docs sai thanh habit → mitigation: review hang quarter

## Alternatives Considered

### Minimal docs (just README)
- **Nhuoc**: fork khong hieu intent

### Video tutorials
- **Uu**: engaging
- **Nhuoc**: maintenance 10x, khong searchable

### Auto-generated docs (JSDoc/TypeDoc)
- **Uu**: tu dong
- **Nhuoc**: khong giai thich WHY

## Implementation Notes

- docs/ o repo root
- PR check: co sua doc khong?

## References

- docs/INDEX.md for map
