-- ============================================================================
-- 002__baseline_webtemplate.sql — SNAPSHOT idempotent toan bo schema hien tai
--   cua DB `webtemplate` (WebTemplate / BHQUAN97).
--
-- Tạo bang flyway-style ra phu sinh tu information_schema (read-only) ngay
--   2026-08-30 (giai doan chuyen tu TypeORM sang changelog).
--
-- IDEMPOTENT: co the chay lai 100 lan khong loi (quy chuan §3):
--   * CREATE TABLE IF NOT EXISTS — bang da ton tai => no-op.
--   * Index (PK/UNIQUE/KEY/FULLTEXT) nam TRONG CREATE TABLE => chi tao khi bang moi.
--   * Foreign key them bang ALTER co kiem tra ton tai (PREPARE/EXECUTE).
--
-- KHONG ALTER/sua doi schema da ton tai. Day chi la baseline, khong cham TypeORM.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------------------------------------------------------
-- 1) CREATE TABLE IF NOT EXISTS (columns + inline indexes) — 47 bang
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `access_logs` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` varchar(26) COLLATE utf8mb4_unicode_ci NULL,
  `method` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status_code` int NOT NULL,
  `duration_ms` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci NULL,
  `referer` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_0b37f4e03c3bb70ee4745c63b3` (`user_id`, `created_at`),
    KEY `IDX_396253f59749f08ec35257c5bf` (`created_at`),
    KEY `IDX_7760024cf1cc6b657ce8b1133f` (`user_id`),
    KEY `IDX_f40baf17b26359cabd86961c7d` (`status_code`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `tenant_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_prefix` varchar(8) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `scopes` json NOT NULL,
  `rate_limit` int NOT NULL DEFAULT 1000,
  `last_used_at` timestamp NULL,
  `expires_at` timestamp NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `IDX_3ac18429c8d27858d79432e0dd` (`tenant_id`),
    UNIQUE KEY `IDX_57384430aa1959f4578046c9b8` (`key_hash`),
    KEY `IDX_b50a60ffe2b0113af75a9616da` (`deleted_at`),
    KEY `IDX_b7dad6ac312e407817ea3f3591` (`tenant_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `articles` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `title` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(320) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `featured_image` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `category_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `author_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
  `tags` json NULL,
  `is_featured` tinyint NOT NULL DEFAULT 0,
  `published_at` timestamp NULL,
  `view_count` int NOT NULL DEFAULT 0,
  `seo_title` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `seo_description` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `seo_keywords` varchar(300) COLLATE utf8mb4_unicode_ci NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `IDX_1123ff6815c5b8fec0ba9fec37` (`slug`),
    KEY `IDX_6515da4dff8db423ce4eb84149` (`author_id`),
    KEY `IDX_81584df35625f1e8b3af41daef` (`deleted_at`),
    KEY `IDX_c7536b27ed3f55d19d56b99e8c` (`tenant_id`, `published_at`),
    KEY `IDX_e025eeefcdb2a269c42484ee43` (`category_id`),
    KEY `IDX_e22604a1551e38fec9024b4218` (`tenant_id`, `status`),
    KEY `IDX_fa70ef96fb4556d1fd280c7a46` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(26) COLLATE utf8mb4_unicode_ci NULL,
  `old_values` json NULL,
  `new_values` json NULL,
  `metadata` json NULL,
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `resource_type` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `resource_id` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `changes` text COLLATE utf8mb4_unicode_ci NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_2cd10fda8276bb995288acfbfb` (`created_at`),
    KEY `IDX_2f68e345c05e8166ff9deea1ab` (`user_id`, `created_at`),
    KEY `IDX_4381077c5e749e05ad043d25ae` (`resource_type`, `resource_id`, `created_at`),
    KEY `IDX_62408b952557958fd12867cfeb` (`resource_id`),
    KEY `IDX_7421efc125d95e413657efa3c6` (`entity_type`, `entity_id`),
    KEY `IDX_99fca4a3a4a93c26a756c5aca5` (`action`, `created_at`),
    KEY `IDX_a0cbad1360aeda920c5aff6642` (`resource_type`),
    KEY `IDX_bd2726fd31b35443f2245b93ba` (`user_id`),
    KEY `IDX_cee5459245f652b75eb2759b4c` (`action`),
    KEY `IDX_e00999c68bafa48e81af2ff3e7` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cart_items` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `cart_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `variant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `quantity` int NOT NULL DEFAULT 1,
  `price` decimal(12,2) NOT NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_30e89257a105eab7648a35c7fc` (`product_id`),
    KEY `IDX_6385a745d9e12a89b859bb2562` (`cart_id`),
    UNIQUE KEY `IDX_a1cad8f92c2ad2338f820fa2f9` (`cart_id`, `product_id`, `variant_id`),
    KEY `IDX_dba960dbfd8636893d3c7acb18` (`cart_id`, `product_id`),
    KEY `IDX_dbf227decd2427f9bd4db5250c` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `carts` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `status` enum('active','merged','converted','abandoned') NOT NULL DEFAULT 'active',
  `expires_at` timestamp NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_2ec1c94a977b940d85a4f498ae` (`user_id`),
    KEY `IDX_5503f8a843c33368a4fbb794f5` (`deleted_at`),
    KEY `IDX_5864dd7a4d1486b9ccc78bfaed` (`session_id`, `status`),
    KEY `IDX_977625e8b50621bfb1c7f3d02b` (`user_id`, `status`),
    KEY `IDX_f57f87515b7c25718dc380c69c` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `parent_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_12e9594b387081688aaf3c3c35` (`parent_id`, `sort_order`),
    UNIQUE KEY `IDX_420d9f679d41281f282f5bc7d0` (`slug`),
    KEY `IDX_a184f5dd6c131f01b9f48968f0` (`deleted_at`),
    KEY `IDX_a20258ff6b886e325f4aab05f4` (`type`, `is_active`),
    KEY `IDX_dc591a3520526561b639a2432e` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `changelogs` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('feature','fix','improvement','breaking') NOT NULL,
  `module` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `created_by` varchar(26) COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_59c4d3914c4449c3d2411ef22b` (`version`, `type`),
    KEY `IDX_9016e2783d6d16dda52cc86f02` (`version`),
    KEY `IDX_ed8222e92592841bc1fe9574ae` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `conversationId` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('user','ai','agent','system') NOT NULL,
  `type` enum('text','image','product_card','order_card','quick_replies','system_event') NOT NULL DEFAULT 'text',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `senderName` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `senderId` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `attachments` json NULL,
  `metadata` json NULL,
  `readAt` datetime NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_45745953065384cc9c4264c2a3` (`conversationId`),
    KEY `IDX_49a59a488f10209467565aa227` (`conversationId`, `created_at`),
    KEY `IDX_cea6e4667d4b19760fc1b0ccb5` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_scenarios` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `triggerType` enum('keyword','intent','event','scheduled') NOT NULL,
  `triggerValue` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `conditions` json NULL,
  `response` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `responseType` enum('text','image','product_card','order_card','quick_replies','system_event') NOT NULL DEFAULT 'text',
  `followUpScenarioId` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `delayMinutes` int NOT NULL DEFAULT 0,
  `priority` int NOT NULL DEFAULT 0,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `matchCount` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_1561745bd0c6fc4578fcdfc5bc` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_schedules` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dayOfWeek` int NULL,
  `startTime` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `endTime` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mode` enum('ai','human','hybrid','offline') NOT NULL,
  `timezone` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `priority` int NOT NULL DEFAULT 0,
  `isActive` tinyint NOT NULL DEFAULT 1,
  `fallbackMessage` text COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_d16355dbd84fa8759276f3bf24` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `chat_tool_calls` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `conversationId` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `toolName` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `args` text COLLATE utf8mb4_unicode_ci NULL,
  `result` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `errorMessage` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `durationMs` int NOT NULL DEFAULT 0,
  `actorType` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customerId` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_2b3139f919ad7e9aa6994240fc` (`toolName`, `created_at`),
    KEY `IDX_388d281649c38e9643fa2bda6a` (`result`, `created_at`),
    KEY `IDX_6b88d5930881e8ef90f6a724f5` (`deleted_at`),
    KEY `IDX_88e53cd0bd0ac43781476875ed` (`customerId`),
    KEY `IDX_8ddcfdeea18b0dc25a3b9d0682` (`conversationId`),
    KEY `IDX_f0315f053ddda8c92f3bd39ddc` (`conversationId`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contacts` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NULL,
  `subject` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('new','in_progress','resolved','closed') NOT NULL DEFAULT 'new',
  `assigned_to` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `admin_notes` text COLLATE utf8mb4_unicode_ci NULL,
  `resolved_at` timestamp NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_3a5b223ca6d3d04b042167bed3` (`tenant_id`, `status`),
    KEY `IDX_625b2d8ddb702b0133bf42edf7` (`status`, `created_at`),
    KEY `IDX_71ec7d68cfafa5f3d93c959b80` (`tenant_id`),
    KEY `IDX_b487c3c0f3defc107256ad8f64` (`deleted_at`),
    KEY `IDX_d90dcb0992cd86fbbb744f8f8a` (`assigned_to`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `channel` enum('web','mobile','zalo','facebook') NOT NULL DEFAULT 'web',
  `status` enum('open','waiting_agent','with_agent','with_ai','closed') NOT NULL DEFAULT 'open',
  `mode` enum('ai','human','hybrid','offline') NOT NULL DEFAULT 'ai',
  `subject` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `customerId` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `customerName` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `customerEmail` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `customerPhone` varchar(20) COLLATE utf8mb4_unicode_ci NULL,
  `agentId` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `lastMessageAt` datetime NULL,
  `lastMessagePreview` text COLLATE utf8mb4_unicode_ci NULL,
  `unreadByAgent` int NOT NULL DEFAULT 0,
  `unreadByCustomer` int NOT NULL DEFAULT 0,
  `metadata` json NULL,
  `tags` text COLLATE utf8mb4_unicode_ci NULL,
  `rating` int NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_517acf7e04a7232adb0c760c4b` (`status`),
    KEY `IDX_5a4866f304edf4591ad785d34a` (`customerId`),
    KEY `IDX_6997c2d77c78fe8a7ba93c0432` (`status`, `lastMessageAt`),
    KEY `IDX_6bc9cd21e9dad29f3de7b6da4d` (`agentId`),
    KEY `IDX_b853c3320df7cf06b7bfa413c8` (`lastMessageAt`),
    KEY `IDX_be4fa02f55ce0eb0d8e54b1e56` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `html_body` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `text_body` text COLLATE utf8mb4_unicode_ci NULL,
  `variables` json NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `tenant_id` varchar(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_15e34a853fee57b67fb3ac4d52` (`tenant_id`, `name`),
    KEY `IDX_1b7bd4c54eb3192c135b771a27` (`deleted_at`),
    KEY `IDX_2982dc30aa931f4db2ff53c648` (`tenant_id`),
    KEY `IDX_e832fef7d0d7dd4da2792eddbf` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_09f256fb7f9a05f0ed9927f406` (`user_id`),
    KEY `IDX_433513340411dd1dd531661df2` (`name`, `created_at`),
    KEY `IDX_7ebab07668bb225b6a04782a7d` (`created_at`),
    KEY `IDX_dc8026a706581fc7a4d5d23c6c` (`session_id`, `created_at`),
    KEY `IDX_dfa3d03bef3f90f650fd138fb3` (`name`),
    KEY `IDX_f3069564d09456ff375a0d0c54` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `faqs` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `question` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `view_count` int NOT NULL DEFAULT 0,
  `helpful_count` int NOT NULL DEFAULT 0,
  `not_helpful_count` int NOT NULL DEFAULT 0,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_2538516a460e15d692b45fb77e` (`category_id`, `sort_order`),
    KEY `IDX_63d55815687e9a45ebe34fa6bf` (`tenant_id`, `is_active`),
    KEY `IDX_69e7c84542b637b399d0a88f9c` (`tenant_id`),
    KEY `IDX_7a6811df06ccc7a7d4d0705af3` (`deleted_at`),
    KEY `IDX_8108b0e557203537d3e2321149` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT 0,
  `description` text COLLATE utf8mb4_unicode_ci NULL,
  `rollout_percentage` int NOT NULL DEFAULT 100,
  `target_roles` text COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `IDX_36d0344370584b4d6a953c53a6` (`key`),
    KEY `IDX_dcb24997403863c3cee099ecbb` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `product_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `variant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `quantity` int NOT NULL DEFAULT 0,
  `reserved` int NOT NULL DEFAULT 0,
  `low_stock_threshold` int NOT NULL DEFAULT 10,
  `track_inventory` tinyint NOT NULL DEFAULT 1,
  `allow_backorder` tinyint NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_732fdb1f76432d65d2c136340d` (`product_id`),
    KEY `IDX_ac48965c49044f749aacf76e08` (`product_id`, `variant_id`),
    KEY `IDX_ceba910e3505fc54c3c7f92c94` (`variant_id`),
    KEY `IDX_d2df547a7abdab9aac58c6b3a0` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `inventory_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_change` int NOT NULL,
  `type` enum('in','out','adjustment','reserved','released') NOT NULL,
  `reference_type` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `reference_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `note` text COLLATE utf8mb4_unicode_ci NULL,
  `created_by` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_2e45e55a610ca2b66f0b43741a` (`created_at`),
    KEY `IDX_6026b4a8700dd96567404f2d60` (`inventory_id`, `created_at`),
    KEY `IDX_7c5f8fa417b520f26f911c3c6b` (`inventory_id`),
    KEY `IDX_973c2e65535296d95437eb9dd5` (`reference_type`, `reference_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `locales` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `native_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `is_default` tinyint NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_2583532dbefb4cb3e680fb06a0` (`deleted_at`),
    UNIQUE KEY `IDX_a239a0f9d77feefce47e4bf3a0` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `media` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `size` int NOT NULL,
  `storage_key` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `alt_text` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `folder` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '/',
  `width` int NULL,
  `height` int NULL,
  `uploaded_by` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_28ef3a56084865cce5fc779bcf` (`folder`, `mime_type`),
    KEY `IDX_36eb3afa6656aadda6d6dd248c` (`uploaded_by`, `created_at`),
    KEY `IDX_8468de6d91985f53a1a3324741` (`uploaded_by`),
    UNIQUE KEY `IDX_9ba0d5268d6f75eca1b62cf10b` (`storage_key`),
    KEY `IDX_b7b8e2c7f523dba4b76da1abec` (`folder`),
    KEY `IDX_fc615d94ad2fbefedefb268eb3` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `navigation_items` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `navigation_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `page_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `parent_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `target` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '_self',
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `FK_ccf5fd7b1b260cc40d67ad3c043` (`parent_id`),
    KEY `IDX_0e2cc53a293c89530ef88d9275` (`navigation_id`, `parent_id`, `sort_order`),
    KEY `IDX_90502ed1172e62765a6ed2443f` (`navigation_id`),
    KEY `IDX_e425cf32f1948641efff8f14e4` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `navigations` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_252ee90f49bb0d30f662d92b75` (`location`),
    KEY `IDX_5f422d2094e1de7286dac12f64` (`tenant_id`, `location`),
    KEY `IDX_c76219b58f376f1c53ec0706c3` (`tenant_id`),
    KEY `IDX_fc7cff428a1752faa5618f56b2` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `data` json NULL,
  `is_read` tinyint NOT NULL DEFAULT 0,
  `read_at` timestamp NULL,
  `channel` enum('in_app','email','push') NOT NULL DEFAULT 'in_app',
  `sent_at` timestamp NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_310667f935698fcd8cb319113a` (`user_id`, `created_at`),
    KEY `IDX_519d212c491ea2aff5ad82ac3d` (`tenant_id`, `created_at`),
    KEY `IDX_9a8a82462cab47c73d25f49261` (`user_id`),
    KEY `IDX_a399ae186a437ca813879c3fba` (`deleted_at`),
    KEY `IDX_af08fad7c04bb85403970afdc1` (`user_id`, `is_read`),
    KEY `IDX_d93ddd7e1b890535ecafbb334e` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `order_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `variant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `product_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `variant_name` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `price` decimal(12,2) NOT NULL,
  `quantity` int NOT NULL,
  `total` decimal(12,2) NOT NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_145532db85752b29c57d2b7b1f` (`order_id`),
    KEY `IDX_6335813ef19bc35b8d866cc656` (`order_id`, `product_id`),
    KEY `IDX_9263386c35b6b242540f9493b0` (`product_id`),
    KEY `IDX_bfd91f86461c497971a5d27bd2` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `orders` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `order_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','confirmed','processing','shipping','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
  `subtotal` decimal(12,2) NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `shipping_fee` decimal(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(12,2) NOT NULL DEFAULT 0.00,
  `total` decimal(12,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `shipping_address` json NOT NULL,
  `billing_address` json NULL,
  `note` text COLLATE utf8mb4_unicode_ci NULL,
  `promotion_code` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `cancelled_reason` text COLLATE utf8mb4_unicode_ci NULL,
  `shipped_at` timestamp NULL,
  `delivered_at` timestamp NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_09b0a39ef7c0b162f6a2f3c860` (`deleted_at`),
    KEY `IDX_59b7a79203c34cf04826d76b8b` (`tenant_id`, `status`),
    UNIQUE KEY `IDX_75eba1c6b1a66b09f2a97e6927` (`order_number`),
    KEY `IDX_cd5e019c76a79a59e9188d2aae` (`tenant_id`, `created_at`),
    KEY `IDX_fbfc1475fc6797244d160068cb` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `page_views` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `page_title` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `session_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci NULL,
  `referer` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `country` varchar(2) COLLATE utf8mb4_unicode_ci NULL,
  `device_type` varchar(20) COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_3f3c34bc63110117c0396eb573` (`session_id`),
    KEY `IDX_8207b1d36183dee05b8d9bd114` (`user_id`),
    KEY `IDX_bd5adc2dabdf5383bbaef54045` (`session_id`, `created_at`),
    KEY `IDX_db58d558e3874d39209a06bd3c` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `pages` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `template` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'default',
  `status` enum('draft','published') NOT NULL DEFAULT 'draft',
  `is_homepage` tinyint NOT NULL DEFAULT 0,
  `parent_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `seo_title` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `seo_description` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `metadata` json NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_46e907ed4e2f32850168d17557` (`tenant_id`),
    KEY `IDX_65fc17f66b9d5e426eaf942dc8` (`parent_id`),
    KEY `IDX_7aa12ffb620c80dc6dcf944d38` (`deleted_at`),
    KEY `IDX_ac9d9f4329572c18f8a6ce6862` (`tenant_id`, `status`),
    UNIQUE KEY `IDX_fe66ca6a86dc94233e5d778953` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `order_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `method` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
  `amount` decimal(12,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `transaction_id` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `gateway_response` json NULL,
  `paid_at` timestamp NULL,
  `refunded_at` timestamp NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_68a0141dae3b66e4c9b102ce3e` (`deleted_at`),
    UNIQUE KEY `IDX_b2f7b823a21562eeca20e72b00` (`order_id`),
    UNIQUE KEY `uq_payments_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plans` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NULL,
  `price` decimal(12,2) NOT NULL,
  `currency` varchar(3) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VND',
  `billing_cycle` enum('monthly','yearly','lifetime','free') NOT NULL,
  `features` json NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `is_popular` tinyint NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `trial_days` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_843eef5a55f05ee5123f0d52ea` (`deleted_at`),
    UNIQUE KEY `IDX_e7b71bb444e74ee067df057397` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_attributes` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `values` json NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_595092a61bcace8d8c5797d5a9` (`name`),
    KEY `IDX_64ec298109f8a63e84f17f81a3` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `product_variants` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `product_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `compare_at_price` decimal(12,2) NULL,
  `attributes` json NULL,
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `sort_order` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    UNIQUE KEY `IDX_46f236f21640f9da218a063a86` (`sku`),
    KEY `IDX_4f14d9c78b240d657f54db45a6` (`product_id`, `is_active`),
    KEY `IDX_6343513e20e2deab45edfce131` (`product_id`),
    KEY `IDX_e0e4ac75611d87deb59a2333fb` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `short_description` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `sku` varchar(50) COLLATE utf8mb4_unicode_ci NULL,
  `price` decimal(12,2) NOT NULL,
  `compare_at_price` decimal(12,2) NULL,
  `cost_price` decimal(12,2) NULL,
  `category_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `brand` varchar(100) COLLATE utf8mb4_unicode_ci NULL,
  `images` json NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `is_featured` tinyint NOT NULL DEFAULT 0,
  `weight` decimal(8,2) NULL,
  `dimensions` json NULL,
  `tags` json NULL,
  `seo_title` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `seo_description` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `view_count` int NOT NULL DEFAULT 0,
  `sort_order` int NOT NULL DEFAULT 0,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `IDX_464f927ae360106b783ed0b410` (`slug`),
    KEY `IDX_4896158767b997396215fa74a8` (`tenant_id`, `is_active`),
    KEY `IDX_69a63e75de53e7cc4bcd029bed` (`category_id`, `is_active`),
    KEY `IDX_718dfbc007ec098cfa28295ca7` (`deleted_at`),
    KEY `IDX_860485c46a817f4b075a7a3265` (`tenant_id`, `category_id`),
    KEY `IDX_9a5f6868c96e0069e699f33e12` (`category_id`),
    KEY `IDX_9c365ebf78f0e8a6d9e4827ea7` (`tenant_id`),
    UNIQUE KEY `IDX_c44ac33a05b144dd0d9ddcf932` (`sku`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotion_usages` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `promotion_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `order_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `discount_amount` decimal(12,2) NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_b15ae9dccc9f596d053e56a0ca` (`promotion_id`, `user_id`),
    KEY `IDX_cc79e6a326759309e210c73c13` (`promotion_id`),
    KEY `IDX_ef5424451164b9d310b56f867c` (`order_id`),
    KEY `IDX_fa423dc9e20e18471278bc1882` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `promotions` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NULL,
  `type` enum('percentage','fixed','free_shipping','buy_x_get_y') NOT NULL,
  `value` decimal(12,2) NOT NULL,
  `min_order_amount` decimal(12,2) NULL,
  `max_discount_amount` decimal(12,2) NULL,
  `usage_limit` int NULL,
  `used_count` int NOT NULL DEFAULT 0,
  `per_user_limit` int NOT NULL DEFAULT 1,
  `start_date` timestamp NOT NULL,
  `end_date` timestamp NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `conditions` json NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_033493f83177878809834ac87d` (`deleted_at`),
    KEY `IDX_0d2aceb40926a2c7bed5ce5487` (`start_date`, `end_date`),
    KEY `IDX_411c328bd83a68e0ae99b5a95e` (`tenant_id`, `is_active`),
    UNIQUE KEY `IDX_8ab10e580f70c3d2e2e4b31ebf` (`code`),
    KEY `IDX_f8bcbc3a412f82f76f493769a9` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci NULL,
  `user_agent` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `expires_at` timestamp NOT NULL,
  `is_revoked` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_14187aa4d2d58318c82c62c7ea` (`user_id`, `is_revoked`),
    UNIQUE KEY `IDX_a7838d2ba25be1342091b6695f` (`token_hash`),
    KEY `IDX_ba3bd69c8ad1e799c0256e9e50` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reviews` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `product_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` tinyint NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `content` text COLLATE utf8mb4_unicode_ci NULL,
  `images` json NULL,
  `is_verified_purchase` tinyint NOT NULL DEFAULT 0,
  `is_approved` tinyint NOT NULL DEFAULT 0,
  `admin_reply` text COLLATE utf8mb4_unicode_ci NULL,
  `replied_at` timestamp NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_43968e5855f331f4f1355a3fb2` (`user_id`, `product_id`),
    KEY `IDX_5f1b745cf64a9861f328f5bc3f` (`deleted_at`),
    KEY `IDX_728447781a30bc3fcfe5c2f1cd` (`user_id`),
    KEY `IDX_9482e9567d8dcc2bc615981ef4` (`product_id`),
    KEY `IDX_bfb7f35d7db2b7afc40811c192` (`tenant_id`),
    KEY `IDX_de11687017162ef7035ce9e139` (`tenant_id`, `is_approved`),
    KEY `IDX_e454e193ac5c86637a2e0b6e25` (`product_id`, `is_approved`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `group` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `description` text COLLATE utf8mb4_unicode_ci NULL,
  `is_public` tinyint NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_4d6916ec7c9dd31afba5badc02` (`group`),
    UNIQUE KEY `IDX_c8639b7626fa94ba8265628f21` (`key`),
    KEY `IDX_ebebfa479dbc6c92bfc07cbd54` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `tenant_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','cancelled','expired','past_due','trialing') NOT NULL,
  `current_period_start` timestamp NOT NULL,
  `current_period_end` timestamp NOT NULL,
  `cancelled_at` timestamp NULL,
  `cancel_reason` text COLLATE utf8mb4_unicode_ci NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_2be48b0ae0ab5b897238e4762f` (`tenant_id`, `status`),
    KEY `IDX_5b7704aaf3dbfedccde8e99d9f` (`plan_id`, `status`),
    KEY `IDX_682142b30b75760b935dfd214e` (`deleted_at`),
    KEY `IDX_e45fca5d912c3a2fab512ac25d` (`plan_id`),
    KEY `IDX_f6ac03431c311ccb8bbd7d3af1` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(220) COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `logo_url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `settings` json NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `plan_id` varchar(26) COLLATE utf8mb4_unicode_ci NULL,
  `owner_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metadata` json NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `IDX_2310ecc5cb8be427097154b18f` (`slug`),
    KEY `IDX_919d143d2411832db812bbc600` (`plan_id`),
    KEY `IDX_9bdd1ebbd498bf759e0e8a2537` (`owner_id`, `is_active`),
    UNIQUE KEY `IDX_da4054294eaae43ec7f85b6a3a` (`domain`),
    KEY `IDX_e69b139a3d38ac60c245ec57c8` (`deleted_at`),
    KEY `IDX_efba90c155ec02ae586fb7ed31` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `translations` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `locale` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `namespace` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_77d828f9edc3f4b4bf6a48da30` (`deleted_at`),
    KEY `IDX_a2fb68a40316b1c850ad341a2e` (`locale`),
    KEY `IDX_bf5c08af218c4db90a365752b3` (`tenant_id`),
    KEY `IDX_bffd7a4b2da6d2faa6e0961dd1` (`locale`, `namespace`),
    UNIQUE KEY `IDX_e2b06b051664fb2064044b6eaa` (`locale`, `namespace`, `key`, `tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `usages` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `metric` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` bigint NOT NULL,
  `period_start` timestamp NOT NULL,
  `period_end` timestamp NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`id`),
    KEY `IDX_336f138063b35a9352b142e90b` (`tenant_id`, `period_end`),
    KEY `IDX_de1a5c820958e81bab868a8fbd` (`tenant_id`, `metric`, `period_start`),
    KEY `IDX_e77f4fc40f76f96f80350ffa31` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(500) COLLATE utf8mb4_unicode_ci NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NULL,
  `role` enum('admin','manager','editor','user') NOT NULL DEFAULT 'user',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `is_email_verified` tinyint NOT NULL DEFAULT 0,
  `two_factor_secret` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `two_factor_enabled` tinyint NOT NULL DEFAULT 0,
  `backup_codes_hash` json NULL,
  `reset_token_jti` varchar(64) COLLATE utf8mb4_unicode_ci NULL,
  `email_verification_jti` varchar(64) COLLATE utf8mb4_unicode_ci NULL,
  `provider` varchar(20) COLLATE utf8mb4_unicode_ci NULL,
  `provider_id` varchar(255) COLLATE utf8mb4_unicode_ci NULL,
  `last_login_at` timestamp NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
  `preferences` json NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_073999dfec9d14522f0cf58cd6` (`deleted_at`),
    KEY `IDX_109638590074998bb72a2f2cf0` (`tenant_id`),
    UNIQUE KEY `IDX_97672ac88f789774dd47f7c8be` (`email`),
    KEY `IDX_ace513fa30d485cfd25c11a9e4` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webhook_deliveries` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `webhook_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` json NOT NULL,
  `response_status` int NULL,
  `response_body` text COLLATE utf8mb4_unicode_ci NULL,
  `attempt` int NOT NULL DEFAULT 1,
  `success` tinyint NOT NULL DEFAULT 0,
  `duration_ms` int NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `next_retry_at` timestamp NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_04fa926c32b43d66134e059d76` (`created_at`),
    KEY `IDX_588e16e47297ae398937205e78` (`success`, `next_retry_at`),
    KEY `IDX_68ce963b5cd47f9ca615b2817f` (`event`),
    KEY `IDX_a0286aeb96db651efd1ae2966f` (`webhook_id`),
    KEY `IDX_ff6a6af2b5ceb2b23d07ec286d` (`webhook_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `webhooks` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `tenant_id` varchar(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `events` json NOT NULL,
  `secret` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NULL,
  `last_triggered_at` timestamp NULL,
  `failure_count` int NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `IDX_46f22fb15eb3be2d2b52bb7a57` (`tenant_id`, `is_active`),
    KEY `IDX_4bd82bdc09c5f624f362d8da86` (`deleted_at`),
    KEY `IDX_4d6fcde4ac5ca1d5823f51aa18` (`tenant_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `wishlists` (
  `id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at` timestamp(6) NULL,
  `user_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_id` char(26) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tenant_id` char(26) COLLATE utf8mb4_unicode_ci NULL,
    PRIMARY KEY (`id`),
    KEY `IDX_2662acbb3868b1f0077fda61dd` (`product_id`),
    UNIQUE KEY `IDX_9c64a981c56ba677ac17f5fba6` (`user_id`, `product_id`),
    KEY `IDX_acfa1e088258e6eb52b6315a77` (`user_id`, `tenant_id`),
    KEY `IDX_b5e6331a1a7d61c25d7a25cab8` (`user_id`),
    KEY `IDX_bd95820325492b01b31665f848` (`deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2) Foreign keys — them bang ALTER idempotent (kiem tra ton tai truoc khi tao)
-- ----------------------------------------------------------------------------

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_6385a745d9e12a89b859bb25623' AND TABLE_NAME='cart_items';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `cart_items` ADD CONSTRAINT `FK_6385a745d9e12a89b859bb25623` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_88cea2dc9c31951d06437879b40' AND TABLE_NAME='categories';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `categories` ADD CONSTRAINT `FK_88cea2dc9c31951d06437879b40` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE NO ACTION',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_45745953065384cc9c4264c2a3d' AND TABLE_NAME='chat_messages';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `chat_messages` ADD CONSTRAINT `FK_45745953065384cc9c4264c2a3d` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_90502ed1172e62765a6ed2443fe' AND TABLE_NAME='navigation_items';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `navigation_items` ADD CONSTRAINT `FK_90502ed1172e62765a6ed2443fe` FOREIGN KEY (`navigation_id`) REFERENCES `navigations`(`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_ccf5fd7b1b260cc40d67ad3c043' AND TABLE_NAME='navigation_items';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `navigation_items` ADD CONSTRAINT `FK_ccf5fd7b1b260cc40d67ad3c043` FOREIGN KEY (`parent_id`) REFERENCES `navigation_items`(`id`) ON DELETE NO ACTION',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_145532db85752b29c57d2b7b1f1' AND TABLE_NAME='order_items';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `order_items` ADD CONSTRAINT `FK_145532db85752b29c57d2b7b1f1` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_65fc17f66b9d5e426eaf942dc86' AND TABLE_NAME='pages';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `pages` ADD CONSTRAINT `FK_65fc17f66b9d5e426eaf942dc86` FOREIGN KEY (`parent_id`) REFERENCES `pages`(`id`) ON DELETE NO ACTION',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_6343513e20e2deab45edfce1316' AND TABLE_NAME='product_variants';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `product_variants` ADD CONSTRAINT `FK_6343513e20e2deab45edfce1316` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SELECT COUNT(*) INTO @fk_exists FROM information_schema.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA=DATABASE() AND CONSTRAINT_NAME='FK_3ddc983c5f7bcf132fd8732c3f4' AND TABLE_NAME='refresh_tokens';
SET @fk_sql = IF(@fk_exists=0,
  'ALTER TABLE `refresh_tokens` ADD CONSTRAINT `FK_3ddc983c5f7bcf132fd8732c3f4` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE',
  'SELECT 1');
PREPARE s FROM @fk_sql; EXECUTE s; DEALLOCATE PREPARE s;

SET FOREIGN_KEY_CHECKS=1;
