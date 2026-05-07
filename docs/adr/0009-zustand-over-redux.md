# ADR-0009: Zustand + React Hook Form + Zod (khong Redux, khong React Query)

- **Status**: accepted
- **Date**: 2026-02-15
- **Tags**: frontend, state-management

## Context

React state options:
- **Redux Toolkit**: industry standard, boilerplate nhieu
- **Zustand**: minimal, 1KB
- **Jotai/Recoil**: atomic
- **Context + useReducer**: native nhung re-render dau

Data fetching:
- **React Query**: caching + refetch tot
- **SWR**: giong React Query
- **Raw fetch**: simple

Forms:
- **Formik**: old
- **React Hook Form**: performant, tich hop tot Zod

## Decision

### State: Zustand
- `auth` store: user, accessToken, isAuthenticated
- `cart` store: items, total
- `user` store: profile, preferences
- `notifications` store: list, unread count

### Forms: React Hook Form + Zod
- `useForm({ resolver: zodResolver(schema) })`
- Instant validation, minimal re-render

### Data fetching: Raw fetch + custom hook
- `useFetch` hook wrap fetch voi loading/error state
- KHONG React Query (tha them sau khi can caching thuc su)

## Rationale

- **Zustand**: 1KB, no provider nesting, easy to learn
- **RHF + Zod**: schema reuse voi BE rule (ADR-0007)
- **Raw fetch**: template khong biet app can caching muc nao → de developer fork them React Query sau

## Consequences

### Tich cuc
- Bundle nho (~100KB smaller than Redux + RTK Query)
- Learning curve thap
- Form state centralized, errors typed

### Tieu cuc
- Khong co auto-caching (GET API goi lai moi mount)
- Khong co optimistic update built-in
- Developer quen Redux phai re-learn

### Rui ro
- **Scaling issue**: app lon co the can React Query → mitigation: docs khuyen khi nao add

## Alternatives Considered

### Redux Toolkit + RTK Query
- **Uu**: standard, caching
- **Nhuoc**: boilerplate gap 3x Zustand

### Jotai
- **Uu**: atomic, fine-grained
- **Nhuoc**: learning curve, template user chua quen

### Context only
- **Nhuoc**: re-render toan cay

## Implementation Notes

- `frontend/src/lib/stores/` — Zustand stores
- `frontend/src/lib/validations/` — Zod schemas (share voi BE qua `.shared/`)
- `frontend/src/lib/hooks/useFetch.ts`

## References

- docs/BASE-PATTERNS.md — frontend patterns
