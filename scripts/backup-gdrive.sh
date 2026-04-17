#!/bin/bash
# ──────────────────────────────────────────
# Google Drive Backup Wrapper — LeQuyDon
# Gọi Node script, load .env, log ra file.
# Cron:  0 3 * * * /opt/webtemplate/scripts/backup-gdrive.sh
# ──────────────────────────────────────────

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env tu project root neu co
if [ -f "${PROJECT_ROOT}/.env" ]; then
  # shellcheck disable=SC1091
  set -a
  . "${PROJECT_ROOT}/.env"
  set +a
fi

# Fallback /opt/webtemplate/.env (production layout)
if [ -z "${GDRIVE_ENABLED:-}" ] && [ -f /opt/webtemplate/.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /opt/webtemplate/.env
  set +a
fi

# Determine log file — preferred /var/log/webtemplate, fallback ./logs/
LOG_DIR="/var/log/webtemplate"
if ! mkdir -p "${LOG_DIR}" 2>/dev/null || [ ! -w "${LOG_DIR}" ]; then
  LOG_DIR="${PROJECT_ROOT}/logs"
  mkdir -p "${LOG_DIR}"
fi
LOG_FILE="${LOG_DIR}/gdrive-backup.log"

# Import structured logger neu co
if [ -f "${SCRIPT_DIR}/lib/_logging.sh" ]; then
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/lib/_logging.sh"
  LOG_START_SEC=$SECONDS
  log_init
  trap 'log_trap_err $? $LINENO "$BASH_COMMAND"' ERR
  trap 'log_trap_exit $?' EXIT
  log() { log_info "$@"; }
else
  log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
  }
fi

# Neu khong bat backup -> thoat nhanh
if [ "${GDRIVE_ENABLED:-false}" != "true" ]; then
  log "GDRIVE_ENABLED != true — skipping gdrive backup"
  exit 0
fi

# Kiem tra node
if ! command -v node >/dev/null 2>&1; then
  log "[ERROR] node not found in PATH"
  exit 1
fi

# Kiem tra dependencies da cai
if [ ! -d "${SCRIPT_DIR}/node_modules/googleapis" ]; then
  log "[ERROR] googleapis not installed. Run: cd ${SCRIPT_DIR} && npm install"
  exit 1
fi

TYPE="${1:-all}"
EXTRA_ARGS="${*:2}"

log "===== gdrive-backup start (type=${TYPE}) ====="

# Chay node script, append all output vao log, giu exit code
set +e
node "${SCRIPT_DIR}/backup-gdrive.js" --type="${TYPE}" ${EXTRA_ARGS} 2>&1 | tee -a "${LOG_FILE}"
RC=${PIPESTATUS[0]}
set -e

if [ "${RC}" -eq 0 ]; then
  log "===== gdrive-backup finished OK ====="
else
  log "===== gdrive-backup FAILED (exit=${RC}) ====="
fi

exit "${RC}"
