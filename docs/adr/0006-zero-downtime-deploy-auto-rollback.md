# ADR-0006: deploy.sh zero-downtime + health check + auto-rollback

- **Status**: accepted
- **Date**: 2026-03-01
- **Tags**: devops, reliability

## Context

Solo dev deploy tay bi rui ro:
- Forget migration → app crash post-deploy
- Build moi co bug → production down, khong co rollback
- User dang shop → dung service → mat don

Can 1 script xu ly:
- Pre-check
- Migration
- Rebuild + restart **khong downtime**
- Verify health
- Auto rollback neu fail

## Decision

**`deploy.sh` 307 dong** tai repo root:

### Pre-deploy
1. `docker --version` check
2. `git pull origin main` (neu mode=prod/shared)
3. `.env` validation (nhat la prod: check JWT_SECRET != default)

### Migration
```bash
./scripts/migrate.sh run  # TypeORM migrations up
```

### Zero-downtime rebuild
```bash
docker compose up -d --no-deps backend frontend
# --no-deps: khong recreate MySQL/Redis (giu data)
# up -d: rolling restart (moi container 1 lan)
```

### Health check (60s retry)
```bash
for i in {1..60}; do
  if curl -f http://localhost:$BE_PORT/api && curl -f http://localhost:$FE_PORT; then
    break
  fi
  sleep 1
done
```

### Auto-rollback
```bash
if health_check_failed; then
  PREV_SHA=$(cat .deploy/last-sha)
  git checkout "$PREV_SHA"
  ./scripts/migrate.sh rollback  # neu migration
  docker compose up -d --no-deps backend frontend
fi
```

### Modes (arg $1)
- `dev` — npm install + start (no docker app)
- `staging` — giong prod nhung other domain
- `prod` — full flow
- `shared` — apply `docker-compose.shared-vps.yml`, reload nginx

### State tracking
- `.deploy/last-sha` — SHA cua lan deploy success gan nhat → dung cho rollback

## Rationale

- Zero-downtime: `--no-deps` + rolling restart = 1-2 second gap, user khong nhan biet
- Health check > 60s reliable
- Auto-rollback: solo dev khong 24/7 monitor, roi rui ro manual intervention
- Git-based rollback: khong can tag/version complex

## Consequences

### Tich cuc
- `./deploy.sh prod` 1 lenh = deploy an toan
- Fail = auto rollback, khong can user action
- Audit trail via `.deploy/last-sha` + git log

### Tieu cuc
- Rollback khong xu ly DB migration down neu migration khong reversible → can user handle
- 60s retry = co luc wait, khong instant feedback

### Rui ro
- **Health check false positive** (health OK nhung bug logic) → mitigation: smoke test post-deploy (optional)
- **Rollback khong data-safe** (migration forward, du lieu moi → rollback code, schema co the incompat) → mitigation: migrate only 1 version per deploy, manual DB revert

## Alternatives Considered

### Manual deploy
- **Nhuoc**: error-prone

### Blue-green deploy
- **Uu**: 0 downtime
- **Nhuoc**: 2x VPS resource

### GitHub Actions + SSH deploy
- **Uu**: CI/CD chuan
- **Nhuoc**: them setup, nhung template CAN co local script de chay tay

## Implementation Notes

- `deploy.sh` tai repo root
- `scripts/migrate.sh` — TypeORM migration wrapper
- `.deploy/last-sha` — gitignored

## References

- docs/DEPLOY-GUIDE.md
- Related: ADR-0005 (docker modes)
