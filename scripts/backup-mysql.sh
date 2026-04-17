#!/bin/bash
# ──────────────────────────────────────────
# MySQL Daily Backup Script — LeQuyDon
# Run via cron: 0 2 * * * /opt/webtemplate/scripts/backup-mysql.sh
# ──────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
. "${SCRIPT_DIR}/lib/_logging.sh"

# Configuration — override via env vars
BACKUP_DIR="${BACKUP_DIR:-/opt/webtemplate/backups/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
DB_CONTAINER="${DB_CONTAINER:-wt-mysql}"
DB_NAME="${DB_NAME:-webtemplate}"
DB_USER="${DB_USER:-wtuser}"
LOG_FILE="${LOG_FILE:-/var/log/webtemplate/backup.log}"

# Setup log + traps
log_init
LOG_START_SEC=$SECONDS
trap 'log_trap_err $? $LINENO "$BASH_COMMAND"' ERR
trap 'log_trap_exit $?' EXIT

# Password bat buoc tu env var hoac .env
if [ -z "${MYSQL_BACKUP_PASSWORD:-}" ]; then
  if [ -f /opt/webtemplate/.env ]; then
    DB_PASSWORD=$(grep '^LQD_DB_PASSWORD=' /opt/webtemplate/.env | cut -d= -f2- | tr -d '"' | tr -d "'")
  fi
  if [ -z "${DB_PASSWORD:-}" ]; then
    log_error "MYSQL_BACKUP_PASSWORD env var not set and cannot read from .env"
    exit 1
  fi
else
  DB_PASSWORD="${MYSQL_BACKUP_PASSWORD}"
fi

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.sql.gz"
DUMP_STDERR="${BACKUP_FILE}.dump.stderr"

mkdir -p "${BACKUP_DIR}"

log_info "Starting MySQL backup container=${DB_CONTAINER} db=${DB_NAME} user=${DB_USER} target=${BACKUP_FILE}"

# Kiem tra container co chay khong
if ! docker ps --format '{{.Names}}' | grep -qx "${DB_CONTAINER}"; then
  log_error "Container ${DB_CONTAINER} is not running"
  exit 1
fi

# Log MySQL version cho forensic
# Dung --protocol=tcp -h 127.0.0.1 de buoc TCP, tranh user@localhost vs @% grant mismatch
MYSQL_VERSION=$(docker exec -e MYSQL_PWD="${DB_PASSWORD}" "${DB_CONTAINER}" mysql --protocol=tcp -h 127.0.0.1 -u"${DB_USER}" -N -e "SELECT VERSION();" 2>/dev/null || echo "unknown")
log_info "MySQL version: ${MYSQL_VERSION}"

# Dump DB — redirect STDERR cua mysqldump vao temp file de log sau
# Dung MYSQL_PWD (truyen qua -e cua docker) de khong lo pass qua argv (ps -ef).
DUMP_START=$SECONDS
if docker exec -e MYSQL_PWD="${DB_PASSWORD}" -i "${DB_CONTAINER}" mysqldump \
    --protocol=tcp -h 127.0.0.1 \
    -u"${DB_USER}" \
    --single-transaction \
    --routines \
    --triggers \
    --events \
    --set-gtid-purged=OFF \
    --no-tablespaces \
    "${DB_NAME}" 2>"${DUMP_STDERR}" | gzip > "${BACKUP_FILE}"; then
  DUMP_DUR=$((SECONDS - DUMP_START))
  FILESIZE=$(log_fsize "${BACKUP_FILE}")
  FILESHA=$(log_sha256 "${BACKUP_FILE}")
  log_info "Dump OK file=${BACKUP_FILE} size=${FILESIZE} sha256=${FILESHA:0:16} duration=${DUMP_DUR}s"
  # Log mysqldump warnings neu co (khong fail)
  if [ -s "${DUMP_STDERR}" ]; then
    log_warn "mysqldump stderr ($(wc -l <"${DUMP_STDERR}") lines): see ${DUMP_STDERR}"
    head -20 "${DUMP_STDERR}" | while IFS= read -r line; do log_warn "  dump: ${line}"; done
  else
    rm -f "${DUMP_STDERR}"
  fi
else
  log_error "mysqldump failed — see ${DUMP_STDERR}"
  [ -s "${DUMP_STDERR}" ] && head -20 "${DUMP_STDERR}" | while IFS= read -r line; do log_error "  dump: ${line}"; done
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Verify backup non-empty
if [ ! -s "${BACKUP_FILE}" ]; then
  log_error "Backup file is empty!"
  rm -f "${BACKUP_FILE}"
  exit 1
fi

# Verify gzip integrity
if ! gunzip -t "${BACKUP_FILE}" 2>/dev/null; then
  log_error "Backup file corrupt (gunzip -t failed)!"
  exit 1
fi
log_info "Gzip integrity verified"

# Cleanup cac backup cu hon RETENTION_DAYS
DELETED_LIST=$(find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -print 2>/dev/null || true)
if [ -n "${DELETED_LIST}" ]; then
  DELETED_COUNT=$(echo "${DELETED_LIST}" | wc -l)
  echo "${DELETED_LIST}" | while IFS= read -r f; do log_info "pruning old: ${f}"; done
  find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true
  log_info "Pruned ${DELETED_COUNT} backup(s) older than ${RETENTION_DAYS} days"
fi

# Remote sync qua rclone (optional)
if command -v rclone &> /dev/null; then
  REMOTE="${RCLONE_REMOTE:-r2:webtemplate-backups/mysql/}"
  log_info "Uploading to rclone remote: ${REMOTE}"
  if rclone copy "${BACKUP_FILE}" "${REMOTE}" --progress >>"${LOG_FILE}" 2>&1; then
    log_info "Remote upload OK"
  else
    log_warn "Remote upload FAILED — local backup preserved"
  fi
else
  log_info "rclone not installed, skipping remote upload"
fi

log_info "Summary: file=${BACKUP_FILE} size=${FILESIZE} sha256=${FILESHA:0:16}"
