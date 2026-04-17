# Deployment Guide

## Prerequisites

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime for backend and frontend |
| Docker | 24+ | Container runtime |
| Docker Compose | v2+ | Multi-container orchestration |
| MySQL | 8.0 | Database (via Docker or standalone) |
| Redis | 7+ | Cache, sessions, queues (via Docker) |
| Git | 2.30+ | Source control |

## Development Setup

### Quick Start

```bash
./scripts/setup-dev.sh
```

This script handles everything. Or do it manually:

### Manual Setup

1. **Clone and install**:
```bash
git clone <repo-url> && cd WebTemplate
cp .env.example .env
# Edit .env with your values

cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

2. **Start infrastructure**:
```bash
docker compose up -d
# Starts MySQL (port 6002) and Redis (port 6003)
```

3. **Run migrations**:
```bash
cd backend
npm run build
npx typeorm migration:run -d dist/config/database.config.js
```

4. **Start services**:
```bash
# Terminal 1: Backend
cd backend && npm run start:dev   # http://localhost:6001

# Terminal 2: Frontend
cd frontend && npm run dev        # http://localhost:6000
```

## Staging Deployment

```bash
# Build and deploy staging
./deploy.sh staging
```

This builds Docker images, starts all containers (MySQL, Redis, backend, frontend, nginx) and performs health checks.

## Production Deployment

### Pre-deployment Checklist

- [ ] Update `.env` with production secrets
- [ ] Change `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to strong random strings
- [ ] Configure S3 storage (or Cloudflare R2)
- [ ] Configure Resend API key for emails
- [ ] Set `APP_URL` and `API_URL` to production domains
- [ ] Update `nginx/nginx.conf` with production domain and SSL

### Deploy

```bash
# Full production deploy
./deploy.sh prod
```

### Manual Docker Deploy

```bash
# Build images
docker compose -f docker-compose.prod.yml build --no-cache

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f backend
```

## VPS Deployment Guide

### 1. Server Setup (Ubuntu 22.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Install Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Install Git
sudo apt install git -y
```

### 2. Clone and Configure

```bash
# Clone repository
git clone <repo-url> /opt/webtemplate
cd /opt/webtemplate

# Create environment file
cp .env.example .env
nano .env
# Edit all values for production
```

### 3. SSL Setup with Certbot

```bash
# Install Certbot
sudo apt install certbot -y

# Get certificate (stop nginx first if running)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certs to nginx volume location
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/certs/

# Update nginx.conf — uncomment SSL lines and set domain
```

Edit `nginx/nginx.conf`:
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    # ... rest of config
}
```

### 4. Auto-Renew SSL

```bash
# Add cron job for cert renewal
echo "0 3 * * 1 certbot renew --quiet && docker restart wt-nginx" | sudo crontab -
```

### 5. Deploy

```bash
./deploy.sh prod
```

### 6. Firewall

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

## Environment Variables Reference

### Required

| Variable | Example | Description |
|----------|---------|-------------|
| `DB_ROOT_PASSWORD` | `strong-root-pass` | MySQL root password |
| `DB_NAME` | `webtemplate` | Database name |
| `DB_USER` | `wtuser` | Database user |
| `DB_PASSWORD` | `strong-db-pass` | Database password |
| `JWT_ACCESS_SECRET` | `random-64-chars` | JWT signing secret |
| `JWT_REFRESH_SECRET` | `random-64-chars` | JWT refresh secret |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | MySQL host (`mysql` in Docker) |
| `DB_PORT` | `6002` | MySQL external port |
| `REDIS_HOST` | `localhost` | Redis host (`redis` in Docker) |
| `REDIS_PORT` | `6003` | Redis external port |
| `APP_PORT` | `6001` | Backend port |
| `APP_NAME` | `WebTemplate` | Application name |
| `APP_URL` | `http://localhost:6000` | Frontend URL |
| `API_URL` | `http://localhost:6001` | Backend URL |
| `JWT_ACCESS_EXPIRES` | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh token lifetime |
| `S3_ENDPOINT` | - | S3/R2 endpoint URL |
| `S3_BUCKET` | `webtemplate` | S3 bucket name |
| `S3_ACCESS_KEY` | - | S3 access key |
| `S3_SECRET_KEY` | - | S3 secret key |
| `S3_REGION` | `auto` | S3 region |
| `S3_PUBLIC_URL` | - | CDN URL for public access |
| `RESEND_API_KEY` | - | Resend email API key |
| `EMAIL_FROM` | `noreply@domain.com` | Sender email address |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth secret |
| `TOTP_ISSUER` | `WebTemplate` | 2FA TOTP issuer name |

## Monitoring & Logging

### Docker Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs -f wt-backend --tail 100
docker logs -f wt-frontend --tail 100
docker logs -f wt-nginx --tail 100

# Nginx access log
docker exec wt-nginx tail -f /var/log/nginx/access.log
```

### Health Checks

```bash
# Backend API health
curl http://localhost:6001/api

# Frontend health
curl http://localhost:6000

# MySQL
docker exec wt-mysql mysqladmin ping -h localhost

# Redis
docker exec wt-redis redis-cli ping

# Container status
docker compose -f docker-compose.prod.yml ps
```

### Resource Usage

```bash
docker stats wt-backend wt-frontend wt-mysql wt-redis wt-nginx
```

## Backup & Restore

### Backup

```bash
# Run backup script (MySQL dump + uploads)
./scripts/backup.sh

# Backups stored in ./backups/ with 7-day rotation
```

### Restore Database

```bash
# From gzipped backup
gunzip < backups/db_webtemplate_20260416_120000.sql.gz | \
  docker exec -i wt-mysql mysql -uwtuser -pwtpass webtemplate

# From plain SQL
docker exec -i wt-mysql mysql -uwtuser -pwtpass webtemplate < backup.sql
```

### Restore Uploads

```bash
tar -xzf backups/uploads_20260416_120000.tar.gz -C backend/
```

## Scaling Considerations

### Horizontal Scaling

1. **Backend**: Run multiple backend instances behind nginx load balancer
   - Update `nginx.conf` upstream to include multiple backend servers
   - Ensure sessions are stored in Redis (already configured)
   - BullMQ workers can run on separate instances

2. **Frontend**: Next.js standalone can be replicated
   - Each instance is stateless
   - Add instances to nginx upstream

3. **Database**: 
   - Add read replicas for read-heavy queries
   - Use connection pooling
   - Consider managed MySQL (AWS RDS, PlanetScale)

4. **Redis**:
   - Use Redis Cluster for high availability
   - Separate cache and queue Redis instances for production

### Vertical Scaling

Adjust `docker-compose.prod.yml` resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
```

## Troubleshooting

### Backend won't start
```bash
# Check logs
docker logs wt-backend --tail 50

# Common issues:
# - MySQL not ready: wait for health check or increase start_period
# - Missing .env: copy from .env.example
# - Port conflict: change APP_PORT in .env
```

### Database connection refused
```bash
# Check MySQL is running
docker exec wt-mysql mysqladmin ping

# Check connection from backend container
docker exec wt-backend ping mysql -c 1

# Verify credentials
docker exec wt-mysql mysql -uwtuser -pwtpass -e "SELECT 1"
```

### Frontend build fails
```bash
# Clear Next.js cache
cd frontend && rm -rf .next node_modules && npm install && npm run build

# Check NEXT_PUBLIC_API_URL is set
echo $NEXT_PUBLIC_API_URL
```

### Redis connection issues
```bash
# Test Redis
docker exec wt-redis redis-cli ping

# Check memory usage
docker exec wt-redis redis-cli info memory
```

### Nginx 502 Bad Gateway
```bash
# Backend or frontend not ready yet
docker compose -f docker-compose.prod.yml ps

# Check nginx config
docker exec wt-nginx nginx -t

# Restart nginx
docker restart wt-nginx
```
