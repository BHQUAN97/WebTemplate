#!/bin/bash
# ============================================
# Init SSL certificates with Certbot
# Usage: ./scripts/init-ssl.sh
#
# Chay 1 lan dau tien khi deploy production.
# Sau do certbot tu dong renew qua cron.
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

source "$PROJECT_DIR/.env" 2>/dev/null || true

DOMAIN="${DOMAIN:?'DOMAIN chua set trong .env'}"
EMAIL="${DOMAIN_EMAIL:?'DOMAIN_EMAIL chua set trong .env'}"

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
echo " SSL Certificate Setup — ${DOMAIN}"
echo "=========================================="
echo ""

# Kiem tra docker
command -v docker >/dev/null 2>&1 || error "Docker chua cai dat"

# Tao thu muc cho certbot
mkdir -p "$PROJECT_DIR/certbot/conf"
mkdir -p "$PROJECT_DIR/certbot/www"

# Buoc 1: Start nginx voi config HTTP only (cho certbot challenge)
info "Starting nginx for ACME challenge..."

# Tao nginx config tam thoi chi co HTTP
cat > "$PROJECT_DIR/nginx/nginx.certbot.conf" <<NGINXEOF
events { worker_connections 1024; }
http {
    server {
        listen 80;
        server_name ${DOMAIN} www.${DOMAIN};

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'WebTemplate SSL setup in progress...';
            add_header Content-Type text/plain;
        }
    }
}
NGINXEOF

# Start nginx container tam thoi
docker run -d --name wt-certbot-nginx \
    -p 80:80 \
    -v "$PROJECT_DIR/nginx/nginx.certbot.conf:/etc/nginx/nginx.conf:ro" \
    -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
    nginx:1.25-alpine

log "Nginx started for ACME challenge"

# Buoc 2: Chay certbot
info "Requesting SSL certificate from Let's Encrypt..."

docker run --rm \
    -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" \
    -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
    certbot/certbot certonly \
    --webroot \
    --webroot-path /var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.${DOMAIN}"

# Buoc 3: Cleanup nginx tam thoi
docker stop wt-certbot-nginx 2>/dev/null || true
docker rm wt-certbot-nginx 2>/dev/null || true
rm -f "$PROJECT_DIR/nginx/nginx.certbot.conf"

# Buoc 4: Copy certs vao Docker volume
info "Copying certificates..."

# Tao volume neu chua co
docker volume create wt-nginx-certs 2>/dev/null || true

# Copy certs vao volume
docker run --rm \
    -v "$PROJECT_DIR/certbot/conf:/certs:ro" \
    -v wt-nginx-certs:/target \
    alpine sh -c "cp -rL /certs/live /target/"

log "Certificates installed"

# Buoc 5: Setup auto-renew cron
info "Setting up auto-renewal cron..."

CRON_CMD="0 3 * * * cd $PROJECT_DIR && docker run --rm -v $PROJECT_DIR/certbot/conf:/etc/letsencrypt -v $PROJECT_DIR/certbot/www:/var/www/certbot certbot/certbot renew --quiet && docker exec wt-nginx nginx -s reload"

# Check xem cron da co chua
if crontab -l 2>/dev/null | grep -q "certbot renew"; then
    warn "Certbot cron already exists — skipping"
else
    (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
    log "Auto-renewal cron added (3:00 AM daily)"
fi

echo ""
echo "=========================================="
echo -e "${GREEN} SSL setup complete!${NC}"
echo "=========================================="
echo ""
echo "Cert files:"
echo "  $PROJECT_DIR/certbot/conf/live/${DOMAIN}/fullchain.pem"
echo "  $PROJECT_DIR/certbot/conf/live/${DOMAIN}/privkey.pem"
echo ""
echo "Next steps:"
echo "  1. Update docker-compose.prod.yml de mount certbot/conf"
echo "  2. Dung nginx.prod.conf thay nginx.conf"
echo "  3. Chay: ./deploy.sh prod"
echo ""
