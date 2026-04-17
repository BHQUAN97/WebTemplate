#!/bin/bash
# ============================================================================
# WebTemplate — Deploy Script
#
# Usage:
#   ./deploy.sh [dev|staging|prod|shared] [flags]
#
# Flags:
#   --skip-migrate    Bo qua migration (hotfix khong lien quan DB schema)
#   --skip-build      Dung image hien tai, chi restart services
#   --rollback        Rollback ve deploy truoc (doc .deploy/last-sha)
#   --yes             Bo qua tat ca prompt confirm
#
# Zero-downtime:
#   Thay vi `down && up`, script dung `up -d --no-deps --build <service>`
#   de recreate chi app services (backend, frontend) — giu nguyen MySQL/Redis.
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ENV="dev"
SKIP_MIGRATE=0
SKIP_BUILD=0
ROLLBACK=0
ASSUME_YES=0

# Parse args
for arg in "$@"; do
  case "$arg" in
    dev|staging|prod|shared) ENV="$arg" ;;
    --skip-migrate) SKIP_MIGRATE=1 ;;
    --skip-build)   SKIP_BUILD=1 ;;
    --rollback)     ROLLBACK=1 ;;
    --yes|-y)       ASSUME_YES=1 ;;
    *) ;;
  esac
done

PROJECT_NAME="webtemplate"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEPLOY_STATE_DIR="${SCRIPT_DIR}/.deploy"
LAST_SHA_FILE="${DEPLOY_STATE_DIR}/last-sha"
mkdir -p "$DEPLOY_STATE_DIR"

log()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }

# ============================================================================
# 1. Validate env
# ============================================================================
case "$ENV" in
  dev|staging|prod|shared) info "Deploying for environment: ${ENV}" ;;
  *) error "Invalid environment: $ENV. Use: dev, staging, prod, shared" ;;
esac

# ============================================================================
# 2. Prerequisites
# ============================================================================
info "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || error "Docker is not installed"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "Docker Compose is not installed"
fi

log "Docker: $(docker --version | head -1)"
log "Compose: $($COMPOSE_CMD version 2>/dev/null | head -1)"

# ============================================================================
# 3. Git state + rollback target
# ============================================================================
GIT_AVAILABLE=0
CURRENT_SHA=""
if command -v git >/dev/null 2>&1 && [ -d "$SCRIPT_DIR/.git" ]; then
  GIT_AVAILABLE=1
  CURRENT_SHA="$(git -C "$SCRIPT_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
  log "Git HEAD: $CURRENT_SHA"
fi

# Rollback flow — early exit
if [ "$ROLLBACK" -eq 1 ]; then
  [ "$GIT_AVAILABLE" -eq 1 ] || error "Rollback requires a git repo"
  [ -s "$LAST_SHA_FILE" ] || error "No previous SHA recorded at $LAST_SHA_FILE"
  PREV_SHA="$(cat "$LAST_SHA_FILE")"
  info "Rolling back to $PREV_SHA..."
  git -C "$SCRIPT_DIR" checkout "$PREV_SHA" || error "Git checkout failed"
  SKIP_MIGRATE=1   # KHONG migrate khi rollback code
fi

# ============================================================================
# 4. Pull latest (skip khi rollback)
# ============================================================================
if [ "$GIT_AVAILABLE" -eq 1 ] && [ "$ROLLBACK" -eq 0 ]; then
  info "Pulling latest code..."
  cd "$SCRIPT_DIR"
  git pull --rebase 2>/dev/null && log "Code updated" || warn "Git pull skipped (not on tracking branch)"
fi

# ============================================================================
# 5. .env setup + prod safety
# ============================================================================
cd "$SCRIPT_DIR"

if [ "$ENV" = "prod" ]; then
  ENV_FILE=".env.production"
else
  ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example "$ENV_FILE"
    warn "Created $ENV_FILE from .env.example — review and update secrets!"
    [ "$ENV" = "prod" ] && error "Production deploy requires configured $ENV_FILE. Edit it and re-run."
  else
    error ".env.example not found"
  fi
else
  log "$ENV_FILE exists"
fi

if [ "$ENV" = "prod" ]; then
  grep -q "your-access-secret-change-me\|generate_with_openssl" "$ENV_FILE" && \
    error "JWT_ACCESS_SECRET still has default/placeholder value in $ENV_FILE"
  grep -q "your-refresh-secret-change-me" "$ENV_FILE" && \
    error "JWT_REFRESH_SECRET still has default value in $ENV_FILE"
  grep -q "CHANGE_ME" "$ENV_FILE" && \
    error "$ENV_FILE still contains CHANGE_ME placeholders — set strong values before deploy"
fi

# ============================================================================
# 6. Migrations (neu applicable)
# ============================================================================
run_migrations() {
  [ "$SKIP_MIGRATE" -eq 1 ] && { warn "Skipping migrations (--skip-migrate)"; return 0; }
  if [ -x "$SCRIPT_DIR/scripts/migrate.sh" ]; then
    info "Running migrations..."
    CI="${CI:-true}" "$SCRIPT_DIR/scripts/migrate.sh" run || warn "Migration run returned non-zero"
  else
    warn "scripts/migrate.sh not found — skipping"
  fi
}

# ============================================================================
# 7. Healthcheck retry helper
# ============================================================================
wait_healthy() {
  local url="$1"
  local label="$2"
  local max="${3:-60}"
  local i=0
  while [ "$i" -lt "$max" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "$label healthy"
      return 0
    fi
    i=$((i + 1))
    sleep 1
  done
  return 1
}

# ============================================================================
# 8. Rollback trigger — auto goi khi health fail sau deploy
# ============================================================================
auto_rollback() {
  warn "Health check FAILED — attempting rollback"
  if [ "$GIT_AVAILABLE" -eq 1 ] && [ -s "$LAST_SHA_FILE" ]; then
    local prev
    prev="$(cat "$LAST_SHA_FILE")"
    info "Reverting code to $prev..."
    git -C "$SCRIPT_DIR" checkout "$prev" || warn "git checkout $prev failed"
    info "Re-building previous version..."
    $COMPOSE_CMD -f docker-compose.prod.yml up -d --no-deps --build backend frontend || true
  else
    warn "No last-sha recorded — manual rollback required"
  fi
  error "Deploy failed, rollback attempted. Check: docker logs wt-backend"
}

# ============================================================================
# 9. Deploy per environment
# ============================================================================
case "$ENV" in
  dev)
    info "Starting development environment..."
    $COMPOSE_CMD -f docker-compose.yml up -d
    log "MySQL (127.0.0.1:6002) and Redis (127.0.0.1:6003) started"

    if [ ! -d "backend/node_modules" ]; then
      info "Installing backend deps..."
      (cd backend && npm install)
    fi
    if [ ! -d "frontend/node_modules" ]; then
      info "Installing frontend deps..."
      (cd frontend && npm install)
    fi

    run_migrations

    echo ""
    log "Development environment ready!"
    echo "  Start backend:   cd backend && npm run start:dev"
    echo "  Start frontend:  cd frontend && npm run dev"
    ;;

  staging|prod)
    COMPOSE_FILE="docker-compose.prod.yml"

    # Build step (skip neu flag)
    if [ "$SKIP_BUILD" -eq 0 ]; then
      info "Building images (APP_VERSION=$CURRENT_SHA)..."
      APP_VERSION="$CURRENT_SHA" $COMPOSE_CMD -f "$COMPOSE_FILE" build \
        --build-arg APP_VERSION="$CURRENT_SHA" || error "Build failed"
      log "Images built with tag $CURRENT_SHA"
    fi

    # Zero-downtime: recreate chi backend + frontend (khong dung MySQL/Redis)
    info "Deploying (zero-downtime, no-deps)..."
    APP_VERSION="$CURRENT_SHA" $COMPOSE_CMD -f "$COMPOSE_FILE" up -d \
      --no-deps backend frontend || error "Service recreate failed"

    # Ensure MySQL/Redis/Nginx dang chay (idempotent)
    APP_VERSION="$CURRENT_SHA" $COMPOSE_CMD -f "$COMPOSE_FILE" up -d mysql redis nginx || true

    # Migration sau khi backend co code moi nhung truoc khi goi live
    run_migrations

    # Health check + rollback
    info "Waiting for health (60s)..."
    if wait_healthy "http://127.0.0.1:6001/api" "Backend" 60 && \
       wait_healthy "http://127.0.0.1:6000" "Frontend" 60; then
      log "All services healthy"
      # Ghi current SHA lam last-sha CHI KHI deploy thanh cong
      [ "$GIT_AVAILABLE" -eq 1 ] && echo "$CURRENT_SHA" > "$LAST_SHA_FILE" && log "Recorded last-sha=$CURRENT_SHA"
    else
      [ "$ROLLBACK" -eq 1 ] && error "Rollback deploy also failed"
      auto_rollback
    fi
    ;;

  shared)
    info "Deploying on shared VPS..."
    docker network inspect shared-net >/dev/null 2>&1 || {
      info "Creating shared-net network..."
      docker network create shared-net
    }
    docker ps --format '{{.Names}}' | grep -q '^shared-mysql$' || \
      error "shared-mysql not running. Start: docker compose -f docker-compose.shared-infra.yml up -d"

    if [ "$SKIP_BUILD" -eq 0 ]; then
      info "Building shared-vps images (APP_VERSION=$CURRENT_SHA)..."
      APP_VERSION="$CURRENT_SHA" $COMPOSE_CMD -f docker-compose.shared-vps.yml build \
        --build-arg APP_VERSION="$CURRENT_SHA" || error "Build failed"
    fi

    APP_VERSION="$CURRENT_SHA" $COMPOSE_CMD -f docker-compose.shared-vps.yml up -d \
      --no-deps backend frontend || error "Recreate failed"

    run_migrations

    docker exec shared-nginx nginx -s reload 2>/dev/null && log "Nginx reloaded" || warn "Nginx reload failed"

    if wait_healthy "http://127.0.0.1:6001/api" "Backend (shared)" 60; then
      [ "$GIT_AVAILABLE" -eq 1 ] && echo "$CURRENT_SHA" > "$LAST_SHA_FILE"
      log "Shared deploy healthy (tag=$CURRENT_SHA)"
    else
      auto_rollback
    fi
    ;;
esac

# ============================================================================
# 10. Status summary
# ============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN} WebTemplate — ${ENV} deployment complete${NC}"
echo "=========================================="
[ -n "$CURRENT_SHA" ] && echo " Deployed SHA: $CURRENT_SHA"
echo ""
if [ "$ENV" != "dev" ]; then
  $COMPOSE_CMD -f docker-compose.prod.yml ps 2>/dev/null || true
fi
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost:6000"
echo "  Backend:   http://localhost:6001"
echo ""
echo "Commands:"
echo "  Rollback:  ./deploy.sh $ENV --rollback"
echo "  Logs:      docker logs -f wt-backend"
echo ""
