# ADR-0005: 4 docker-compose modes (dev / prod / shared-infra / shared-vps)

- **Status**: accepted
- **Date**: 2026-03-01
- **Tags**: infra, deployment

## Context

Template se deploy theo nhieu scenario:
1. **Dev local** — chay npm, docker chi can DB/Redis
2. **Production single server** — dong goi tat ca tren 1 VPS
3. **Shared VPS** — nhieu project chia se MySQL/Redis/Nginx (CROSS-0001)
4. **Shared VPS per-project layer** — chi deploy app layer, dung shared infra

Neu 1 file docker-compose.yml cho tat ca → co flag env overgrown. Neu per-repo chon mode → phai tao scratch moi lan.

## Decision

**4 file docker-compose** trong repo, chay theo scenario:

### 1. `docker-compose.yml` (DEV)
- MySQL (127.0.0.1:6002) + Redis (127.0.0.1:6003)
- KHONG chay app — user npm trong frontend/backend
- Loopback binding = safe tren public IP
- Command: `docker compose up -d`

### 2. `docker-compose.prod.yml` (ALL-IN-ONE)
- MySQL + Redis + Backend + Frontend + Nginx (all containerized)
- Single VPS, nginx expose :80/:443
- Command: `./deploy.sh prod` → full stack

### 3. `docker-compose.shared-infra.yml` (INFRA LAYER)
- Shared MySQL + Redis + Nginx + Certbot
- Deploy 1 lan per VPS, multiple project attach
- Command: `docker compose -f docker-compose.shared-infra.yml up -d`

### 4. `docker-compose.shared-vps.yml` (APP LAYER)
- Chi Backend + Frontend, KHONG DB/infra
- Connect den shared MySQL/Redis/Nginx qua external network
- Command: `./deploy.sh shared`

## Rationale

- 4 file = 4 muc dich ro rang, khong flag magic
- User doc ten file la biet scenario
- deploy.sh pick dung file theo `$1` arg (dev/staging/prod/shared)
- Shared architecture re-use cho nhieu project (CROSS-0001)

## Consequences

### Tich cuc
- **Flexibility** cho solo dev: dev local → prod single → migrate shared
- Docs clear (DEPLOY-GUIDE.md 757 lines)
- KHONG manual copy/edit file khi chuyen mode

### Tieu cuc
- 4 file maintain (neu them env bien can sua 4 cho)
- Moi user phai doc docs de chon dung mode

### Rui ro
- **Config drift** giua 4 file → mitigation: env bien trong `.env` shared, docker-compose chi khac networks/services

## Alternatives Considered

### 1 file voi profile/env overrides
- **Uu**: DRY
- **Nhuoc**: qua phuc tap, Docker Compose profile it quen thuoc

### Kubernetes manifests
- **Uu**: scalable
- **Nhuoc**: over-engineer cho solo dev

### Serverless (Vercel + Railway)
- **Uu**: zero ops
- **Nhuoc**: chi phi, vendor lock-in

## Implementation Notes

- `deploy.sh` 307 lines — pick dung docker-compose file theo mode arg
- Each file co comment header giai thich muc dich

## References

- docs/DEPLOY-GUIDE.md
- Related: ADR-0006 (deploy.sh), CROSS-0001 (shared VPS)
