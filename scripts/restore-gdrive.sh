#!/usr/bin/env bash
# ──────────────────────────────────────────
# Google Drive Restore wrapper — LeQuyDon
#
# Usage:
#   ./restore-gdrive.sh list                  # list DB backups tren Drive
#   ./restore-gdrive.sh db latest             # download .sql.gz moi nhat
#   ./restore-gdrive.sh db latest --chain     # download + restore luon
#   ./restore-gdrive.sh media latest          # download zip media moi nhat
#   ./restore-gdrive.sh db name=<file>        # download theo ten cu the
# ──────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# Load .env (project root > /opt/webtemplate/.env)
if [ -f "${SCRIPT_DIR}/../.env" ]; then set -a; . "${SCRIPT_DIR}/../.env"; set +a
elif [ -f /opt/webtemplate/.env ]; then set -a; . /opt/webtemplate/.env; set +a
fi

LOG_DIR="${LOG_DIR:-/var/log/webtemplate}"
mkdir -p "${LOG_DIR}" 2>/dev/null || LOG_DIR="${SCRIPT_DIR}/../logs"
mkdir -p "${LOG_DIR}"
LOG_FILE="${LOG_DIR}/gdrive-restore.log"

ts() { date '+%Y-%m-%d %H:%M:%S'; }

# Import structured logger (session id, rotation, error trap)
if [ -f "${SCRIPT_DIR}/lib/_logging.sh" ]; then
  # shellcheck disable=SC1091
  . "${SCRIPT_DIR}/lib/_logging.sh"
  LOG_START_SEC=$SECONDS
  log_init
  trap 'log_trap_err $? $LINENO "$BASH_COMMAND"' ERR
  trap 'log_trap_exit $?' EXIT
  log() { log_info "$@"; }
else
  log() { echo "[$(ts)] $*" | tee -a "${LOG_FILE}"; }
fi

# Parse args: <type> <selector> [--chain] [--force] [--dry-run]
TYPE="${1:-}"
SEL="${2:-}"
shift 2 2>/dev/null || true
EXTRA_ARGS=()
CHAIN=false
for a in "$@"; do
  case "$a" in
    --chain) CHAIN=true ;;
    *) EXTRA_ARGS+=("$a") ;;
  esac
done

NODE_ARGS=()
case "${TYPE}" in
  list)
    # list cho ca db lan media neu khong specify
    NODE_ARGS=(--list --type="${SEL:-db}")
    ;;
  db|media)
    NODE_ARGS=(--type="${TYPE}")
    case "${SEL}" in
      latest) NODE_ARGS+=(--latest) ;;
      name=*) NODE_ARGS+=(--"${SEL}") ;;
      '') log "ERROR: missing selector (latest|name=<file>)"; exit 2 ;;
      *) log "ERROR: unknown selector '${SEL}'"; exit 2 ;;
    esac
    if [ "${CHAIN}" = true ]; then NODE_ARGS+=(--chain-restore); fi
    ;;
  ''|-h|--help)
    cat <<EOF
Usage: $0 <command> [selector] [--chain] [--force] [--dry-run]

Commands:
  list [db|media]                  List backups in Drive folder
  db latest [--chain] [--force]    Download latest .sql.gz (optional: restore ngay)
  db name=<file> [--chain]         Download file theo ten
  media latest                     Download zip media moi nhat
  media name=<file>                Download media theo ten
EOF
    exit 0
    ;;
  *)
    log "ERROR: unknown command '${TYPE}'"
    exit 2
    ;;
esac

NODE_ARGS+=("${EXTRA_ARGS[@]}")

log "Running: node restore-gdrive.js ${NODE_ARGS[*]}"
node "${SCRIPT_DIR}/restore-gdrive.js" "${NODE_ARGS[@]}" 2>&1 | tee -a "${LOG_FILE}"
EXIT=${PIPESTATUS[0]}
log "restore-gdrive exited with code ${EXIT}"
exit "${EXIT}"
