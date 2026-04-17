-- ============================================
-- Shared MySQL — Init databases cho tat ca projects
-- File nay chay tu dong khi MySQL container khoi tao lan dau.
-- Them database moi khi co project moi.
-- ============================================

-- WebTemplate
CREATE DATABASE IF NOT EXISTS `webtemplate` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'wtuser'@'%' IDENTIFIED BY 'wtpass_change_me';
GRANT ALL PRIVILEGES ON `webtemplate`.* TO 'wtuser'@'%';

-- Them project khac o day:
-- CREATE DATABASE IF NOT EXISTS `lequydon` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CREATE USER IF NOT EXISTS 'lqduser'@'%' IDENTIFIED BY 'lqdpass';
-- GRANT ALL PRIVILEGES ON `lequydon`.* TO 'lqduser'@'%';

-- CREATE DATABASE IF NOT EXISTS `fashionecom` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CREATE USER IF NOT EXISTS 'feuser'@'%' IDENTIFIED BY 'fepass';
-- GRANT ALL PRIVILEGES ON `fashionecom`.* TO 'feuser'@'%';

FLUSH PRIVILEGES;
