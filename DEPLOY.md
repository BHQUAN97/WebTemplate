# WEB TEMPLATE — DEPLOYMENT GUIDE

> Domain: template.bhquan.store | VPS: 134.122.21.251 | Stack: NestJS + Next.js + MySQL + Redis

---

## Kiến trúc Production

```
  VPS Ubuntu (134.122.21.251)
  ┌──────────────────────────────────────────────┐
  │  shared-nginx (Docker) :80/:443               │
  │  └─ template.bhquan.store → wt-backend + fe  │
  │                                               │
  │  WebTemplate (/opt/webtemplate)               │
  │  ├─ wt-backend  :6001 (NestJS)               │
  │  └─ wt-frontend :6000 (Next.js)              │
  │                                               │
  │  Shared infra (/opt/infra)                    │
  │  ├─ shared-mysql  :3306                        │
  │  │   └─ DB: webtemplate                        │
  │  └─ shared-redis  :6379                        │
  │                                               │
  │  Docker Networks                              │
  │  ├─ webphoto_backend      (mysql, redis)      │
  │  └─ webtemplate_frontend  (nginx, wt)         │
  └──────────────────────────────────────────────┘
```

### Nginx routing

Config: `/opt/infra/nginx/conf.d/template.bhquan.store.conf`
- `/api/*` → `http://wt-backend:6001`
- `/_next/static/*` → `http://wt-frontend:6000` (365d cache)
- `/*` → `http://wt-frontend:6000`

---

## GitHub Actions Secrets

Secrets được lưu trong **repo settings** — không commit lên git.

| Secret | Mô tả |
|--------|-------|
| `VPS_HOST` | IP VPS: `134.122.21.251` |
| `VPS_PORT` | SSH port: `22` |
| `VPS_USER` | SSH user: `root` |
| `VPS_PASSWORD` | Mật khẩu SSH VPS |
| `MYSQL_ROOT_PASSWORD` | Root password shared-mysql |
| `WT_DB_PASSWORD` | Password user `webtemplate` trong MySQL |
| `JWT_ACCESS_SECRET` | JWT access token secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `JWT_RESET_SECRET` | JWT reset password secret |
| `RESEND_API_KEY` | Resend email API key |
| `S3_ENDPOINT` | Cloudflare R2 endpoint |
| `WT_S3_BUCKET` | R2 bucket name |
| `S3_ACCESS_KEY` | R2 access key |
| `S3_SECRET_KEY` | R2 secret key |
| `WT_S3_PUBLIC_URL` | R2 public URL |

### Thêm/cập nhật secret nhanh qua CLI

```bash
gh secret set VPS_PASSWORD --body "mat_khau_moi" --repo BHQUAN97/WebTemplate
gh secret set WT_DB_PASSWORD --body "db_pass_moi" --repo BHQUAN97/WebTemplate
gh secret list --repo BHQUAN97/WebTemplate
```

---

## Checklist trước khi deploy

- [ ] `gh secret list --repo BHQUAN97/WebTemplate` hiện đủ 15 secrets
- [ ] Push code lên `main` → Actions chạy tự động
- [ ] Xem progress: `gh run watch --repo BHQUAN97/WebTemplate`

> Đổi VPS password: `bash /e/DEVELOP/.claude-shared/secrets-infra/scripts/set-all-secrets.sh --shared`

---

## Deploy

### Tự động (Khuyên dùng)

Push lên nhánh `main` → GitHub Actions tự động chạy:
1. Typecheck FE + BE (song song)
2. Detect changes (init vs update)
3. Upload + build + start trên VPS
4. DB migrations (TypeORM)
5. Health check

### Lần đầu deploy (INIT mode)

Khi `/opt/webtemplate/docker-compose.prod.yml` chưa tồn tại trên VPS, pipeline sẽ tự động:
- Upload toàn bộ source code
- Start shared-mysql + shared-redis (nếu chưa chạy)
- Tạo DB `webtemplate` và user
- Lấy SSL cert cho `template.bhquan.store`
- Build và start `wt-backend` + `wt-frontend`
- Chạy TypeORM migrations

### Cập nhật code (UPDATE mode)

Chỉ upload và rebuild phần thay đổi (FE / BE / infra / DB).

### Manual — không cần push code

```bash
gh workflow run deploy.yml --repo BHQUAN97/WebTemplate
```

---

## Quản lý trên VPS

```bash
ssh root@134.122.21.251
cd /opt/webtemplate

# Xem logs
docker logs wt-backend --tail 50 -f
docker logs wt-frontend --tail 50 -f

# Restart
docker compose -f docker-compose.prod.yml restart backend frontend

# DB access
docker exec -it shared-mysql mysql -u webtemplate -p webtemplate

# Nginx reload
docker exec shared-nginx nginx -t && docker exec shared-nginx nginx -s reload
```

---

## Troubleshooting

```bash
# Backend không start
docker logs wt-backend --tail 30
docker inspect wt-backend --format '{{.State.Status}} ExitCode:{{.State.ExitCode}}'

# 502 Bad Gateway — kiểm tra network
docker inspect shared-nginx --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}'
# Phải có: webtemplate_frontend
# Nếu thiếu:
docker network connect webtemplate_frontend shared-nginx
docker exec shared-nginx nginx -s reload

# SSL cert hết hạn
gh workflow run ssl-renew.yml --repo BHQUAN97/WebTemplate

# Nginx crash toàn bộ (ảnh hưởng mọi site)
gh workflow run fix-nginx.yml --repo BHQUAN97/WebTemplate
```
