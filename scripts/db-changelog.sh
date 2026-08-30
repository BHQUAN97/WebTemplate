#!/bin/bash
# scripts/db-changelog.sh — Flyway-style versioned SQL migration runner (WebTemplate)
#
# Ban sao co che chuan tu pipsnote/scripts/db-changelog.sh cung 1 quy chuan:
#   bang schema_changelog -> chay _init/*.sql (idempotent) -> scan version batch
#   (skip _*) -> apply + ghi checksum SHA256 -> PASS/SKIP/FAIL (FAIL thi exit 1).
#
# QUAN TRONG: them co che nay SONG SONG he TypeORM hien tai — KHONG go TypeORM,
# KHONG doi schema co san. Script chi CREATE TABLE IF NOT EXISTS + migration moi.
# 002__baseline_webtemplate.sql la SNAPSHOT idempotent schema hien tai.
#
# Convention: db/changelog/<batch>/<NNN_mo_ta>.sql — xem db/changelog/README.md
# Thu muc bat dau bang "_" (vd _init) bi bo qua khi scan version.

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
# shellcheck source=lib/_logging.sh
source "${SCRIPT_DIR}/lib/_logging.sh"

DB_CONTAINER="${DB_CONTAINER:-shared-mysql}"
DB_NAME="${DB_NAME:-webtemplate}"
DB_USER="${DB_USER:-webtemplate}"
ENV_FILE="${ENV_FILE:-/opt/webtemplate/.env}"
CHANGELOG_DIR="${CHANGELOG_DIR:-${PROJECT_ROOT}/db/changelog}"
APPLIED_BY="${APPLIED_BY:-$(whoami 2>/dev/null || echo ci)}"

if [[ -n "${DB_PASSWORD:-}" ]]; then
  : # da co san
elif [[ -f "$ENV_FILE" ]]; then
  DB_PASSWORD="$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2- || true)"
fi
if [[ -z "${DB_PASSWORD:-}" ]]; then
  log_error "Khong tim thay DB_PASSWORD (trong env hoac ${ENV_FILE})"
  exit 1
fi

mysql_exec() {
  # Ko dung -i: docker exec giu stdin mo, mo vong while (process substitution)
  # se het stdin sau 1 file moi batch. Chi mysql_exec_file (pipe .sql) can -i.
  docker exec -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
    mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" "$@"
}

mysql_exec_file() {
  docker exec -i -e MYSQL_PWD="$DB_PASSWORD" "$DB_CONTAINER" \
    mysql --protocol=tcp -h 127.0.0.1 -u"$DB_USER" --default-character-set=utf8mb4 "$DB_NAME" < "$1"
}

# 1. Dam bao bang tracking ton tai (idempotent) — dung -e (khong stdin, xem pipsnote)
mysql_exec -e "
CREATE TABLE IF NOT EXISTS schema_changelog (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  version      VARCHAR(50)  NOT NULL,
  filename     VARCHAR(255) NOT NULL,
  description  VARCHAR(255) NOT NULL DEFAULT '',
  applied_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_by   VARCHAR(50)  NOT NULL DEFAULT 'ci',
  checksum     VARCHAR(64)  NULL,
  execution_ms INT          NULL,
  UNIQUE KEY uq_version_file (version, filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"

if [[ ! -d "$CHANGELOG_DIR" ]]; then
  log_warn "Khong co thu muc ${CHANGELOG_DIR} — bo qua (chua co migration nao)"
  exit 0
fi

PASS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

# 2. Chay _init/*.sql truoc (idempotent, KHONG ghi vao schema_changelog — chi init)
if [[ -d "${CHANGELOG_DIR}/_init" ]]; then
  while IFS= read -r init_file; do
    log_info "INIT  _init/$(basename "$init_file") ..."
    if ! mysql_exec_file "$init_file"; then
      log_error "FAIL  _init/$(basename "$init_file") — dung changelog ngay"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"
      exit 1
    fi
    log_info "PASS  _init/$(basename "$init_file")"
  done < <(find "${CHANGELOG_DIR}/_init" -maxdepth 1 -name '*.sql' | sort)
fi

# 3. Scan thu muc version (sort), bo qua thu muc bat dau bang "_"
while IFS= read -r batch_dir; do
  batch_name="$(basename "$batch_dir")"
  [[ "$batch_name" == _* ]] && continue

  # 4. Scan *.sql trong batch (sort)
  while IFS= read -r sql_file; do
    filename="$(basename "$sql_file")"
    version="$batch_name"

    # 5. Skip neu da applied
    already=$(mysql_exec -N -B -e \
      "SELECT COUNT(*) FROM schema_changelog WHERE version='${version}' AND filename='${filename}';" 2>/dev/null || echo "0")

    if [[ "$already" == "1" ]]; then
      log_info "SKIP  ${version}/${filename} (da applied)"
      SKIP_COUNT=$((SKIP_COUNT + 1))
      continue
    fi

    log_info "APPLY ${version}/${filename} ..."
    START_MS=$(date +%s%3N 2>/dev/null || echo 0)
    if mysql_exec_file "$sql_file"; then
      END_MS=$(date +%s%3N 2>/dev/null || echo 0)
      EXEC_MS=$(( (END_MS - START_MS) > 0 ? (END_MS - START_MS) : 0 ))
      checksum=$(sha256sum "$sql_file" | awk '{print $1}')
      description=$(echo "$filename" | sed -E 's/^[0-9]+_?//; s/\.sql$//; s/_/ /g')
      mysql_exec -e "INSERT INTO schema_changelog (version, filename, description, checksum, applied_by, execution_ms) \
        VALUES ('${version}', '${filename}', '${description}', '${checksum}', '${APPLIED_BY}', ${EXEC_MS});"
      log_info "PASS  ${version}/${filename}"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      log_error "FAIL  ${version}/${filename} — dung changelog ngay"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"
      exit 1
    fi
  done < <(find "$batch_dir" -maxdepth 1 -name '*.sql' | sort)
done < <(find "$CHANGELOG_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

log_info "Summary: PASS=${PASS_COUNT} SKIP=${SKIP_COUNT} FAIL=${FAIL_COUNT}"