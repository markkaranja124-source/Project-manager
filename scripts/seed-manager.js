/**
 * SCRIPT: seed-manager.js
 * Utility to register or update manager accounts with secure bcrypt hashing
 * Usage: node scripts/seed-manager.js <name> <email> <password>
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function main() {
  const args = process.argv.slice(2);
  const name = args[0] || process.env.DEFAULT_MANAGER_NAME || 'Executive Manager';
  const email = (args[1] || process.env.DEFAULT_MANAGER_EMAIL || 'manager@executive.com').toLowerCase().trim();
  const password = args[2] || process.env.DEFAULT_MANAGER_PASSWORD || 'Manager123!';

  console.log(`[INFO] Creating/Updating Manager: ${name} (${email})`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'waiter_attendance_db'
  });

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const id = 'mgr_' + Date.now();

  await connection.execute(`
    INSERT INTO \`managers\` (id, name, email, password_hash)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      password_hash = VALUES(password_hash)
  `, [id, name, email, passwordHash]);

  console.log(`[SUCCESS] Manager account ready!`);
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  await connection.end();
}

main().catch(err => {
  console.error('[ERROR]', err.message);
  process.exit(1);
});
