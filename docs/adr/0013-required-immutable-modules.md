# ADR-0013: Auth/Users/Settings/Logs la required, khong duoc xoa

- **Status**: accepted
- **Date**: 2026-02-15
- **Tags**: template-philosophy

## Context

Template co 30+ module (ADR-0004). Developer fork co the xoa cai khong can. Nhung co 4 module neu xoa → app khong chay duoc hoac break patterns khac:

- **Auth**: Moi module khac dung `@UseGuards(JwtAuthGuard)` → xoa Auth = app fail
- **Users**: JWT payload chua userId → query Users → xoa = auth chet
- **Settings**: Cau hinh (tenant, feature flag, theme...) — module khac doc → xoa = fallback khong co
- **Logs**: Audit trail tat ca action → compliance requirement

Neu khong ghi ro → developer fork roi xoa Users vi "toi khong can user profile" → app crash.

## Decision

Tuyen bo 4 module la **required, immutable**:

### CLAUDE.md noi ro
```
Required modules (immutable): Auth, Users, Settings, Logs — khong duoc xoa
```

### Code enforcement
- `backend/src/app.module.ts` import 4 module nay, comment "// REQUIRED - do not remove"
- Service khac inject `UsersService`, `SettingsService` → TS compile error neu xoa

### Co the CUSTOMIZE
- Them field vao User entity (profile, preferences)
- Them setting key
- Override auth strategy (dung OAuth only, tat password)
- Filter log (khong luu PII)

Nhung **khong xoa** file module.

## Rationale

- 4 module la **foundation** — xoa = architecture thay doi fundamental
- Ghi ro trong CLAUDE.md tranh confusion
- Co the customize → khong han che developer

## Consequences

### Tich cuc
- Fork safe: khong the xoa nham va crash app
- Pattern consistency: moi fork co auth + audit
- Documentation 1 lan (tat ca fork co)

### Tieu cuc
- Developer khong can Users (vd: public-only site) van phai keep → co the feel "bloat"
- Settings module it dung se idle

### Rui ro
- **Developer xoa manual** despite docs → mitigation: runtime check — neu `UsersModule` khong load, throw `REQUIRED_MODULE_MISSING` startup error

## Alternatives Considered

### Khong enforce, chi ghi docs
- **Nhuoc**: developer bypass → crash

### Xoa duoc voi flag
- **Nhuoc**: phuc tap, ai cung co the chon flag sai

### Package rieng 4 module, import NPM
- **Uu**: "cant delete"
- **Nhuoc**: template phi-sense (muc dich la "fork and edit")

## Implementation Notes

- `backend/src/app.module.ts` list imports co comment
- Startup check trong `main.ts` warn neu module missing

## References

- CLAUDE.md "Required modules" section
- Related: ADR-0004 (batteries included)
