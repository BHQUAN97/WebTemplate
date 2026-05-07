# ADR-0008: JWT access 15m + refresh 7d rotation + TOTP 2FA + OAuth

- **Status**: accepted
- **Date**: 2026-02-20
- **Tags**: security, auth

## Context

Template cho cac app khac nhau: e-commerce (nhieu user), SaaS (tenant dac biet), CMS (admin-only). Auth phai:
- Bao mat cao (2FA, short access token)
- UX tot (refresh tu dong, OAuth social)
- Chong stolen cookie / CSRF

## Decision

### JWT 2-token
- **Access token**: 15 phut, memory (khong cookie)
- **Refresh token**: 7 ngay, **httpOnly cookie**, bcrypt hash trong DB
- **Rotation**: moi lan refresh → cap access + refresh MOI, revoke token cu

### 2FA optional (TOTP)
- Library `otpauth`
- User bat 2FA → sinh secret, QR code, user scan vao Authenticator
- Login phai nhap 6-digit TOTP ngoai password

### OAuth social
- Google, Facebook (Passport strategy)
- Dat stateless: OAuth profile → create/link user → issue JWT

### Stolen cookie detection
- Moi request: so sanh IP + User-Agent fingerprint voi session
- Mismatch → invalidate session, force re-login

### Password reset
- Bcrypt-hashed token, TTL 1h
- Email link co token secret
- Iteration-safe compare

## Rationale

- 15m access → stolen access impact thap
- Rotation chong reuse stolen refresh token (theft detection: reuse old refresh = revoke all user session)
- TOTP standard (free, offline-capable)
- OAuth giam friction cho user moi

## Consequences

### Tich cuc
- Comply OWASP 2023+ standard
- Stolen cookie auto-invalidate
- Support 3 auth method (password, social, 2FA)

### Tieu cuc
- 2 token = more complexity (client phai handle)
- Refresh token table grow → can cleanup cron

### Rui ro
- **Clock skew** TOTP: server clock lech > 30s = code fail → mitigation: accept window ±1 step (±30s)
- **Refresh token DB bloat** → mitigation: cron weekly delete expired

## Alternatives Considered

### Session cookie only
- **Nhuoc**: khong mobile-friendly (React Native, app native)

### Long-lived JWT (7d access)
- **Nhuoc**: stolen = 7 day attack window

### Supabase Auth / Auth0
- **Uu**: managed
- **Nhuoc**: vendor lock-in, chi phi khi scale

## Implementation Notes

- `backend/src/modules/auth/`
- `backend/src/common/guards/jwt-auth.guard.ts`
- `@Public()` decorator skip auth cho public routes

## References

- docs/FLOWS.md "Auth Flow" section
- Related: LeQuyDon ADR-0002 (same pattern)
