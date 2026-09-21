-- =======================================================
-- MIGRATION: MANAGER WEBAUTHN / PASSKEYS TABLE
-- Target Database: waiter_attendance_db (MySQL/MariaDB)
-- =======================================================

USE `waiter_attendance_db`;

CREATE TABLE IF NOT EXISTS `manager_passkeys` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `manager_id` VARCHAR(64) NOT NULL,
  `credential_id` VARCHAR(255) NOT NULL,
  `public_key` TEXT NOT NULL,
  `sign_count` BIGINT NOT NULL DEFAULT 0,
  `device_name` VARCHAR(255) NOT NULL DEFAULT 'Device Passkey',
  `transports` VARCHAR(255) DEFAULT '["internal"]',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `last_used_at` TIMESTAMP NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `idx_credential_id` (`credential_id`),
  KEY `idx_manager_passkeys` (`manager_id`),
  CONSTRAINT `fk_passkey_manager` FOREIGN KEY (`manager_id`)
    REFERENCES `managers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
