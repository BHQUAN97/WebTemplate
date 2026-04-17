#!/usr/bin/env bash
# ──────────────────────────────────────────
# MySQL Restore Script — LeQuyDon
# Restore a gzipped SQL dump created by backup-mysql.sh into the MySQL container.
#
# Usage:
#   ./restore-mysql.sh                         # interactive: pick from list
#   ./restore-mysql.sh /path/to/backup.sql.gz  # restore specific file
#   ./restore-mysql.sh /path/to/backup.sql.gz --force  # skip confirmation
#
# Exit codes:
#   0 success
#   1 file not found
#   2 gzip file corrupted
#   3 restore failed (mysql error)
#   4 user aborted at confirmation
# ──────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Color codes (ANSI) ─────────────────────
if [ -t 1 ]; then
    RED=$'\033[0;31m'
    GREEN=$'\033[0;32m'
    YELLOW=$'\033[1;33m'
    CYAN=$'\033[0;36m'
    BOLD=$'\033[1m'
    RESET=$'\033[0m'
else
    RED=""; GREEN=""; YELLOW=""; CYAN=""; BOLD=""; RESET=""
fi

# Console-facing logs (voi mau) — giu de UX interactive tot
log_info()    { echo "${CYAN}[INFO]${RESET}  $1"; }
log_ok()      { echo "${GREEN}[OK]${RESET}    $1"; }
log_warn()    { echo "${YELLOW}[WARN]${RESET}  $1"; }
log_error()   { echo "${RED}[ERROR]${RESET} $1" >&2; }

# Import structured logger (log_info_f, log_warn_f... ghi file co session ID)
# Shadow ten goc bang alias _f de khong doi code hien co
if [ -f "${SCRIPT_DIR}/lib/_logging.sh" ]; then
    # Import voi alias de tranh doi console log behavior
    _orig_info=$(declare -f log_info)
    # shellcheck disable=SC1091
    . "${SCRIPT_DIR}/lib/_logging.sh"
    # Restore console logs (lib ghi da file-focused)
    log_info()  { echo "${CYAN}[INFO]${RESET}  $1"; __log_write info "$1" >/dev/null 2>&1 || true; }
    log_ok()    { echo "${GREEN}[OK]${RESET}    $1"; __log_write info "OK: $1" >/dev/null 2>&1 || true; }
    log_warn()  { echo "${YELLOW}[WARN]${RESET}  $1"; __log_write warn "$1" >/dev/null 2>&1 || true; }
    log_error() { echo "${RED}[ERROR]${RESET} $1" >&2; __log_write error "$1" >/dev/null 2>&1 || true; }
fi

# ── Configuration — override via env vars ──
# Respect same defaults as backup-mysql.sh for consistency
BACKUP_DIR="${BACKUP_DIR:-/opt/webtemplate/backups/mysql}"
DB_CONTAINER="${DB_CONTAINER:-${MYSQL_CONTAINER_NAME:-wt-mysql}}"
DB_NAME="${DB_NAME:-${MYSQL_DATABASE:-webtemplate}}"
DB_USER="${DB_USER:-${MYSQL_USER:-wtuser}}"
LOG_FILE="${LOG_FILE:-/var/log/webtemplate/restore.log}"
ENV_FILE="${ENV_FILE:-/opt/webtemplate/.env}"

# Doc password theo thu tu uu tien: env var -> .env file
resolve_password() {
    if [ -n "${MYSQL_BACKUP_PASSWORD:-}" ]; then
        DB_PASSWORD="${MYSQL_BACKUP_PASSWORD}"
        return 0
    fi
    if [ -n "${MYSQL_PASSWORD:-}" ]; then
        DB_PASSWORD="${MYSQL_PASSWORD}"
        return 0
    fi
    # Fallback: repo-root .env khi chay tu dev machine
    local repo_env
    repo_env="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/.env"
    for candidate in "${ENV_FILE}" "${repo_env}"; do
        if [ -f "${candidate}" ]; then
            DB_PASSWORD=$(grep -E '^(LQD_DB_PASSWORD|MYSQL_PASSWORD|DB_PASSWORD)=' "${candidate}" \
                | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'") || true
            if [ -n "${DB_PASSWORD:-}" ]; then
                return 0
            fi
        fi
    done
    log_error "Khong tim thay DB password (env MYSQL_BACKUP_PASSWORD / MYSQL_PASSWORD hoac file .env)"
    exit 3
}

# ── Parse arguments ────────────────────────
FORCE=0
BACKUP_FILE=""
for arg in "$@"; do
    case "${arg}" in
        --force|-f)
            FORCE=1
            ;;
        -h|--help)
            sed -n '2,14p' "$0"
            exit 0
            ;;
        *)
            if [ -z "${BACKUP_FILE}" ]; then
                BACKUP_FILE="${arg}"
            fi
            ;;
    esac
done

# ── Interactive selection neu chua co file arg ──
interactive_pick() {
    log_info "Quet backup trong ${BACKUP_DIR}..."
    if [ ! -d "${BACKUP_DIR}" ]; then
        log_error "Thu muc backup khong ton tai: ${BACKUP_DIR}"
        exit 1
    fi

    # Liet ke file .sql.gz theo thu tu moi nhat truoc
    mapfile -t FILES < <(find "${BACKUP_DIR}" -maxdepth 1 -type f -name "*.sql.gz" -printf "%T@ %p\n" \
        | sort -rn | cut -d' ' -f2-)

    if [ "${#FILES[@]}" -eq 0 ]; then
        log_error "Khong co file .sql.gz trong ${BACKUP_DIR}"
        exit 1
    fi

    echo
    echo "${BOLD}Chon backup de restore:${RESET}"
    PS3=$'\n'"Nhap so thu tu (q = thoat): "
    select choice in "${FILES[@]}"; do
        if [ -z "${choice:-}" ]; then
            if [ "${REPLY}" = "q" ] || [ "${REPLY}" = "Q" ]; then
                log_warn "Nguoi dung huy chon"
                exit 4
            fi
            echo "Lua chon khong hop le, thu lai."
            continue
        fi
        BACKUP_FILE="${choice}"
        break
    done
}

if [ -z "${BACKUP_FILE}" ]; then
    interactive_pick
fi

# ── Validate file ──────────────────────────
if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "File backup khong ton tai: ${BACKUP_FILE}"
    exit 1
fi

if [[ "${BACKUP_FILE}" != *.sql.gz ]]; then
    log_error "File phai co extension .sql.gz (got: ${BACKUP_FILE})"
    exit 1
fi

# Kiem tra gzip integrity truoc khi chay mysql import
log_info "Kiem tra gzip integrity..."
if ! gunzip -t "${BACKUP_FILE}" 2>/dev/null; then
    log_error "File gzip bi corrupt: ${BACKUP_FILE}"
    exit 2
fi
log_ok "Gzip integrity OK"

# ── Confirmation prompt ────────────────────
FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
FILESIZE_BYTES=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || wc -c < "${BACKUP_FILE}")

echo
echo "${BOLD}── Restore plan ─${RESET}"
echo "  Backup file : ${BACKUP_FILE}"
echo "  Size        : ${FILESIZE} (${FILESIZE_BYTES} bytes)"
echo "  Container   : ${DB_CONTAINER}"
echo "  Database    : ${DB_NAME}"
echo "  User        : ${DB_USER}"
echo

if [ "${FORCE}" -ne 1 ]; then
    echo "${YELLOW}${BOLD}WARNING${RESET}${YELLOW}: Thao tac se ghi de DB hien tai \"${DB_NAME}\".${RESET}"
    read -r -p "Type 'yes' de tiep tuc: " CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
        log_warn "Nguoi dung huy (goi y: gan co --force de skip prompt)"
        exit 4
    fi
fi

# ── Resolve password & kiem tra container ──
resolve_password

if ! docker ps --format '{{.Names}}' | grep -qx "${DB_CONTAINER}"; then
    log_error "Container \"${DB_CONTAINER}\" khong chay. Chay 'docker ps' de kiem tra."
    exit 3
fi

# ── Prepare log ────────────────────────────
mkdir -p "$(dirname "${LOG_FILE}")" 2>/dev/null || LOG_FILE="/tmp/lqd-restore.log"
# Init structured logger (rotation, session header)
if command -v log_init >/dev/null 2>&1; then
    LOG_START_SEC=$SECONDS
    log_init
fi

# Dung structured logger neu co, fallback write_log cho backward compat
if command -v __log_write >/dev/null 2>&1; then
    write_log() { __log_write info "$1"; }
else
    write_log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}" >/dev/null
    }
fi

# SHA256 cua backup file — de verify sau
if command -v log_sha256 >/dev/null 2>&1; then
    FILE_SHA=$(log_sha256 "${BACKUP_FILE}")
    log_info "Backup SHA256: ${FILE_SHA:0:16}... (full in log)"
    write_log "Backup SHA256 full: ${FILE_SHA}"
fi

# Snapshot state DB truoc restore (de compare sau)
# Dung --protocol=tcp de khop user@% grant thay vi @localhost
PRE_TABLES=$(docker exec -e MYSQL_PWD="${DB_PASSWORD}" "${DB_CONTAINER}" \
    mysql --protocol=tcp -h 127.0.0.1 -N -u"${DB_USER}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'" 2>/dev/null || echo "?")
write_log "Pre-restore state: tables=${PRE_TABLES}"

# ── Run restore ────────────────────────────
START_TS=$(date +%s)
START_HUMAN=$(date '+%Y-%m-%d %H:%M:%S')
MYSQL_STDERR="${LOG_FILE}.mysql.stderr.$$"
write_log "Restore start — file=${BACKUP_FILE} size=${FILESIZE_BYTES}B sha=${FILE_SHA:-n/a} db=${DB_NAME}"
log_info "Bat dau restore luc ${START_HUMAN}..."

# Pipe: gunzip -> docker exec mysql. Dung MYSQL_PWD de khong lo password qua argv.
# Capture mysql stderr vao file rieng de log sau — warnings/errors khong bi mat.
set +e
gunzip -c "${BACKUP_FILE}" | docker exec -i \
    -e MYSQL_PWD="${DB_PASSWORD}" \
    "${DB_CONTAINER}" \
    mysql --protocol=tcp -h 127.0.0.1 --default-character-set=utf8mb4 -u"${DB_USER}" "${DB_NAME}" 2>"${MYSQL_STDERR}"
RESTORE_EXIT=$?
set -e

END_TS=$(date +%s)
END_HUMAN=$(date '+%Y-%m-%d %H:%M:%S')
DURATION=$((END_TS - START_TS))

# Flush mysql stderr (warnings + errors) vao log
if [ -s "${MYSQL_STDERR}" ]; then
    write_log "mysql stderr ($(wc -l <"${MYSQL_STDERR}") lines):"
    while IFS= read -r line; do write_log "  mysql: ${line}"; done < "${MYSQL_STDERR}"
fi
rm -f "${MYSQL_STDERR}"

# Snapshot state DB sau restore — sanity check
POST_TABLES=$(docker exec -e MYSQL_PWD="${DB_PASSWORD}" "${DB_CONTAINER}" \
    mysql --protocol=tcp -h 127.0.0.1 -N -u"${DB_USER}" -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}'" 2>/dev/null || echo "?")
write_log "Post-restore state: tables=${POST_TABLES} (was ${PRE_TABLES})"

if [ "${RESTORE_EXIT}" -ne 0 ]; then
    write_log "Restore FAILED — exit=${RESTORE_EXIT} duration=${DURATION}s"
    log_error "Restore that bai (mysql exit=${RESTORE_EXIT}). Xem log: ${LOG_FILE}"
    exit 3
fi

write_log "Restore OK — start=${START_HUMAN} end=${END_HUMAN} duration=${DURATION}s size=${FILESIZE_BYTES}B tables=${POST_TABLES}"
echo
log_ok "Restore hoan tat trong ${DURATION}s (${FILESIZE}, ${POST_TABLES} tables)"
echo "  Start : ${START_HUMAN}"
echo "  End   : ${END_HUMAN}"
echo "  Log   : ${LOG_FILE}"
exit 0
