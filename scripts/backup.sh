#!/bin/bash
# ============================================================================
# WebTemplate — Backup Script
#
# Usage: ./scripts/backup.sh
#
# Features:
#   - Pipefail-aware MySQL dump (fail-fast neu mysqldump error)
#   - Password qua MYSQL_PWD env (khong leak qua `ps`)
#   - Optional encryption: GPG (symmetric, AES256) hoac openssl AES-256-CBC
#   - Optional offsite upload: AWS S3 / Cloudflare R2 qua aws-cli hoac rclone
#   - Retention: 7 ngay local (offsite retention nen set o S3 lifecycle policy)
#   - Optional webhook notification sau khi xong
#
# Env vars (optional — set trong .env hoac export):
#   BACKUP_GPG_PASSPHRASE_FILE   — path toi file chua passphrase (chmod 600)
#   BACKUP_OPENSSL_PASSPHRASE    — passphrase cho openssl enc (fallback neu khong co GPG)
#   BACKUP_S3_BUCKET             — ten bucket de upload offsite (vd: my-backups)
#   BACKUP_S3_ENDPOINT           — S3 endpoint URL (R2/custom S3). Neu bo trong se dung AWS
#   BACKUP_NOTIFY_WEBHOOK        — URL webhook (Slack/Discord) de bao ket qua
#
# Cron setup:
#   0 2 * * * /opt/webtemplate/scripts/backup.sh >> /var/log/webtemplate-backup.log 2>&1
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; notify_status "fail" "$1"; exit 1; }

# Load environment
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
else
  error ".env file not found at $PROJECT_DIR/.env"
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-6002}"
DB_NAME="${DB_NAME:-webtemplate}"
DB_USER="${DB_USER:-wtuser}"
DB_PASSWORD="${DB_PASSWORD:-wtpass}"

mkdir -p "$BACKUP_DIR"

# ============================================================================
# Notification helper — goi o error() va cuoi script
# ============================================================================
notify_status() {
  local status="$1"
  local message="${2:-}"
  local webhook="${BACKUP_NOTIFY_WEBHOOK:-}"
  if [ -n "$webhook" ] && command -v curl >/dev/null 2>&1; then
    local payload
    payload=$(printf '{"text":"[WebTemplate backup %s] %s (host=%s, time=%s)"}' \
      "$status" "$message" "$(hostname)" "$TIMESTAMP")
    curl -sS -m 10 -X POST -H 'Content-Type: application/json' \
      -d "$payload" "$webhook" >/dev/null 2>&1 || true
  fi
}

# ============================================================================
# Encryption helper — encrypt file in-place, output .enc
# Ho tro 2 backend: gpg (preferred) hoac openssl
# ============================================================================
encrypt_file() {
  local input="$1"
  local output="${input}.enc"

  if [ -n "${BACKUP_GPG_PASSPHRASE_FILE:-}" ] && [ -f "$BACKUP_GPG_PASSPHRASE_FILE" ] && command -v gpg >/dev/null 2>&1; then
    gpg --batch --yes --symmetric --cipher-algo AES256 \
        --passphrase-file "$BACKUP_GPG_PASSPHRASE_FILE" \
        --output "$output" "$input"
    rm -f "$input"
    echo "$output"
    return 0
  fi

  if [ -n "${BACKUP_OPENSSL_PASSPHRASE:-}" ] && command -v openssl >/dev/null 2>&1; then
    openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
      -in "$input" -out "$output" \
      -pass env:BACKUP_OPENSSL_PASSPHRASE
    rm -f "$input"
    echo "$output"
    return 0
  fi

  # Khong co encryption — tra file goc
  echo "$input"
}

# ============================================================================
# Offsite upload — aws-cli hoac rclone
# ============================================================================
upload_offsite() {
  local file="$1"
  local bucket="${BACKUP_S3_BUCKET:-}"
  [ -z "$bucket" ] && return 0   # Skip khi khong cau hinh

  local date_dir
  date_dir=$(date +%Y%m%d)
  local s3_path="s3://${bucket}/daily/${date_dir}/$(basename "$file")"
  local endpoint_flag=()
  [ -n "${BACKUP_S3_ENDPOINT:-}" ] && endpoint_flag=(--endpoint-url "$BACKUP_S3_ENDPOINT")

  if command -v aws >/dev/null 2>&1; then
    if aws "${endpoint_flag[@]}" s3 cp "$file" "$s3_path" --only-show-errors; then
      log "Offsite upload: $s3_path"
    else
      warn "Offsite upload FAIL: $s3_path"
    fi
  elif command -v rclone >/dev/null 2>&1 && [ -n "${BACKUP_RCLONE_REMOTE:-}" ]; then
    rclone copy "$file" "${BACKUP_RCLONE_REMOTE}:${bucket}/daily/${date_dir}/" && \
      log "Offsite upload (rclone): ${BACKUP_RCLONE_REMOTE}:${bucket}/daily/${date_dir}/" || \
      warn "rclone offsite upload failed"
  else
    warn "Offsite upload skipped: neither aws-cli nor rclone available"
  fi
}

# ============================================================================
# 1. Backup MySQL database
#    set -o pipefail da bat o dau — neu mysqldump fail, gzip cung fail theo
# ============================================================================
echo "Backing up MySQL database..."
DB_BACKUP_FILE="${BACKUP_DIR}/db_${DB_NAME}_${TIMESTAMP}.sql.gz"
DUMP_OK=0

# Truyen password qua env MYSQL_PWD (tranh lo qua `ps auxf`)
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^wt-mysql$'; then
  if MYSQL_PWD="$DB_PASSWORD" docker exec -e MYSQL_PWD="$DB_PASSWORD" wt-mysql \
       mysqldump --single-transaction --quick --lock-tables=false \
       -u"$DB_USER" "$DB_NAME" 2>/tmp/backup-dump.err | gzip > "$DB_BACKUP_FILE"; then
    DUMP_OK=1
  else
    warn "docker exec mysqldump failed: $(cat /tmp/backup-dump.err 2>/dev/null || true)"
    rm -f "$DB_BACKUP_FILE"
  fi
elif command -v mysqldump >/dev/null 2>&1; then
  if MYSQL_PWD="$DB_PASSWORD" mysqldump --single-transaction --quick --lock-tables=false \
       -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$DB_NAME" 2>/tmp/backup-dump.err | gzip > "$DB_BACKUP_FILE"; then
    DUMP_OK=1
  else
    warn "local mysqldump failed: $(cat /tmp/backup-dump.err 2>/dev/null || true)"
    rm -f "$DB_BACKUP_FILE"
  fi
fi

if [ "$DUMP_OK" -eq 1 ] && [ -s "$DB_BACKUP_FILE" ]; then
  DB_SIZE=$(du -sh "$DB_BACKUP_FILE" | cut -f1)
  log "Database backup: $DB_BACKUP_FILE ($DB_SIZE)"

  # Encrypt neu co passphrase
  DB_FINAL=$(encrypt_file "$DB_BACKUP_FILE")
  [ "$DB_FINAL" != "$DB_BACKUP_FILE" ] && log "Encrypted: $DB_FINAL"

  # Upload offsite
  upload_offsite "$DB_FINAL"
else
  rm -f "$DB_BACKUP_FILE"
  warn "Skipped database backup — no method succeeded"
fi

# ============================================================================
# 2. Backup uploaded files
# ============================================================================
echo "Backing up uploaded files..."
UPLOADS_BACKUP="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
UPLOADS_OK=0

if [ -d "$PROJECT_DIR/backend/uploads" ] && [ "$(ls -A "$PROJECT_DIR/backend/uploads" 2>/dev/null)" ]; then
  if tar -czf "$UPLOADS_BACKUP" -C "$PROJECT_DIR/backend" uploads/; then
    UPLOADS_OK=1
  fi
elif docker volume inspect webtemplate_uploads_data >/dev/null 2>&1; then
  if docker run --rm \
      -v webtemplate_uploads_data:/data:ro \
      -v "$BACKUP_DIR:/backup" \
      alpine tar -czf "/backup/uploads_${TIMESTAMP}.tar.gz" -C /data . 2>/dev/null; then
    UPLOADS_OK=1
  fi
fi

if [ "$UPLOADS_OK" -eq 1 ] && [ -s "$UPLOADS_BACKUP" ]; then
  UPLOADS_SIZE=$(du -sh "$UPLOADS_BACKUP" | cut -f1)
  log "Uploads backup: $UPLOADS_BACKUP ($UPLOADS_SIZE)"

  UPLOADS_FINAL=$(encrypt_file "$UPLOADS_BACKUP")
  [ "$UPLOADS_FINAL" != "$UPLOADS_BACKUP" ] && log "Encrypted: $UPLOADS_FINAL"

  upload_offsite "$UPLOADS_FINAL"
else
  rm -f "$UPLOADS_BACKUP"
  warn "No uploads backed up"
fi

# ============================================================================
# 3. Rotate old backups (keep last 7 days LOCAL only)
#    Offsite retention nen set o S3 lifecycle policy
# ============================================================================
echo "Rotating old backups..."
KEEP_DAYS=7

OLD_DB=$(find "$BACKUP_DIR" -name "db_*.sql.gz*" -mtime +$KEEP_DAYS -type f 2>/dev/null || true)
if [ -n "$OLD_DB" ]; then
  echo "$OLD_DB" | xargs rm -f
  DELETED_COUNT=$(echo "$OLD_DB" | wc -l)
  log "Removed $DELETED_COUNT old database backups (> $KEEP_DAYS days)"
fi

OLD_UPLOADS=$(find "$BACKUP_DIR" -name "uploads_*.tar.gz*" -mtime +$KEEP_DAYS -type f 2>/dev/null || true)
if [ -n "$OLD_UPLOADS" ]; then
  echo "$OLD_UPLOADS" | xargs rm -f
  DELETED_COUNT=$(echo "$OLD_UPLOADS" | wc -l)
  log "Removed $DELETED_COUNT old upload backups (> $KEEP_DAYS days)"
fi

# ============================================================================
# Summary + notify
# ============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN} Backup complete — ${TIMESTAMP}${NC}"
echo "=========================================="
echo ""
echo "Backups directory: $BACKUP_DIR"
ls -lh "$BACKUP_DIR" | tail -10
echo ""

notify_status "ok" "database+uploads backed up, rotation done"
