/**
 * Migration Script: Add Accounts Table and account_id column to staff
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'waiter_attendance_db'
  });

  console.log('[MIGRATION] Connected to MySQL');

  // 1. Create accounts table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS \`accounts\` (
      \`id\` VARCHAR(64) NOT NULL,
      \`name\` VARCHAR(128) NOT NULL,
      \`manager_id\` VARCHAR(64) NULL,
      \`email\` VARCHAR(191) NULL,
      \`phone\` VARCHAR(64) DEFAULT '',
      \`branch\` VARCHAR(128) DEFAULT 'Main Branch',
      \`description\` TEXT NULL,
      \`status\` VARCHAR(32) DEFAULT 'Active',
      \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`id\`),
      KEY \`idx_account_manager\` (\`manager_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('[MIGRATION] Table `accounts` verified.');

  // 2. Add account_id column to staff
  try {
    await conn.query('ALTER TABLE `staff` ADD COLUMN `account_id` VARCHAR(64) DEFAULT "ACC-001" AFTER `id`;');
    console.log('[MIGRATION] Added `account_id` column to `staff`.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column')) {
      console.log('[MIGRATION] Column `account_id` already exists in `staff`.');
    } else {
      console.error('[MIGRATION] Error altering staff table:', err.message);
    }
  }

  // 3. Ensure index on account_id
  try {
    await conn.query('ALTER TABLE `staff` ADD INDEX `idx_staff_account` (`account_id`);');
  } catch (err) {}

  // 4. Seed initial accounts if empty
  const [accRows] = await conn.query('SELECT COUNT(*) as count FROM `accounts`');
  if (accRows[0].count === 0) {
    // Check managers
    const [mgrRows] = await conn.query('SELECT id, name, email FROM `managers` ORDER BY created_at ASC');
    if (mgrRows.length >= 2) {
      await conn.query(`
        INSERT INTO \`accounts\` (id, name, manager_id, email, phone, branch, description, status)
        VALUES 
          ('ACC-001', ?, ?, ?, '+254 700 000001', 'Executive Main Lounge', 'Primary restaurant dining floor and main service station', 'Active'),
          ('ACC-002', ?, ?, ?, '+254 700 000002', 'Terrace & VIP Section', 'Exclusive terrace dining and private VIP executive suite', 'Active')
      `, [
        mgrRows[0].name + ' (Main Floor)', mgrRows[0].id, mgrRows[0].email,
        mgrRows[1].name + ' (VIP & Terrace)', mgrRows[1].id, mgrRows[1].email
      ]);
    } else if (mgrRows.length === 1) {
      await conn.query(`
        INSERT INTO \`accounts\` (id, name, manager_id, email, phone, branch, description, status)
        VALUES 
          ('ACC-001', ?, ?, ?, '+254 700 000001', 'Executive Main Lounge', 'Primary restaurant dining floor and main service station', 'Active'),
          ('ACC-002', 'VIP & Terrace Account', NULL, 'vip@executive.com', '+254 700 000002', 'Terrace & VIP Section', 'Exclusive terrace dining and private VIP executive suite', 'Active')
      `, [mgrRows[0].name + ' (Main Floor)', mgrRows[0].id, mgrRows[0].email]);
    } else {
      await conn.query(`
        INSERT INTO \`accounts\` (id, name, manager_id, email, phone, branch, description, status)
        VALUES 
          ('ACC-001', 'Executive Main Lounge', NULL, 'main@executive.com', '+254 700 000001', 'Main Floor', 'Primary dining floor and main service station', 'Active'),
          ('ACC-002', 'Terrace & VIP Section', NULL, 'terrace@executive.com', '+254 700 000002', 'Terrace & VIP', 'Exclusive terrace dining and private VIP executive suite', 'Active')
      `);
    }
    console.log('[MIGRATION] Seeded initial accounts.');
  }

  // 5. Update existing staff without account_id
  await conn.query('UPDATE `staff` SET `account_id` = "ACC-001" WHERE `account_id` IS NULL OR `account_id` = ""');

  const [cols] = await conn.query('DESCRIBE staff');
  console.log('[MIGRATION] Staff columns:', cols.map(c => c.Field));

  const [accounts] = await conn.query('SELECT * FROM accounts');
  console.log('[MIGRATION] Current accounts in DB:', accounts);

  await conn.end();
  console.log('[MIGRATION] Complete!');
}

runMigration().catch(console.error);
