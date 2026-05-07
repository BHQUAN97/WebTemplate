#!/bin/bash
# ──────────────────────────────────────────
# Docker Cleanup Script — WebTemplate
# Run via cron: 0 3 * * 0  /opt/webtemplate/scripts/docker-cleanup.sh (weekly Sunday 3am)
# ──────────────────────────────────────────

set -euo pipefail

LOG_FILE="/var/log/webtemplate/docker-cleanup.log"
mkdir -p "$(dirname "${LOG_FILE}")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

log "Starting Docker cleanup (WebTemplate)..."

# Show current disk usage
BEFORE=$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null)
log "Before cleanup:"
echo "${BEFORE}" >> "${LOG_FILE}"

# Remove unused images (dangling + unreferenced older than 7 days)
PRUNED_IMAGES=$(docker image prune -a --filter "until=168h" --force 2>/dev/null | tail -1)
log "Image prune: ${PRUNED_IMAGES}"

# Remove unused volumes (only truly dangling ones)
PRUNED_VOLUMES=$(docker volume prune --force 2>/dev/null | tail -1)
log "Volume prune: ${PRUNED_VOLUMES}"

# Remove stopped containers older than 24h
PRUNED_CONTAINERS=$(docker container prune --filter "until=24h" --force 2>/dev/null | tail -1)
log "Container prune: ${PRUNED_CONTAINERS}"

# Remove unused networks
docker network prune --force >> "${LOG_FILE}" 2>&1

# Remove build cache older than 7 days
docker builder prune --filter "until=168h" --force >> "${LOG_FILE}" 2>&1

# Show after cleanup
AFTER=$(docker system df --format '{{.Type}}: {{.Size}}' 2>/dev/null)
log "After cleanup:"
echo "${AFTER}" >> "${LOG_FILE}"

log "Docker cleanup completed (WebTemplate)"
