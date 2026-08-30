-- ============================================================================
-- 001__schema_changelog.sql — Bang theo doi phiên bản (Flyway-style)
-- DB: webtemplate (WebTemplate / BHQUAN97)
--
-- ISOLATE: chay lai nhieu lan khong loi (CREATE TABLE IF NOT EXISTS).
-- Bang nay ghi lai tung file SQL da apply: skip khi (version, filename) da ton tai.
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_changelog (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  version      VARCHAR(50)  NOT NULL COMMENT 'VD: 1.0.0, 1.1.0 ; hoac 001_init, _init',
  filename     VARCHAR(255) NOT NULL COMMENT 'VD: 001__add_column.sql',
  description  VARCHAR(255) NOT NULL DEFAULT '' COMMENT 'Mo ta rut gon cua file',
  applied_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applied_by   VARCHAR(50)  NOT NULL DEFAULT 'ci' COMMENT 'ci hoac manual',
  checksum     VARCHAR(64)  NULL COMMENT 'SHA256 cua file SQL',
  execution_ms INT          NULL COMMENT 'Thoi gian chay file (ms)',
  UNIQUE KEY uq_version_file (version, filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;