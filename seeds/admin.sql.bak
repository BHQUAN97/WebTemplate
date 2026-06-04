-- ============================================================
-- Seed: Admin account
-- Chạy sau khi migration xong để tạo tài khoản super_admin đầu tiên.
-- Password: Admin@2026 (bcrypt hash rounds=12)
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+07:00';

-- Xóa admin cũ nếu tồn tại (để reseed an toàn)
DELETE FROM users WHERE email = 'admin@demo.local';

INSERT INTO users (
  id,
  email,
  password,
  first_name,
  last_name,
  role,
  is_active,
  is_email_verified,
  created_at,
  updated_at
) VALUES (
  '01JTEMPLATE000000000000001',
  'admin@demo.local',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LfP9KGGNkPCiRFdWa',
  'Super',
  'Admin',
  'super_admin',
  1,
  1,
  NOW(),
  NOW()
);

-- Cài đặt site mặc định
INSERT INTO settings (id, `key`, value, group_name, created_at, updated_at)
VALUES
  ('01JTEMPLATE000000000000010', 'site_name', 'WebTemplate', 'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000011', 'site_email', 'admin@demo.local', 'general', NOW(), NOW()),
  ('01JTEMPLATE000000000000012', 'maintenance_mode', 'false', 'general', NOW(), NOW())
ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW();

SELECT 'Seed admin xong. Email: admin@demo.local / Password: Admin@2026' AS result;
