# WebTemplate — Huong Dan Trien Khai Chi Tiet

Tai lieu STEP-BY-STEP cho 4 mode deploy: Development, Production Standalone, Shared VPS, Docker All-in-One.

---

## Tong quan

| Mode | Docker Compose file | Services | Thoi gian |
|------|-------------------|----------|-----------|
| Development | `docker-compose.yml` | MySQL + Redis | 5 phut |
| Production (standalone) | `docker-compose.prod.yml` | MySQL + Redis + Backend + Frontend + Nginx | 30 phut |
| Shared VPS | `docker-compose.shared-vps.yml` | Backend + Frontend (dung chung MySQL/Redis/Nginx) | 15 phut |
| Docker All-in-One | `docker-compose.prod.yml` | Tat ca 5 services | 10 phut |

---

## Mode 1: Development (Local)

**Yeu cau:** Node.js 20+, Docker Desktop
**Thoi gian:** 5 phut

### Step 1: Clone repo
```bash
git clone <repo-url> WebTemplate
cd WebTemplate
```

### Step 2: Setup (1 lenh duy nhat)
```bash
./scripts/setup-dev.sh
```

Script `setup-dev.sh` se tu dong:
1. Check Node.js version (>= 20)
2. Check Docker + Docker Compose
3. Copy `.env.example` -> `.env`
4. Tao symlink `backend/.env` -> root `.env`
5. Tao `frontend/.env.local` voi `NEXT_PUBLIC_API_URL`
6. Install backend dependencies (`npm ci` hoac `npm install`)
7. Install frontend dependencies
8. Start MySQL (port 6002) + Redis (port 6003)
9. Wait for MySQL ready
10. Build backend + run migrations
11. Seed admin user (neu chua co)

### Step 3: Start development servers
```bash
# Terminal 1 — Backend
cd backend && npm run start:dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### Step 4: Truy cap
| Service | URL | Ghi chu |
|---------|-----|---------|
| Frontend | http://localhost:6000 | Trang public |
| Backend API | http://localhost:6001/api | REST API |
| Admin panel | http://localhost:6000/admin | Can dang nhap |
| MySQL | localhost:6002 | user: `wtuser`, pass: `wtpass` |
| Redis | localhost:6003 | Khong co password |

**Default admin account:**
- Email: `admin@webtemplate.local`
- Password: `Admin@123`

---

## Mode 2: Production — Standalone (VPS rieng)

**Yeu cau:** VPS Ubuntu 22.04+, 2GB RAM, domain tro ve VPS
**Thoi gian:** 30 phut (lan dau)

### Step 1: Server setup (chay 1 LAN duy nhat)

```bash
ssh root@your-server

# Download va chay init script
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/webtemplate/main/scripts/init-first-time.sh | bash
```

Script `init-first-time.sh` se:
1. Update system packages
2. Cai dat tools: curl, wget, git, htop, nano, unzip
3. Cai dat Docker + Docker Compose plugin
4. Tao user `deploy` (khong dung root de chay app)
5. Setup UFW firewall: chi mo SSH (22), HTTP (80), HTTPS (443)
6. Cai dat + enable fail2ban (chong brute-force SSH)
7. Tao 2GB swap neu RAM < 2GB
8. Cai dat Node.js 20
9. Tao thu muc `/opt/webtemplate` cho user `deploy`

**Quan trong:** Ports 6000-6003 KHONG mo ra ngoai — chi truy cap qua Nginx.

### Step 2: Clone project

```bash
su - deploy
cd /opt/webtemplate
git clone <repo-url> .
```

### Step 3: Configure environment

```bash
cp .env.example .env
nano .env
```

**Cac bien BAT BUOC phai thay doi cho production:**

```env
# Domain
DOMAIN=yourdomain.com
DOMAIN_EMAIL=admin@yourdomain.com

# JWT secrets — PHAI doi, khong dung default
# Tao random: openssl rand -hex 32
JWT_ACCESS_SECRET=<random 64 ky tu>
JWT_REFRESH_SECRET=<random 64 ky tu>

# Database passwords — PHAI doi
DB_PASSWORD=<mat_khau_manh>
DB_ROOT_PASSWORD=<mat_khau_root_manh>

# CORS — chi cho phep domain cua ban
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# App URLs
APP_URL=https://yourdomain.com
API_URL=https://yourdomain.com
```

**deploy.sh se tu dong kiem tra:** neu JWT secrets con gia tri default, deploy prod se DUNG va bao loi.

### Step 4: SSL Certificate

```bash
./scripts/init-ssl.sh
```

Script `init-ssl.sh` se:
1. Doc `DOMAIN` va `DOMAIN_EMAIL` tu `.env`
2. Start nginx tam thoi cho ACME challenge (port 80)
3. Chay certbot: request cert tu Let's Encrypt cho `domain` + `www.domain`
4. Copy certs vao Docker volume `wt-nginx-certs`
5. Setup cron auto-renew (3:00 AM moi ngay)
6. Cleanup nginx tam thoi

**Yeu cau:** Domain phai da tro DNS (A record) ve IP cua VPS truoc khi chay.

### Step 5: Deploy

```bash
./deploy.sh prod
```

deploy.sh se:
1. Check Docker, Docker Compose
2. Pull latest code (neu la git repo)
3. Check `.env` — bao loi neu chua co hoac secrets con default
4. Build Docker images (backend + frontend)
5. Stop old containers (graceful, 30s timeout)
6. Start all 5 services: MySQL, Redis, Backend, Frontend, Nginx
7. Health check: doi backend + frontend respond (max 60s)
8. In trang thai containers

### Step 6: Verify

```bash
curl https://yourdomain.com           # Frontend
curl https://yourdomain.com/api       # Backend API
docker compose -f docker-compose.prod.yml ps    # Container status
docker logs -f wt-backend             # Backend logs
```

---

## Mode 3: Shared VPS (chung MySQL/Redis/Nginx voi projects khac)

**Yeu cau:** VPS da co shared infrastructure (hoac se setup)
**Thoi gian:** 15 phut

### Kien truc Shared VPS
```
VPS
├── shared-mysql    (1 instance, nhieu database)
├── shared-redis    (1 instance, key prefix de isolate)
├── shared-nginx    (1 instance, nhieu domain/server blocks)
├── shared-certbot  (auto-renew SSL cho tat ca domain)
│
├── wt-backend      (WebTemplate backend)
├── wt-frontend     (WebTemplate frontend)
│
├── lqd-backend     (LeQuyDon backend, vi du)
└── lqd-frontend    (LeQuyDon frontend, vi du)
```

Tat ca containers dung chung Docker network `shared-net`.

### Setup shared infrastructure (1 lan cho toan VPS)

```bash
# Tao shared Docker network
docker network create shared-net

# Start shared MySQL + Redis + Nginx + Certbot
docker compose -f docker-compose.shared-infra.yml up -d
```

File `docker-compose.shared-infra.yml` cung cap:
- **shared-mysql**: MySQL 8, port 3306 (internal), 127.0.0.1:6002 (debug only)
  - innodb-buffer-pool-size: 512M
  - max-connections: 500
  - slow-query-log enabled (> 2s)
- **shared-redis**: Redis 7, port 6379 (internal), 127.0.0.1:6003 (debug only)
  - maxmemory: 256mb (LRU eviction)
  - appendonly: yes
- **shared-nginx**: Nginx 1.25, port 80 + 443 (public)
  - Load config tu `nginx/conf.d/*.conf` (moi project 1 file)
- **shared-certbot**: Auto-renew SSL moi 12h

Init databases tu `scripts/init-databases.sql` — them database cho moi project.

### Per-project setup

#### Step 1: Tao database cho WebTemplate

```bash
docker exec shared-mysql mysql -u root -p -e "
  CREATE DATABASE IF NOT EXISTS webtemplate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'wtuser'@'%' IDENTIFIED BY 'secure_password';
  GRANT ALL PRIVILEGES ON webtemplate.* TO 'wtuser'@'%';
  FLUSH PRIVILEGES;
"
```

Hoac them vao `scripts/init-databases.sql` truoc khi khoi tao MySQL lan dau.

#### Step 2: Configure .env

```bash
cp .env.example .env
nano .env
```

**Khac biet voi standalone:**
```env
# Database — dung Docker service name, KHONG phai localhost
DB_HOST=shared-mysql
DB_PORT=3306

# Redis — dung Docker service name
REDIS_HOST=shared-redis
REDIS_PORT=6379

# Domain
DOMAIN=yourdomain.com
```

#### Step 3: Them nginx config cho project

```bash
# Copy template
cp nginx/conf.d/webtemplate.conf /path/to/shared-nginx/conf.d/

# Edit: doi domain va SSL paths
nano /path/to/shared-nginx/conf.d/webtemplate.conf
```

File `webtemplate.conf` co san:
- Upstream: `wt-frontend:6000`, `wt-backend:6001`
- SSL config (doi domain trong `server_name` va `ssl_certificate` paths)
- Rate limiting: API 30r/s, Login 5r/m
- Security headers: HSTS, X-Frame-Options, X-Content-Type-Options
- Static cache: `_next/static/` 365 ngay
- Proxy headers: X-Real-IP, X-Forwarded-For, X-Forwarded-Proto

```bash
# Reload nginx de nhan config moi
docker exec shared-nginx nginx -t          # Test config truoc
docker exec shared-nginx nginx -s reload   # Apply
```

#### Step 4: Deploy

```bash
./deploy.sh shared
```

deploy.sh (mode shared) se:
1. Kiem tra `shared-net` Docker network ton tai
2. Kiem tra `shared-mysql` container dang chay
3. Build backend + frontend images
4. Start chi 2 containers: `wt-backend` + `wt-frontend`
5. Reload shared-nginx

**Luu y:** Mode shared KHONG expose ports ra ngoai — chi co `expose: "6001"` va `expose: "6000"` (internal Docker network only). Truy cap qua shared-nginx.

---

## Mode 4: Docker All-in-One

Deploy nhanh tat ca services trong 1 lenh, khong can setup phuc tap.

```bash
# Start tat ca 5 services
docker compose -f docker-compose.prod.yml up -d
```

Services trong `docker-compose.prod.yml`:
| Service | Container | Port | Healthcheck |
|---------|-----------|------|-------------|
| MySQL 8 | wt-mysql | 6002:3306 | mysqladmin ping |
| Redis 7 | wt-redis | 6003:6379 | redis-cli ping |
| Backend (NestJS) | wt-backend | 6001:6001 | wget /api |
| Frontend (Next.js) | wt-frontend | 6000:6000 | wget / |
| Nginx 1.25 | wt-nginx | 80, 443 | wget / |

Dependencies:
- Backend doi MySQL + Redis healthy truoc khi start
- Frontend doi Backend healthy
- Nginx doi Frontend + Backend healthy

---

## Cau hinh bien moi truong (.env)

### Database
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `DB_HOST` | Yes | `localhost` | MySQL host. Trong Docker: `mysql` (standalone) hoac `shared-mysql` (shared) |
| `DB_PORT` | No | `6002` | MySQL port (external). Internal Docker luon 3306 |
| `DB_NAME` | No | `webtemplate` | Ten database |
| `DB_USER` | No | `wtuser` | MySQL username |
| `DB_PASSWORD` | Yes (prod) | `wtpass` | MySQL password. **PHAI doi cho production** |
| `DB_ROOT_PASSWORD` | Yes (prod) | `rootpass` | MySQL root password. **PHAI doi cho production** |

### Redis
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `REDIS_HOST` | No | `localhost` | Redis host. Trong Docker: `redis` hoac `shared-redis` |
| `REDIS_PORT` | No | `6003` | Redis port |

### JWT
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `JWT_ACCESS_SECRET` | Yes | `your-access-secret-change-me` | Secret cho access token. **PHAI doi** |
| `JWT_REFRESH_SECRET` | Yes | `your-refresh-secret-change-me` | Secret cho refresh token. **PHAI doi** |
| `JWT_ACCESS_EXPIRES` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES` | No | `7d` | Refresh token TTL |

### Application
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `APP_NAME` | No | `WebTemplate` | Ten ung dung |
| `APP_URL` | No | `http://localhost:6000` | Frontend URL |
| `API_URL` | No | `http://localhost:6001` | Backend API URL |
| `APP_PORT` | No | `6001` | Backend port |
| `FRONTEND_PORT` | No | `6000` | Frontend port |
| `NODE_ENV` | No | `development` | `development` hoac `production` |
| `CORS_ORIGINS` | No | `http://localhost:6000,http://localhost:3000` | Allowed origins, cach boi dau phay |

### Domain & SSL
| Bien | Bat buoc (prod) | Default | Mo ta |
|------|-----------------|---------|-------|
| `DOMAIN` | Yes | `yourdomain.com` | Domain chinh, dung cho SSL + nginx |
| `DOMAIN_EMAIL` | Yes | `admin@yourdomain.com` | Email cho Let's Encrypt |

### Storage (S3-compatible)
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `S3_ENDPOINT` | No | - | S3/R2 endpoint URL |
| `S3_BUCKET` | No | `webtemplate` | Bucket name |
| `S3_ACCESS_KEY` | No | - | Access key |
| `S3_SECRET_KEY` | No | - | Secret key |
| `S3_REGION` | No | `auto` | Region (R2 dung `auto`) |
| `S3_PUBLIC_URL` | No | - | CDN URL cho public access |

### Email
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `RESEND_API_KEY` | No | - | Resend API key |
| `EMAIL_FROM` | No | - | Sender email address |

### OAuth
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth secret |
| `FACEBOOK_CLIENT_ID` | No | - | Facebook OAuth client ID |
| `FACEBOOK_CLIENT_SECRET` | No | - | Facebook OAuth secret |

### 2FA
| Bien | Bat buoc | Default | Mo ta |
|------|----------|---------|-------|
| `TOTP_ISSUER` | No | `WebTemplate` | Ten hien thi trong app Authenticator |

---

## Backup & Restore

### Backup (tu dong)

```bash
./scripts/backup.sh
```

Script se:
1. Backup MySQL database -> `backups/db_webtemplate_YYYYMMDD_HHMMSS.sql.gz`
2. Backup uploaded files -> `backups/uploads_YYYYMMDD_HHMMSS.tar.gz`
3. Rotate: xoa backups cu hon 7 ngay

Backup thu qua Docker container (`wt-mysql`) truoc, fallback sang `mysqldump` local.

### Auto backup (cron)

```bash
# Backup luc 2:00 AM moi ngay
crontab -e
0 2 * * * /opt/webtemplate/scripts/backup.sh >> /var/log/webtemplate-backup.log 2>&1
```

### Backup encryption + offsite

Set trong `.env.production`:
```env
# GPG encrypt (preferred)
BACKUP_GPG_PASSPHRASE_FILE=/secrets/backup.pass

# Offsite upload (S3 / Cloudflare R2)
BACKUP_S3_BUCKET=my-vps-backups
BACKUP_S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
BACKUP_NOTIFY_WEBHOOK=https://hooks.slack.com/services/xxx
```

Generate passphrase + setup:
```bash
openssl rand -base64 48 > /secrets/backup.pass
chmod 600 /secrets/backup.pass
# AWS CLI credentials (S3) hoac rclone config (R2)
aws configure   # neu dung AWS S3
```

Retention: 7 ngay local, offsite lifecycle policy tren S3/R2 (tu dong chuyen cold storage hoac xoa sau 90 ngay).

### Restore database

```bash
# Giai nen
gunzip backups/db_webtemplate_20260416_020000.sql.gz

# Restore vao MySQL
docker exec -i wt-mysql mysql -u root -p webtemplate < backups/db_webtemplate_20260416_020000.sql

# Hoac dung shared-mysql
docker exec -i shared-mysql mysql -u root -p webtemplate < backups/db_webtemplate_20260416_020000.sql
```

### Restore uploads

```bash
tar -xzf backups/uploads_20260416_020000.tar.gz -C backend/
```

---

## SSL Certificate

### Setup lan dau

```bash
# Yeu cau: DOMAIN va DOMAIN_EMAIL da set trong .env
./scripts/init-ssl.sh
```

### Auto-renew

Script `init-ssl.sh` tu dong them cron job:
```
0 3 * * * certbot renew --quiet && docker exec wt-nginx nginx -s reload
```

Voi shared infra, certbot container tu renew moi 12h.

### Manual renew

```bash
# Standalone
docker run --rm \
  -v /opt/webtemplate/certbot/conf:/etc/letsencrypt \
  -v /opt/webtemplate/certbot/www:/var/www/certbot \
  certbot/certbot renew

# Reload nginx sau khi renew
docker exec wt-nginx nginx -s reload
```

### Cert files location

```
certbot/conf/live/{domain}/fullchain.pem    # Certificate + chain
certbot/conf/live/{domain}/privkey.pem      # Private key
```

---

## Monitoring

### Container logs

```bash
# Backend logs (follow)
docker logs -f wt-backend

# Frontend logs
docker logs -f wt-frontend

# MySQL logs
docker logs -f wt-mysql

# Xem 100 dong cuoi
docker logs --tail 100 wt-backend
```

### Container status

```bash
# Standalone
docker compose -f docker-compose.prod.yml ps

# Shared VPS
docker compose -f docker-compose.shared-vps.yml ps

# Tat ca containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### MySQL slow queries

```bash
docker exec wt-mysql cat /var/lib/mysql/slow.log
# Hoac shared
docker exec shared-mysql cat /var/lib/mysql/slow.log
```

### Nginx logs

```bash
# Access log
docker exec wt-nginx tail -f /var/log/nginx/access.log

# Error log
docker exec wt-nginx tail -f /var/log/nginx/error.log
```

### Resource usage

```bash
docker stats --no-stream wt-backend wt-frontend wt-mysql wt-redis wt-nginx
```

---

## Troubleshooting

### 1. 502 Bad Gateway
**Nguyen nhan:** Backend chua start xong (healthcheck chua pass).
```bash
docker logs wt-backend           # Xem loi
docker restart wt-backend        # Restart
# Doi 30s cho backend start xong, Nginx se tu proxy lai
```

### 2. CORS error
**Nguyen nhan:** Frontend domain khong co trong `CORS_ORIGINS`.
```bash
# Sua .env
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Restart backend
docker restart wt-backend
```

### 3. MySQL connection refused
**Nguyen nhan:** Sai `DB_HOST` — trong Docker phai dung service name.
```env
# Standalone (docker-compose.prod.yml)
DB_HOST=mysql

# Shared VPS
DB_HOST=shared-mysql

# Local dev (khong Docker)
DB_HOST=localhost
```

### 4. SSL cert expired
```bash
# Kiem tra cert
docker run --rm -v /opt/webtemplate/certbot/conf:/etc/letsencrypt certbot/certbot certificates

# Renew
docker run --rm \
  -v /opt/webtemplate/certbot/conf:/etc/letsencrypt \
  -v /opt/webtemplate/certbot/www:/var/www/certbot \
  certbot/certbot renew

# Reload nginx
docker exec wt-nginx nginx -s reload
```

### 5. Port conflict
**Nguyen nhan:** Port da bi service khac chiem.
```bash
# Kiem tra port dang dung
lsof -i :6001    # hoac ss -tlnp | grep 6001

# Doi port trong .env
APP_PORT=7001
FRONTEND_PORT=7000
DB_PORT=7002
REDIS_PORT=7003
```

### 6. Nginx config error
```bash
# Test config truoc khi reload
docker exec wt-nginx nginx -t
# hoac shared
docker exec shared-nginx nginx -t

# Neu loi: xem chi tiet
docker exec wt-nginx cat /etc/nginx/nginx.conf
```

### 7. Out of memory (OOM)
```bash
# Tang swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Giam MySQL memory (trong docker-compose)
# --innodb-buffer-pool-size=128M (thay vi 256M)
```

### 8. Migration fail
```bash
# Xem migration status
./scripts/migrate.sh run

# Neu bi loi, revert migration cuoi
./scripts/migrate.sh revert

# Sua entity/migration roi chay lai
./scripts/migrate.sh run
```

### 9. Container restart loop
```bash
# Xem loi
docker logs wt-backend

# Nguyen nhan thuong gap:
# - .env thieu bien bat buoc
# - MySQL chua ready khi backend start
# - Port conflict
```

---

## Nang cap (Upgrade)

```bash
cd /opt/webtemplate

# 1. Pull code moi
git pull origin main

# 2. Chay migrations (neu co)
./scripts/migrate.sh run

# 3. Re-deploy
./deploy.sh prod     # standalone
./deploy.sh shared   # shared VPS

# deploy.sh se tu dong:
# - Build images moi
# - Stop old containers
# - Start new containers
# - Health check
```

### Rollback

```bash
# Rollback nhanh tu last-sha (luu trong .deploy/last-sha sau moi deploy thanh cong):
./deploy.sh prod --rollback

# Hoac thu cong:
git log --oneline -5
git checkout <commit-hash>
./deploy.sh prod --skip-migrate
```

`deploy.sh prod` co cac flag:
- `--skip-migrate`: bo qua migration (hotfix khong lien quan DB)
- `--skip-build`: khong rebuild image, chi restart
- `--rollback`: quay ve SHA truoc (tu .deploy/last-sha)
- `--yes`: bo qua prompt confirm

Zero-downtime: recreate chi backend + frontend (`up -d --no-deps`) → giu nguyen MySQL/Redis. Neu health fail → auto rollback.

---

## Nginx Config Reference

Project co 4 file nginx config cho cac use-case khac nhau:

| File | Dung cho | SSL | Rate limit |
|------|----------|-----|------------|
| `nginx/nginx.conf` | Dev / default | Co (commented) | 30r/s API, 5r/m login |
| `nginx/nginx.prod.conf` | Production standalone | Yes (Let's Encrypt) | 30r/s API, 5r/m login |
| `nginx/shared-nginx.conf` | Shared VPS (main config) | Via conf.d/ | 30r/s API, 5r/m login |
| `nginx/conf.d/webtemplate.conf` | Shared VPS (per-project) | Yes | Inherits from main |

### Security headers (production)
- `X-Frame-Options: SAMEORIGIN` — chong clickjacking
- `X-Content-Type-Options: nosniff` — chong MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` — HSTS
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy` — default-src 'self', script/style unsafe-inline (Next.js yeu cau)
- KHONG dung `X-XSS-Protection` (deprecated, co the gay XSS bug tren Chrome cu)

### ${DOMAIN} substitution
`nginx.prod.conf` dung placeholder `${DOMAIN}` — nginx KHONG tu replace.
2 cach xu ly:
1. Dung official nginx image's template feature: dat file `.conf.template` trong `nginx/templates/`, mount vao `/etc/nginx/templates/`.
2. Render thu cong truoc khi mount: `envsubst '${DOMAIN}' < nginx.prod.conf > nginx.rendered.conf`.

### Performance settings
- `client_max_body_size: 50M` — gioi han upload
- `gzip: on` — nen JS, CSS, JSON, SVG, fonts
- `_next/static/`: cache 365 ngay (immutable)
- Static assets (images, fonts): cache 30 ngay
- WebSocket support cho HMR (dev) va Socket.IO (prod)

---

## Docker Images

### Backend Dockerfile (multi-stage)
```
Stage 1 (builder): node:20-alpine
  - npm ci (all deps)
  - npm run build (TypeScript -> JavaScript)
  - npm prune --production (xoa devDependencies)

Stage 2 (production): node:20-alpine
  - Non-root user: nestjs (uid 1001)
  - Copy dist/ + node_modules/ + package.json
  - Expose 6001
  - Healthcheck: wget /api
  - CMD: node dist/main.js
```

### Frontend Dockerfile (3-stage)
```
Stage 1 (deps): node:20-alpine
  - npm ci

Stage 2 (builder): node:20-alpine
  - Copy deps + source
  - npm run build (Next.js standalone output)

Stage 3 (runner): node:20-alpine
  - Non-root user: nextjs (uid 1001)
  - Copy .next/standalone + .next/static + public/
  - Expose 6000
  - Healthcheck: wget /
  - CMD: node server.js
```

Ca 2 Dockerfile deu:
- Multi-stage build (image size nho)
- Non-root user (bao mat)
- Healthcheck (Docker tu restart neu fail)
- Alpine base (lightweight)
