-- =======================================================
-- MIGRATION: RESTAURANT FLOOR PLAN & TABLE ASSIGNMENTS
-- Target Database: waiter_attendance_db (MySQL/MariaDB)
-- =======================================================

USE `waiter_attendance_db`;

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
