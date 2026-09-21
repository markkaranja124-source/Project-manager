USE waiter_attendance_db;

-- 1. Expand reminders table with manager reminder & alarm fields
ALTER TABLE reminders
  ADD COLUMN IF NOT EXISTS manager_id VARCHAR(64) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS description TEXT NULL AFTER title,
  ADD COLUMN IF NOT EXISTS reminder_date DATE NULL AFTER description,
  ADD COLUMN IF NOT EXISTS reminder_time VARCHAR(16) NOT NULL DEFAULT '10:00' AFTER reminder_date,
  ADD COLUMN IF NOT EXISTS repeat_type VARCHAR(32) NOT NULL DEFAULT 'one-time' AFTER reminder_time,
  ADD COLUMN IF NOT EXISTS repeat_day VARCHAR(32) NULL AFTER repeat_type,
  ADD COLUMN IF NOT EXISTS notification_type VARCHAR(32) NOT NULL DEFAULT 'both' AFTER repeat_day,
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER notification_type,
  ADD COLUMN IF NOT EXISTS last_triggered DATETIME NULL AFTER is_active,
  ADD COLUMN IF NOT EXISTS snooze_until DATETIME NULL AFTER last_triggered;

-- 2. Create report_settings table
CREATE TABLE IF NOT EXISTS report_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  weekly_enabled TINYINT(1) NOT NULL DEFAULT 1,
  weekly_day INT NOT NULL DEFAULT 0, -- 0 = Sunday
  weekly_time VARCHAR(8) NOT NULL DEFAULT '18:00',
  weekly_whatsapp TINYINT(1) NOT NULL DEFAULT 0,
  monthly_enabled TINYINT(1) NOT NULL DEFAULT 1,
  monthly_day INT NOT NULL DEFAULT 1, -- 1st of month
  monthly_time VARCHAR(8) NOT NULL DEFAULT '09:00',
  monthly_whatsapp TINYINT(1) NOT NULL DEFAULT 0,
  whatsapp_number VARCHAR(32) NOT NULL DEFAULT '',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Seed default report settings if empty
INSERT INTO report_settings (id, weekly_enabled, weekly_day, weekly_time, monthly_enabled, monthly_day, monthly_time)
SELECT 1, 1, 0, '18:00', 1, 1, '09:00'
WHERE NOT EXISTS (SELECT 1 FROM report_settings WHERE id = 1);

-- 4. Create generated_reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  report_type VARCHAR(32) NOT NULL, -- 'WEEKLY', 'MONTHLY', 'CUSTOM'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  file_size INT NOT NULL DEFAULT 0,
  total_staff INT NOT NULL DEFAULT 0,
  turnout_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  delivery_status VARCHAR(32) NOT NULL DEFAULT 'GENERATED',
  whatsapp_status VARCHAR(32) NOT NULL DEFAULT 'DISABLED',
  whatsapp_error TEXT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_report_period (report_type, period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
