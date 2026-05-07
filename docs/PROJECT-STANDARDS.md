# Project Standards — Quy Chuẩn Tổ Chức Dự Án Web

> Áp dụng cho mọi repo web: NestJS + Next.js / Express + React / bất kỳ stack nào.
> Mục tiêu: codebase dễ điều hướng, CI/CD rõ ràng, không có file trùng/chết.

---

## 1. Cấu Trúc Thư Mục Chuẩn

```
{project}/
├── .github/
│   └── workflows/          # Tất cả CI/CD workflows — phải được track
│       ├── ci.yml           # Typecheck + lint + test
│       ├── deploy.yml       # Deploy chính
│       ├── restore.yml      # Restore backup (manual trigger)
│       ├── ssl-renew.yml    # Gia hạn SSL cert
│       ├── vps-setup.yml    # Setup VPS lần đầu (manual trigger)
│       └── fix-nginx.yml    # Emergency nginx fix (manual trigger)
│
├── backend/                 # NestJS / Express / bất kỳ BE
├── frontend/                # Next.js / React / bất kỳ FE
│
├── infra/                   # = /opt/{project}/ TRÊN VPS — nguồn gốc thực
│   ├── docker-compose.yml   # Shared infra: MySQL + Redis + Nginx + Certbot
│   └── nginx/
│       ├── nginx.conf       # Main nginx config cho VPS
│       └── conf.d/
│           └── {domain}.conf  # Server block cho domain thật (upload qua CI/CD)
│
├── nginx/                   # Chỉ dùng LOCAL / standalone docs
│   ├── nginx.conf           # Dev nginx (optional)
│   ├── nginx.prod.conf      # Standalone prod nginx (không dùng shared VPS)
│   └── conf.d/
│       └── template.conf    # Template server block (placeholder yourdomain.com)
│
├── scripts/                 # Operational scripts
│   ├── lib/                 # Shared bash functions
│   ├── secrets/             # Encrypt/decrypt/sync secrets
│   ├── setup-dev.sh         # One-command dev setup
│   ├── init-first-time.sh   # VPS first-time setup
│   ├── init-ssl.sh          # SSL cert setup
│   ├── migrate.sh           # DB migration CLI wrapper
│   ├── backup-mysql.sh      # Backup MySQL
│   ├── restore-mysql.sh     # Restore MySQL
│   ├── backup-gdrive.sh     # Upload backup → Google Drive
│   ├── restore-gdrive.sh    # Download backup từ Google Drive
│   ├── generate-module.js   # Scaffold module mới
│   ├── docker-cleanup.sh    # Dọn Docker images/containers cũ
│   ├── init-databases.sql   # SQL init shared MySQL
│   └── crontab.example      # Mẫu crontab cho backup tự động
│
├── config/
│   └── env                  # Non-sensitive prod config (domain, ports, DB name)
│                            # Sensitive values → GitHub Actions Secrets
│
├── docs/
│   ├── adr/                 # Architecture Decision Records
│   │   ├── README.md        # ADR index
│   │   └── NNNN-title.md    # Đánh số thứ tự tăng dần
│   ├── API.md               # API endpoints reference
│   ├── ARCHITECTURE.md      # Code architecture (module structure, flows, patterns)
│   ├── BASE-PATTERNS.md     # BaseEntity, BaseService, shared patterns
│   ├── BUSINESS-FEATURES.md # Feature list + business logic
│   ├── CHANGELOG.md         # Change log (semantic versioning)
│   ├── DATABASE.md          # Schema documentation
│   ├── DEPLOY-GUIDE.md      # Step-by-step: dev / prod / shared-VPS / docker
│   ├── DESIGN-SYSTEM.md     # UI components, colors, spacing
│   ├── erd.md               # Entity relationship diagram
│   ├── FLOWS.md             # Business flows (order, auth, payment...)
│   ├── INDEX.md             # File index (cập nhật khi thêm/xóa file)
│   ├── MODULES.md           # Backend module documentation
│   ├── TECH-OVERVIEW.md     # Stack choices + component roles + scaling
│   └── WORKFLOW.md          # Daily dev workflow
│
├── docker-compose.yml           # Dev: chỉ MySQL + Redis (infra)
├── docker-compose.dev.yml       # Dev override: hot-reload volumes
├── docker-compose.prod.yml      # Production standalone (all-in-one)
├── docker-compose.shared-vps.yml  # Shared VPS: chỉ BE + FE
│
├── .env.example             # Template biến môi trường (commit)
├── .gitignore
├── CLAUDE.md                # Rules cho Claude Code
├── DEPLOY.md                # Quick ops reference: VPS info, secrets, troubleshooting
├── README.md                # Project overview
└── deploy.sh                # Deploy script (dev/staging/prod/shared)
```

---

## 2. Quy Tắc Phân Chia Docker Compose

| File | Mục đích | Chạy ở đâu |
|------|----------|------------|
| `docker-compose.yml` | Dev infra: MySQL + Redis (ports exposed ra localhost) | Local |
| `docker-compose.dev.yml` | Override: volume mounts hot-reload cho BE/FE | Local |
| `docker-compose.prod.yml` | Standalone production: tất cả services trong 1 compose | VPS (standalone) |
| `docker-compose.shared-vps.yml` | Shared VPS: chỉ BE + FE, dùng external network | VPS (multi-project) |
| `infra/docker-compose.yml` | Shared infra: MySQL + Redis + Nginx + Certbot | VPS `/opt/infra/` |

**Nguyên tắc:**
- Không tạo thêm docker-compose ngoài danh sách trên trừ khi có lý do rõ ràng.
- Mỗi file phải có comment header giải thích mục đích và cách dùng.
- `infra/docker-compose.yml` là nguồn gốc thực của shared infra — không tạo bản copy thứ hai.

---

## 3. Quy Tắc Nginx Config

**Phân tách rõ ràng:**

| Thư mục | Loại config | Deploy đến đâu |
|---------|------------|----------------|
| `infra/nginx/nginx.conf` | Main config VPS (worker, gzip, rate limit, include conf.d) | `/opt/infra/nginx/nginx.conf` qua VPS setup |
| `infra/nginx/conf.d/{domain}.conf` | Server block domain thật | `/opt/infra/nginx/conf.d/` qua CI/CD |
| `nginx/nginx.conf` | Dev nginx (local only) | Không deploy |
| `nginx/nginx.prod.conf` | Standalone prod (không dùng shared) | Deploy trực tiếp lên server |
| `nginx/conf.d/template.conf` | Template placeholder (yourdomain.com) | Documentation only |

**Nguyên tắc:**
- Config nào upload lên VPS → đặt trong `infra/`.
- Config nào chỉ dùng local hoặc documentation → đặt trong `nginx/`.
- CI/CD workflow phải SCP từ `infra/nginx/conf.d/` lên VPS, không phải từ `nginx/conf.d/`.

---

## 4. Quy Tắc Scripts

**Đặt tên:**
- `verb-noun.sh` — ví dụ: `backup-mysql.sh`, `restore-gdrive.sh`, `setup-dev.sh`
- Không đặt tên chung chung như `run.sh`, `start.sh`

**Không được commit:**
- `backup.sh.old`, `*.old`, `*.bak` — xóa ngay khi có version mới
- Script tạm test một lần — xóa sau khi dùng xong

**Phải có:**
- Comment header: mục đích, cách dùng, ví dụ lệnh
- `set -euo pipefail` ở đầu mọi bash script quan trọng
- Output có màu cho script tương tác (GREEN/RED/YELLOW)

---

## 5. Quy Tắc Documentation

### Phân chia file doc

| File | Nội dung | KHÔNG đặt ở đây |
|------|----------|-----------------|
| `README.md` | Giới thiệu, quick start, links đến docs khác | Chi tiết deployment |
| `DEPLOY.md` (root) | Quick ops reference: VPS info, secrets checklist, troubleshooting | Step-by-step hướng dẫn |
| `docs/DEPLOY-GUIDE.md` | Step-by-step 4 modes: dev/prod/shared-VPS/docker | VPS-specific info |
| `docs/ARCHITECTURE.md` | Code structure: module patterns, flows, caching | Stack tech choices |
| `docs/TECH-OVERVIEW.md` | Tech stack choices + lý do chọn | Code structure |
| `docs/WORKFLOW.md` | Daily dev workflow + git conventions | Deployment |
| `docs/adr/` | Mỗi quyết định kiến trúc quan trọng = 1 ADR | |

### Nguyên tắc chống trùng lặp

- Mỗi chủ đề chỉ có **1 file chính**. File khác có thể *link* đến nhưng không *copy* nội dung.
- Khi thêm file doc mới: kiểm tra xem nội dung đã có ở file nào chưa.
- `docs/INDEX.md` là file index duy nhất — cập nhật mỗi khi thêm/xóa file.

### ADR (Architecture Decision Records)

Tạo ADR khi: chọn framework, thay đổi DB schema quan trọng, thay đổi auth flow, chọn pattern mới.

Format tên file: `docs/adr/NNNN-short-title.md`

Template:
```markdown
# NNNN. Tiêu đề quyết định

**Ngày:** YYYY-MM-DD
**Trạng thái:** Accepted / Deprecated / Superseded by NNNN

## Bối cảnh
Vấn đề cần giải quyết là gì?

## Quyết định
Chúng ta chọn gì?

## Lý do
Tại sao chọn cách này thay vì cách khác?

## Hệ quả
Ưu điểm / nhược điểm / trade-offs.
```

---

## 6. Quy Tắc `.gitignore`

### Phải ignore (không được commit)

```gitignore
# Dependencies
node_modules/

# Build outputs
dist/
build/
.next/
out/
*.tsbuildinfo

# Environment (sensitive)
.env
.env.local
.env.*.local
.env.prod
.env.staging
.env.production

# Logs
*.log
logs/

# Test artifacts
coverage/
frontend/test-results/

# Deploy artifacts
.deploy/
uploads/
backups/

# Secrets
*.pem
*.key
scripts/.gdrive-credentials.json

# OS
.DS_Store
Thumbs.db
```

### Exception pattern cho source code trùng tên

Nếu có thư mục source code trùng tên với pattern ignore (ví dụ `src/app/admin/logs/` bị ignore bởi `logs/`):

```gitignore
# Logs directory
logs/
# Exception: admin logs page là source code, không phải log files
!frontend/src/app/admin/logs/
```

### Phải commit (không được ignore)

- `.env.example` — template biến môi trường
- `config/env` — non-sensitive prod config (domain, ports, DB name không có password)
- `scripts/secrets/` folder — chứa encrypt/decrypt scripts, không chứa secret thật
- Tất cả `*.conf` nginx
- Tất cả `docker-compose*.yml`

---

## 7. Quy Tắc GitHub Workflows

### Workflows bắt buộc track

Tất cả file `.github/workflows/*.yml` phải được commit — không để untracked.

### Phân loại trigger

| Workflow | Trigger | Mục đích |
|----------|---------|----------|
| `ci.yml` | push/PR | Typecheck + lint + test |
| `deploy.yml` | push main | Deploy tự động |
| `release.yml` | tag push | Tạo GitHub release |
| `ssl-renew.yml` | cron + manual | Gia hạn SSL |
| `restore.yml` | manual only | Restore backup |
| `vps-setup.yml` | manual only | Setup VPS lần đầu |
| `fix-nginx.yml` | manual only | Emergency fix |

### Secrets — không commit, lưu trong GitHub Actions Secrets

Naming convention: `{PROJECT_PREFIX}_{KEY}` — ví dụ `WT_DB_PASSWORD`, `WT_S3_BUCKET`.

Secrets dùng chung cho mọi project (VPS infra): `VPS_HOST`, `VPS_PORT`, `VPS_USER`, `VPS_PASSWORD`, `MYSQL_ROOT_PASSWORD`.

---

## 8. Phân Biệt `infra/` vs `nginx/` vs `config/`

| Thư mục | Nội dung | Deploy đến |
|---------|----------|-----------|
| `infra/` | Files upload lên `/opt/{project}/` hoặc `/opt/infra/` trên VPS | VPS (qua CI/CD hoặc vps-setup) |
| `nginx/` | Local / documentation nginx configs | Không deploy (hoặc standalone server) |
| `config/` | Non-sensitive application config (domain, port, DB name) | VPS qua CI/CD (không chứa password) |

**Nguyên tắc vàng:** Nhìn vào `infra/` biết ngay VPS đang chạy gì.

---

## 9. Checklist Khi Tạo Repo Mới

### Cấu trúc ban đầu

- [ ] Tạo đủ thư mục: `infra/nginx/conf.d/`, `scripts/lib/`, `scripts/secrets/`, `docs/adr/`, `config/`, `nginx/conf.d/`
- [ ] `.gitignore` theo template section 6
- [ ] `.env.example` với tất cả biến môi trường (không có giá trị thật)
- [ ] `config/env` với non-sensitive prod config
- [ ] `README.md` basic
- [ ] `DEPLOY.md` với VPS info, secrets list, troubleshooting
- [ ] `docs/DEPLOY-GUIDE.md` step-by-step

### Docker Compose

- [ ] `docker-compose.yml` — dev infra (chỉ DB + cache)
- [ ] `docker-compose.dev.yml` — dev hot-reload override
- [ ] `docker-compose.prod.yml` — standalone production
- [ ] `docker-compose.shared-vps.yml` — nếu VPS chạy nhiều project

### Nginx

- [ ] `infra/nginx/nginx.conf` — shared nginx main config
- [ ] `infra/nginx/conf.d/{domain}.conf` — server block domain thật
- [ ] `nginx/conf.d/template.conf` — template placeholder

### Scripts

- [ ] `scripts/setup-dev.sh` — setup một lệnh
- [ ] `scripts/migrate.sh` — migration wrapper
- [ ] `scripts/init-first-time.sh` — VPS setup

### Workflows

- [ ] `ci.yml`
- [ ] `deploy.yml` (SCP từ `infra/nginx/conf.d/` không phải `nginx/conf.d/`)
- [ ] `restore.yml`
- [ ] `ssl-renew.yml`
- [ ] `vps-setup.yml`

### Docs

- [ ] `docs/INDEX.md` liệt kê đủ mọi file
- [ ] `docs/adr/README.md` ADR index
- [ ] Không có 2 file doc cùng chủ đề

---

## 10. Anti-Patterns Cần Tránh

| Anti-pattern | Thay bằng |
|-------------|-----------|
| `docker-compose.shared-infra.yml` song song với `infra/docker-compose.yml` | Chỉ giữ `infra/docker-compose.yml` |
| `nginx/shared-nginx.conf` song song với `infra/nginx/nginx.conf` | Chỉ giữ `infra/nginx/nginx.conf` |
| `docs/DEPLOYMENT.md` + `docs/DEPLOY-GUIDE.md` cùng topic | 1 file duy nhất |
| `script.sh.old`, `script_v2.sh`, `script_backup.sh` | Dùng git history |
| `logs/*.log` bị commit | Thêm vào `.gitignore` |
| Workflow file untracked | Commit tất cả |
| nginx config domain thật nằm trong `nginx/` (không phải `infra/`) | Chuyển vào `infra/nginx/conf.d/` |
| Secret value trong `config/env` | Chỉ non-sensitive, sensitive → GitHub Secrets |
