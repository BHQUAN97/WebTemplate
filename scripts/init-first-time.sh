#!/bin/bash
# ============================================
# WebTemplate — First Time Server Setup
# Usage: ./scripts/init-first-time.sh
#
# Chay 1 LAN duy nhat khi setup VPS moi.
# Script nay se:
# 1. Cai dat Docker + Docker Compose
# 2. Tao user deploy (khong dung root)
# 3. Setup firewall (UFW)
# 4. Setup swap (neu RAM < 2GB)
# 5. Cai dat git
# 6. Clone repo va setup
# 7. Init SSL
# 8. Deploy
# ============================================

set -euo pipefail

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
echo " WebTemplate — First Time Server Setup"
echo "=========================================="
echo ""

# Kiem tra root
if [ "$EUID" -ne 0 ]; then
    error "Script nay can chay voi sudo hoac root"
fi

# ==========================================
# 1. Update system
# ==========================================
info "Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq
log "System updated"

# ==========================================
# 2. Install essential tools
# ==========================================
info "Installing essential tools..."
apt-get install -y -qq \
    curl wget git htop nano unzip \
    apt-transport-https ca-certificates \
    gnupg lsb-release software-properties-common \
    ufw fail2ban
log "Essential tools installed"

# ==========================================
# 3. Install Docker
# ==========================================
if command -v docker >/dev/null 2>&1; then
    log "Docker already installed: $(docker --version)"
else
    info "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    log "Docker installed: $(docker --version)"
fi

# ==========================================
# 4. Install Docker Compose (plugin)
# ==========================================
if docker compose version >/dev/null 2>&1; then
    log "Docker Compose already installed"
else
    info "Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
    log "Docker Compose installed"
fi

# ==========================================
# 5. Create deploy user
# ==========================================
DEPLOY_USER="deploy"
if id "$DEPLOY_USER" &>/dev/null; then
    log "User '$DEPLOY_USER' already exists"
else
    info "Creating deploy user..."
    useradd -m -s /bin/bash "$DEPLOY_USER"
    usermod -aG docker "$DEPLOY_USER"
    log "User '$DEPLOY_USER' created and added to docker group"
    echo ""
    warn "Set password for deploy user:"
    passwd "$DEPLOY_USER"
fi

# ==========================================
# 6. Setup firewall (UFW)
# ==========================================
info "Setting up firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
# KHONG mo ports 6000-6003 ra ngoai — chi truy cap qua nginx
ufw --force enable
log "Firewall configured (SSH, HTTP, HTTPS only)"

# ==========================================
# 7. Setup fail2ban
# ==========================================
info "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban
log "fail2ban active"

# ==========================================
# 8. Setup swap (neu RAM < 2GB)
# ==========================================
TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_RAM" -lt 2048 ]; then
    if swapon --show | grep -q "/swapfile"; then
        log "Swap already exists"
    else
        info "Creating 2GB swap file (RAM: ${TOTAL_RAM}MB)..."
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        # Optimize swap usage
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
        sysctl -p
        log "2GB swap created"
    fi
else
    log "RAM: ${TOTAL_RAM}MB — swap not needed"
fi

# ==========================================
# 9. Install Node.js 20 (cho build local)
# ==========================================
if command -v node >/dev/null 2>&1; then
    log "Node.js already installed: $(node -v)"
else
    info "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y -qq nodejs
    log "Node.js installed: $(node -v)"
fi

# ==========================================
# 10. Create project directory
# ==========================================
PROJECT_DIR="/opt/webtemplate"
if [ -d "$PROJECT_DIR" ]; then
    log "Project directory exists: $PROJECT_DIR"
else
    mkdir -p "$PROJECT_DIR"
    chown "$DEPLOY_USER:$DEPLOY_USER" "$PROJECT_DIR"
    log "Created $PROJECT_DIR"
fi

# ==========================================
# 11. Summary
# ==========================================
echo ""
echo "=========================================="
echo -e "${GREEN} Server setup complete!${NC}"
echo "=========================================="
echo ""
echo "System info:"
echo "  OS:     $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)"
echo "  RAM:    ${TOTAL_RAM}MB"
echo "  Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
echo "  Node:   $(node -v)"
echo ""
echo "Security:"
echo "  UFW:       enabled (SSH, HTTP, HTTPS)"
echo "  fail2ban:  active"
echo "  Ports 6000-6003: internal only (via nginx)"
echo ""
echo "Next steps:"
echo "  1. Login as deploy user:"
echo "     su - deploy"
echo ""
echo "  2. Clone repository:"
echo "     cd /opt/webtemplate"
echo "     git clone https://github.com/YOUR_REPO/webtemplate.git ."
echo ""
echo "  3. Configure environment:"
echo "     cp .env.example .env"
echo "     nano .env  # set DOMAIN, JWT secrets, DB passwords, etc."
echo ""
echo "  4. Setup SSL (requires domain pointed to this server):"
echo "     ./scripts/init-ssl.sh"
echo ""
echo "  5. Deploy:"
echo "     ./deploy.sh prod"
echo ""
echo "  6. (Optional) Setup shared VPS resources:"
echo "     Neu VPS chay nhieu project, dung docker network external"
echo "     va shared MySQL/Redis. Xem docs/DEPLOYMENT.md"
echo ""
