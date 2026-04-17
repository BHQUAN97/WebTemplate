# Scripts — WebTemplate

Backup / restore / ops tooling cho WebTemplate. Tat ca script bash duoc viet voi `set -euo pipefail`.

## Muc luc

| Script | Muc dich |
|---|---|
| `backup-mysql.sh` | Dump MySQL gzipped, retention 7 ngay, optional rclone upload |
| `restore-mysql.sh` | Restore dump `.sql.gz` vao container MySQL (interactive hoac tu arg) |
| `backup-gdrive.js` | Node CLI upload DB + uploads len Google Drive qua Service Account |
| `backup-gdrive.sh` | Bash wrapper cho backup-gdrive.js (load .env, log, cron-friendly) |
| `backup.sh.old` | Script backup cu (giu tham chieu, khong dung nua) |
| `migrate.sh` | TypeORM migration helper |
| `setup-dev.sh` / `init-first-time.sh` | Dev bootstrap |
| `generate-module.js` | CLI scaffold NestJS module (entity + service + controller + DTOs) |

---

## 1. `backup-mysql.sh`

Dump database va nen `.sql.gz` vao `BACKUP_DIR`. Xoa backup cu hon `RETENTION_DAYS`. Neu co `rclone` se upload len remote `r2:webtemplate-backups/mysql/`.

### Usage
```bash
# One-shot manual
./scripts/backup-mysql.sh

# Override config qua env vars
BACKUP_DIR=/tmp/wt-backups DB_NAME=webtemplate RETENTION_DAYS=14 ./scripts/backup-mysql.sh

# Password: dat MYSQL_BACKUP_PASSWORD hoac luu DB_PASSWORD vao /opt/webtemplate/.env
export MYSQL_BACKUP_PASSWORD='xxx'
./scripts/backup-mysql.sh
```

### Env vars
- `BACKUP_DIR` (default `/opt/webtemplate/backups/mysql`)
- `RETENTION_DAYS` (default `7`)
- `DB_CONTAINER` (default `wt-mysql`)
- `DB_NAME` (default `webtemplate`)
- `DB_USER` (default `wtuser`)
- `MYSQL_BACKUP_PASSWORD` — bat buoc (hoac doc tu `/opt/webtemplate/.env`)

### Output
- File: `${BACKUP_DIR}/${DB_NAME}_YYYY-MM-DD_HH-MM.sql.gz`
- Log: `/var/log/webtemplate/backup.log`

---

## 2. `restore-mysql.sh`

Restore backup `.sql.gz` vao container MySQL. Verify gzip integrity, prompt confirmation, ghi log start/end/duration.

### Usage
```bash
# Interactive: script liet ke tat ca backup va cho chon
./scripts/restore-mysql.sh

# Restore file cu the
./scripts/restore-mysql.sh /opt/webtemplate/backups/mysql/webtemplate_2026-04-17_02-00.sql.gz

# Skip confirmation (dung cho CI / automation)
./scripts/restore-mysql.sh /opt/webtemplate/backups/mysql/webtemplate_2026-04-17_02-00.sql.gz --force
```

### Exit codes
| Code | Nghia |
|---|---|
| 0 | Success |
| 1 | File not found / directory missing |
| 2 | Gzip corrupted (`gunzip -t` fail) |
| 3 | MySQL restore failed / container khong chay / khong co password |
| 4 | User aborted (khong confirm hoac chon `q`) |

### Env vars
Cung nhom nhu backup + `LOG_FILE` (default `/var/log/webtemplate/restore.log`).

---

## 3. `backup-gdrive.js` + `backup-gdrive.sh`

Upload DB dump moi nhat + zip uploads folder len Google Drive qua Service Account.

### Setup mot lan
```bash
cd scripts
npm install                                         # cai googleapis, archiver, dotenv
cp .gdrive-credentials.example.json .gdrive-credentials.json
# Doc _setup_instructions trong file .example.json roi replace gia tri that
```

### Usage
```bash
# Manual via wrapper (load .env + log)
./scripts/backup-gdrive.sh all            # DB + media
./scripts/backup-gdrive.sh db             # chi DB
./scripts/backup-gdrive.sh media          # chi uploads

# Truc tiep node (dry-run, force...)
node scripts/backup-gdrive.js --type=all --dry-run
node scripts/backup-gdrive.js --type=db --force
```

### Env vars (xem `.env.example`)
- `GDRIVE_ENABLED=true` — bat/tat
- `GDRIVE_CREDENTIALS_PATH` — path toi JSON service account
- `GDRIVE_FOLDER_ID` — ID folder da share voi service account
- `GDRIVE_DB_SUBFOLDER` / `GDRIVE_UPLOADS_SUBFOLDER`
- `GDRIVE_KEEP_COUNT` — giu N ban moi nhat
- `BACKUP_DIR` — noi backup-mysql.sh ghi `.sql.gz`
- `UPLOADS_DIR` — folder uploads cua backend (se zip truoc khi upload)

---

## Cron setup

Tren VPS:

```cron
# Backup MySQL moi dem luc 2h sang
0 2 * * * /opt/webtemplate/scripts/backup-mysql.sh >> /var/log/webtemplate/backup.log 2>&1

# Sync len Google Drive luc 2h15
15 2 * * * /opt/webtemplate/scripts/backup-gdrive.sh all >> /var/log/webtemplate/backup.log 2>&1
```

Cai dat:
```bash
crontab -e
# paste cac dong tren, save
crontab -l   # verify
```

---

## Troubleshooting

### `ERROR: MYSQL_BACKUP_PASSWORD env var not set`
- Export env var truoc khi chay, hoac dam bao `/opt/webtemplate/.env` co dong `DB_PASSWORD=...`.

### `Container "wt-mysql" khong chay`
- `docker ps` kiem tra ten container. Override qua env: `DB_CONTAINER=webtemplate-mysql-1 ./restore-mysql.sh ...`.

### `File gzip bi corrupt`
- `gunzip -t file.sql.gz` de verify thu cong. Neu corrupt thi file dump loi — lay backup khac.

### Restore xong nhung app van doc du lieu cu
- Xoa cache Redis: `docker exec wt-redis redis-cli FLUSHDB`
- Restart backend: `docker compose restart backend`

### GDrive upload fail: `Missing required config`
- Kiem tra `.env` co `GDRIVE_FOLDER_ID` va file `scripts/.gdrive-credentials.json` ton tai.
- Dam bao folder Drive da duoc share voi `client_email` cua service account (role Editor).

### Permission denied khi chay restore
- `chmod +x scripts/restore-mysql.sh`
- Tren Windows dung Git Bash / WSL, khong dung cmd.exe.

---

## 4. `generate-module.js` — NestJS module scaffolder

Sinh cau truc module NestJS dong bo voi convention cua project (entity extends
`BaseEntity`, service extends `BaseService`, DTO dung `class-validator`,
import dung `.js` extension cho ESM compat).

### Usage
```bash
# Truc tiep (tu repo root)
node scripts/generate-module.js products
node scripts/generate-module.js product-categories

# Hoac qua npm script trong scripts/
cd scripts && npm run gen:module -- products

# Hoac qua root package.json (sau khi them — xem Task 5 setup)
npm run gen:module products
```

### Input
- Ten module **kebab-case**, dang plural hoac singular (script tu chuan hoa).
  VD: `products`, `product`, `product-categories`, `news`.

### Output
```
backend/src/modules/{name}/
├── {name}.module.ts
├── {name}.controller.ts        — CRUD: GET list, GET :id, POST, PATCH, DELETE
├── {name}.service.ts           — extends BaseService<Entity>, searchableFields
├── entities/{singular}.entity.ts  — extends BaseEntity
├── dto/create-{singular}.dto.ts
├── dto/update-{singular}.dto.ts   — PartialType(Create...)
└── dto/query-{name}.dto.ts        — extends PaginationDto
```

### Sau khi chay
Script se in ra 3 buoc tiep theo:
1. Them `{Name}Module` vao `backend/src/app.module.ts` imports[]
2. `./scripts/migrate.sh generate Create{Name}Table`
3. `./scripts/migrate.sh run`

### Error cases
- Ten khong phai kebab-case → exit 1.
- Folder `backend/src/modules/{name}/` da ton tai → exit 1 (khong overwrite).
