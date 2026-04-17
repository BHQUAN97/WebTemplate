#!/bin/bash
# ============================================================================
# WebTemplate — Migration Script
#
# Usage: ./scripts/migrate.sh [run|revert|generate|seed] [name] [flags]
#
# Flags:
#   --yes          Skip confirm prompt (required tren PROD neu khong set CI=true)
#   --skip-backup  Skip auto backup truoc khi `run` tren prod
#
# Safety:
#   - Prompt confirm khi NODE_ENV=production (tru khi --yes hoac CI=true)
#   - Auto chay backup.sh truoc `run`/`revert` prod (tru khi --skip-backup)
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="${PROJECT_DIR}/backend"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }

COMMAND="${1:-run}"
shift || true

ASSUME_YES=0
SKIP_BACKUP=0
EXTRA_ARG=""

for arg in "$@"; do
  case "$arg" in
    --yes|-y)     ASSUME_YES=1 ;;
    --skip-backup) SKIP_BACKUP=1 ;;
    *) EXTRA_ARG="$arg" ;;
  esac
done

# Load env
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
elif [ -f "$PROJECT_DIR/.env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env.production"
  set +a
fi

# Validate NODE_ENV
NODE_ENV="${NODE_ENV:-development}"
case "$NODE_ENV" in
  development|staging|production) ;;
  *) error "Invalid NODE_ENV=$NODE_ENV (must be development|staging|production)" ;;
esac

# ============================================================================
# Safety: prompt on production for run/revert
# ============================================================================
requires_confirm() {
  local cmd="$1"
  [ "$NODE_ENV" != "production" ] && return 1
  case "$cmd" in run|revert) ;; *) return 1 ;; esac
  [ "$ASSUME_YES" -eq 1 ] && return 1
  [ "${CI:-}" = "true" ] && return 1
  return 0
}

if requires_confirm "$COMMAND"; then
  warn "You are about to run migration:$COMMAND on PRODUCTION (NODE_ENV=$NODE_ENV)"
  read -r -p "Continue? (y/N): " reply
  case "$reply" in
    y|Y|yes|YES) log "Confirmed" ;;
    *) error "Aborted" ;;
  esac
fi

# ============================================================================
# Auto backup truoc run/revert tren prod
# ============================================================================
if [ "$NODE_ENV" = "production" ] && [ "$SKIP_BACKUP" -eq 0 ]; then
  case "$COMMAND" in
    run|revert)
      if [ -x "$SCRIPT_DIR/backup.sh" ]; then
        info "Running pre-migration backup..."
        "$SCRIPT_DIR/backup.sh" || warn "Backup returned non-zero — review before continuing"
      else
        warn "backup.sh not executable — skipping pre-migration backup"
      fi
      ;;
  esac
fi

cd "$BACKEND_DIR"

info "Building backend..."
npm run build 2>/dev/null || error "Build failed"

DATASOURCE="dist/config/database.config.js"

case "$COMMAND" in
  run)
    info "Running pending migrations..."
    npx typeorm migration:run -d "$DATASOURCE" 2>&1 && log "Migrations applied" || warn "No pending migrations or migration failed"
    echo ""
    info "Migration history:"
    npx typeorm migration:show -d "$DATASOURCE" 2>/dev/null || warn "Could not show history"
    ;;

  revert)
    warn "Reverting last migration..."
    npx typeorm migration:revert -d "$DATASOURCE" 2>&1
    log "Last migration reverted"
    ;;

  generate)
    MIGRATION_NAME="${EXTRA_ARG:-AutoMigration}"
    info "Generating migration: $MIGRATION_NAME"
    npx typeorm migration:generate "src/database/migrations/$MIGRATION_NAME" -d "$DATASOURCE" 2>&1
    log "Migration generated at src/database/migrations/"
    ;;

  seed:chat)
    info "Seeding chat scenarios + schedules..."
    cd "$BACKEND_DIR"
    npm run seed:chat 2>&1 && log "Chat seed complete" || error "Chat seed failed"
    ;;

  seed)
    info "Seeding initial data..."
    ADMIN_EXISTS=$(npx ts-node -e "
      const { DataSource } = require('typeorm');
      const config = require('./dist/config/database.config.js');
      const ds = new DataSource(config.default || config);
      ds.initialize().then(async () => {
        const result = await ds.query(\"SELECT COUNT(*) as count FROM users WHERE role = 'admin'\");
        console.log(result[0].count > 0 ? 'yes' : 'no');
        await ds.destroy();
      }).catch(() => console.log('no'));
    " 2>/dev/null || echo "no")

    if [ "$ADMIN_EXISTS" = "yes" ]; then
      warn "Admin user already exists — skipping seed"
    else
      info "Creating admin user..."
      if [ -f "src/database/seeds/admin.seed.ts" ]; then
        npx ts-node src/database/seeds/admin.seed.ts 2>&1
        log "Admin user seeded"
      elif [ -f "dist/database/seeds/admin.seed.js" ]; then
        node dist/database/seeds/admin.seed.js 2>&1
        log "Admin user seeded"
      else
        warn "No seed file found — create admin manually"
      fi
    fi

    if [ -d "src/database/seeds" ]; then
      for seed_file in src/database/seeds/*.seed.ts; do
        [ -f "$seed_file" ] || continue
        [ "$(basename "$seed_file")" = "admin.seed.ts" ] && continue
        info "Running seed: $(basename "$seed_file")"
        npx ts-node "$seed_file" 2>/dev/null || warn "Seed failed: $(basename "$seed_file")"
      done
    fi

    # Chat seed co runner rieng (chat-runner.ts) — chay qua npm script
    if grep -q '"seed:chat"' package.json 2>/dev/null; then
      info "Running chat seed..."
      npm run seed:chat 2>&1 || warn "Chat seed failed"
    fi
    log "Seeding complete"
    ;;

  *)
    echo "Usage: ./scripts/migrate.sh [run|revert|generate|seed|seed:chat] [name] [--yes] [--skip-backup]"
    echo ""
    echo "Commands:"
    echo "  run              Run pending migrations"
    echo "  revert           Revert last migration"
    echo "  generate [name]  Generate new migration"
    echo "  seed             Seed admin + initial data + chat scenarios"
    echo "  seed:chat        Seed chat scenarios + schedules only"
    echo ""
    echo "Flags:"
    echo "  --yes            Skip confirm on production"
    echo "  --skip-backup    Skip auto-backup on production"
    exit 1
    ;;
esac

echo ""
