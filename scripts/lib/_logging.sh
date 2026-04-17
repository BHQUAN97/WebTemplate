#!/bin/bash
# ──────────────────────────────────────────
# Shared logging helpers cho backup/restore scripts
# Source: . "$(dirname "$0")/lib/_logging.sh"
#
# Env vars override:
#   LOG_FILE          — path to log file (script tu set default)
#   LOG_LEVEL         — debug|info|warn|error (default: info)
#   LOG_RETENTION_DAYS — auto-prune log files cu (default: 30)
#   LOG_MAX_BYTES     — rotate khi file vuot (default: 10485760 = 10MB)
# ──────────────────────────────────────────

# Session id duy nhat moi run — de grep log tim ra toan bo 1 phien
export LOG_SESSION_ID="${LOG_SESSION_ID:-$(date +%s)-$$}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"
export LOG_MAX_BYTES="${LOG_MAX_BYTES:-10485760}"

__log_ts() { date '+%Y-%m-%d %H:%M:%S'; }

# Numeric level de so sanh
__log_level_num() {
  case "$1" in
    debug) echo 10 ;;
    info)  echo 20 ;;
    warn)  echo 30 ;;
    error) echo 40 ;;
    *)     echo 20 ;;
  esac
}

__log_should() {
  local msg_level cfg_level
  msg_level=$(__log_level_num "$1")
  cfg_level=$(__log_level_num "${LOG_LEVEL}")
  [ "$msg_level" -ge "$cfg_level" ]
}

# Rotate neu log file > LOG_MAX_BYTES
__log_rotate() {
  [ -f "${LOG_FILE:-}" ] || return 0
  local size
  size=$(wc -c < "${LOG_FILE}" 2>/dev/null || echo 0)
  if [ "${size}" -gt "${LOG_MAX_BYTES}" ]; then
    mv "${LOG_FILE}" "${LOG_FILE}.$(date +%Y%m%d-%H%M%S).old"
    : > "${LOG_FILE}"
  fi
}

# Xoa log cu > LOG_RETENTION_DAYS (chi .old rotations, khong cham active)
__log_prune() {
  local dir
  dir="$(dirname "${LOG_FILE:-/tmp/x}")"
  [ -d "$dir" ] || return 0
  find "$dir" -maxdepth 1 -name "*.log.*.old" -mtime +${LOG_RETENTION_DAYS} -delete 2>/dev/null || true
}

# Ghi log line: level + ts + session + message
# Format: [TS] [LEVEL] [SESSION=xxx] message
__log_write() {
  local level="$1"; shift
  local line="[$(__log_ts)] [${level^^}] [S=${LOG_SESSION_ID}] $*"
  if [ -n "${LOG_FILE:-}" ]; then
    echo "$line" | tee -a "${LOG_FILE}"
  else
    echo "$line"
  fi
}

log_debug() { __log_should debug && __log_write debug "$@" || true; }
log_info()  { __log_should info  && __log_write info  "$@" || true; }
log_warn()  { __log_should warn  && __log_write warn  "$@" || true; }
log_error() { __log_should error && __log_write error "$@" >&2 || true; }

# SHA256 checksum cua file (first 16 chars rut gon de log)
log_sha256() {
  local f="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$f" 2>/dev/null | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$f" 2>/dev/null | awk '{print $1}'
  else
    echo "no-sha256-tool"
  fi
}

# Human-readable size
log_fsize() {
  [ -f "$1" ] || { echo "0"; return; }
  du -h "$1" 2>/dev/null | cut -f1
}

# Setup: goi sau khi set LOG_FILE
log_init() {
  [ -n "${LOG_FILE:-}" ] || return 0
  mkdir -p "$(dirname "${LOG_FILE}")" 2>/dev/null || true
  __log_rotate
  __log_prune
  # Context header moi run
  log_info "═══ SCRIPT START ═══ script=$(basename "${0}") pid=$$ user=$(whoami 2>/dev/null || echo ?) host=$(hostname 2>/dev/null || echo ?) cwd=$(pwd)"
}

# Error trap handler — gan voi: trap 'log_trap_err $? $LINENO "$BASH_COMMAND"' ERR
log_trap_err() {
  local code="${1:-?}" line="${2:-?}" cmd="${3:-?}"
  log_error "TRAP ERR exit=${code} line=${line} cmd=${cmd}"
}

# Exit handler — log ket thuc + duration
# Dung: START_TIME=$SECONDS; trap 'log_trap_exit $?' EXIT
log_trap_exit() {
  local code="${1:-0}"
  local dur=$((SECONDS - ${LOG_START_SEC:-$SECONDS}))
  if [ "$code" -eq 0 ]; then
    log_info "═══ SCRIPT END ═══ result=SUCCESS exit=0 duration=${dur}s"
  else
    log_error "═══ SCRIPT END ═══ result=FAIL exit=${code} duration=${dur}s"
  fi
}
