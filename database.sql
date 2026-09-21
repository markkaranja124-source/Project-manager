-- =======================================================
-- WAITER ATTENDANCE REGISTER - DATABASE SCHEMA & SEED DATA
-- Target Database Engine: MySQL / MariaDB (XAMPP Default)
-- Database Name: waiter_attendance_db
-- =======================================================

-- 1. Create Database if it does not already exist
CREATE DATABASE IF NOT EXISTS `waiter_attendance_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `waiter_attendance_db`;

-- =======================================================
-- 2. Table: staff
-- Stores individual waiter and waitstaff profiles
-- =======================================================
CREATE TABLE IF NOT EXISTS `staff` (
  `id` VARCHAR(64) NOT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `station` VARCHAR(128) DEFAULT '',
  `shift` VARCHAR(32) DEFAULT 'Morning',
  `phone` VARCHAR(64) DEFAULT '',
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_staff_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 3. Table: attendance
-- Stores daily attendance statuses and notes for each staff
-- Composite Primary Key on (date, staff_id) ensures one record per staff per day
-- =======================================================
CREATE TABLE IF NOT EXISTS `attendance` (
  `date` DATE NOT NULL,
  `staff_id` VARCHAR(64) NOT NULL,
  `status` VARCHAR(8) NOT NULL DEFAULT 'P',
  `note` VARCHAR(255) DEFAULT '',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`date`, `staff_id`),
  KEY `idx_attendance_staff` (`staff_id`),
  KEY `idx_attendance_date` (`date`),
  CONSTRAINT `fk_attendance_staff` FOREIGN KEY (`staff_id`)
    REFERENCES `staff` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 4. Table: reminders
-- Stores manager reminders, scheduled check-in items, and recurring alarms
-- =======================================================
CREATE TABLE IF NOT EXISTS `reminders` (
  `id` VARCHAR(64) NOT NULL,
  `manager_id` VARCHAR(64) NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `reminder_date` DATE NULL,
  `reminder_time` VARCHAR(16) NOT NULL DEFAULT '10:00',
  `repeat_type` VARCHAR(32) NOT NULL DEFAULT 'one-time', -- 'one-time', 'daily', 'weekly', 'monthly'
  `repeat_day` VARCHAR(32) NULL, -- '0'-'6' for Sunday-Saturday, or '1'-'31' for day of month
  `notification_type` VARCHAR(32) NOT NULL DEFAULT 'both', -- 'browser', 'in-app', 'both'
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_triggered` DATETIME NULL,
  `snooze_until` DATETIME NULL,
  `due_time` VARCHAR(16) DEFAULT '10:00',
  `priority` VARCHAR(16) DEFAULT 'MEDIUM',
  `completed` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 5. Table: settings
-- Application key-value configurations (business name, branch)
-- =======================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 6. Table: security
-- Manager access security settings (PIN and auto-lock timeout)
-- =======================================================
CREATE TABLE IF NOT EXISTS `security` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 7. Table: managers
-- Dedicated manager and admin accounts for secure email/password authentication
-- Passwords stored strictly as secure bcrypt hashes
-- =======================================================
CREATE TABLE IF NOT EXISTS `managers` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_manager_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 8. Table: report_settings
-- Stores schedule preferences and WhatsApp configuration for attendance reports
-- =======================================================
CREATE TABLE IF NOT EXISTS `report_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `weekly_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `weekly_day` INT NOT NULL DEFAULT 0, -- 0 = Sunday
  `weekly_time` VARCHAR(8) NOT NULL DEFAULT '18:00',
  `weekly_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
  `monthly_enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `monthly_day` INT NOT NULL DEFAULT 1, -- 1st of month
  `monthly_time` VARCHAR(8) NOT NULL DEFAULT '09:00',
  `monthly_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
  `whatsapp_number` VARCHAR(32) NOT NULL DEFAULT '',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =======================================================
-- 9. Table: generated_reports
-- Stores metadata and delivery history for generated PDF attendance reports
-- =======================================================
CREATE TABLE IF NOT EXISTS `generated_reports` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `report_type` VARCHAR(32) NOT NULL, -- 'WEEKLY', 'MONTHLY', 'CUSTOM'
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_size` INT NOT NULL DEFAULT 0,
  `total_staff` INT NOT NULL DEFAULT 0,
  `turnout_rate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `delivery_status` VARCHAR(32) NOT NULL DEFAULT 'GENERATED',
  `whatsapp_status` VARCHAR(32) NOT NULL DEFAULT 'DISABLED',
  `whatsapp_error` TEXT NULL,
  `generated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_report_period` (`report_type`, `period_start`, `period_end`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =======================================================
-- 10. Table: manager_passkeys
-- Stores registered WebAuthn credentials / passkeys for biometric login
-- STRICT PRIVACY: ZERO biometric data (fingerprints/face scans) are stored.
-- Only public keys, credential IDs, and sign counters are retained.
-- =======================================================
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


-- =======================================================
-- 11. Table: table_assignments
-- Stores table and service station staff assignments by date and shift
-- =======================================================
CREATE TABLE IF NOT EXISTS `table_assignments` (
  `id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `date` DATE NOT NULL,
  `shift` VARCHAR(32) NOT NULL DEFAULT 'Morning',
  `station_id` VARCHAR(64) NOT NULL,
  `staff_id` VARCHAR(64) NULL,
  `notes` VARCHAR(255) DEFAULT '',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `idx_date_shift_station` (`date`, `shift`, `station_id`),
  KEY `idx_assign_staff` (`staff_id`),
  CONSTRAINT `fk_assign_staff` FOREIGN KEY (`staff_id`)
    REFERENCES `staff` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =======================================================
-- 12. INITIAL SEED DATA
-- Populates default staff, settings, security, & reminders
-- =======================================================

-- Insert Initial Staff
INSERT INTO `staff` (`id`, `code`, `name`, `station`, `shift`, `phone`, `active`) VALUES
  ('st_101', 'W-101', 'Marcus Vance', 'Section A - Front', 'Morning', '+1 (555) 012-8811', 1),
  ('st_102', 'W-102', 'Elena Rostova', 'Main Dining Floor', 'Morning', '+1 (555) 014-9922', 1),
  ('st_103', 'W-103', 'David Kim', 'VIP Lounge / Private', 'Evening', '+1 (555) 017-3344', 1),
  ('st_104', 'W-104', 'Sophie Laurent', 'Terrace & Patio', 'Evening', '+1 (555) 019-5566', 1),
  ('st_105', 'W-105', 'Tariq Al-Mansoor', 'Main Dining Floor', 'Night', '+1 (555) 011-7788', 1),
  ('st_106', 'W-106', 'Chloe Bennett', 'Bar & Cocktail Area', 'Night', '+1 (555) 013-4411', 1),
  ('st_107', 'W-107', 'Lucas Silva', 'Section B Floor', 'Double', '+1 (555) 016-2233', 1),
  ('st_108', 'W-108', 'Maya Patel', 'Section C Floor', 'Morning', '+1 (555) 018-6677', 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Insert Initial Settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
  ('businessName', 'EXECUTIVE RESTAURANT & BAR'),
  ('branch', 'Main Service Operations')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Insert Initial Security
INSERT INTO `security` (`setting_key`, `setting_value`) VALUES
  ('pin', '1234'),
  ('autoLockMinutes', '5')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Insert Initial Reminders
INSERT INTO `reminders` (`id`, `title`, `due_time`, `priority`, `completed`) VALUES
  ('rem_101', 'Review Morning Shift Turnout & Unmarked Waiters', '10:00', 'HIGH', 0),
  ('rem_102', 'Audit End-of-Month Absentee Report Sheet', '17:00', 'MEDIUM', 0)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`);
