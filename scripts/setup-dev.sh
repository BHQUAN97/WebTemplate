#!/bin/bash
# ============================================
# WebTemplate Development Setup Script
# Usage: ./scripts/setup-dev.sh
#
# One-command setup for new developers.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[INFO]${NC} $1"; }

echo ""
echo "=========================================="
echo " WebTemplate — Development Setup"
echo "=========================================="
echo ""

# ==========================================
# 1. Check Node.js version
# ==========================================
info "Checking Node.js..."

if ! command -v node >/dev/null 2>&1; then
  error "Node.js is not installed. Install Node.js 20+ from https://nodejs.org"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js 20+ required. Current: $(node -v)"
fi
log "Node.js $(node -v)"

if ! command -v npm >/dev/null 2>&1; then
  error "npm is not installed"
fi
log "npm $(npm -v)"

# ==========================================
# 2. Check Docker
# ==========================================
info "Checking Docker..."

if ! command -v docker >/dev/null 2>&1; then
  error "Docker is not installed. Install Docker Desktop from https://docker.com"
fi
log "Docker $(docker --version | head -1)"

if command -v docker compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  error "Docker Compose is not installed"
fi
log "Docker Compose available"

# ==========================================
# 3. Setup environment files
# ==========================================
info "Setting up environment files..."

cd "$PROJECT_DIR"

if [ ! -f ".env" ]; then
  cp .env.example .env
  log "Created .env from .env.example"
else
  log ".env already exists"
fi

if [ ! -f "backend/.env" ] && [ ! -L "backend/.env" ]; then
  # Symlink backend .env to root .env
  ln -sf ../.env backend/.env 2>/dev/null || cp .env backend/.env
  log "Backend .env linked"
fi

if [ ! -f "frontend/.env.local" ]; then
  cat > frontend/.env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:6001/api
EOF
  log "Created frontend/.env.local"
else
  log "frontend/.env.local already exists"
fi

# ==========================================
# 4. Install backend dependencies
# ==========================================
info "Installing backend dependencies..."

cd "$PROJECT_DIR/backend"
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
  npm ci --silent
else
  npm install
fi
log "Backend dependencies installed"

# ==========================================
# 5. Install frontend dependencies
# ==========================================
info "Installing frontend dependencies..."

cd "$PROJECT_DIR/frontend"
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
  npm ci --silent
else
  npm install
fi
log "Frontend dependencies installed"

# ==========================================
# 6. Start Docker services (MySQL + Redis)
# ==========================================
info "Starting MySQL and Redis..."

cd "$PROJECT_DIR"
$COMPOSE_CMD -f docker-compose.yml up -d
log "MySQL (port 6002) and Redis (port 6003) started"

# Wait for MySQL to be ready
info "Waiting for MySQL to be ready..."
MAX_RETRIES=30
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if docker exec wt-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    log "MySQL is ready"
    break
  fi
  RETRY=$((RETRY + 1))
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  warn "MySQL took too long to start — check: docker logs wt-mysql"
fi

# ==========================================
# 7. Run migrations and seeds
# ==========================================
info "Running database migrations..."

cd "$PROJECT_DIR/backend"
npm run build 2>/dev/null || warn "Backend build had warnings"

# Try running migrations
npx typeorm migration:run -d dist/config/database.config.js 2>/dev/null && log "Migrations applied" || warn "Migrations skipped — may need manual setup"

# Try running seeds
if [ -f "dist/database/seeds/admin.seed.js" ]; then
  node dist/database/seeds/admin.seed.js 2>/dev/null && log "Seeds applied" || warn "Seeds skipped"
fi

# ==========================================
# 8. Summary
# ==========================================
cd "$PROJECT_DIR"

echo ""
echo "=========================================="
echo -e "${GREEN} Setup complete!${NC}"
echo "=========================================="
echo ""
echo "Services running:"
echo "  MySQL:   localhost:6002 (user: wtuser, db: webtemplate)"
echo "  Redis:   localhost:6003"
echo ""
echo "Start development:"
echo "  Terminal 1:  cd backend && npm run start:dev"
echo "  Terminal 2:  cd frontend && npm run dev"
echo ""
echo "URLs:"
echo "  Frontend:  http://localhost:6000"
echo "  Backend:   http://localhost:6001/api"
echo ""
echo "Default admin (if seeded):"
echo "  Email:     admin@webtemplate.local"
echo "  Password:  Admin@123"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f     # View infrastructure logs"
echo "  npm run test               # Run backend tests"
echo "  npm run test:e2e           # Run e2e tests"
echo ""
