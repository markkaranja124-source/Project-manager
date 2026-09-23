/**
 * WAITER ATTENDANCE REGISTER - EXECUTIVE BACKEND SERVER
 * Architecture: Node.js / Express / MySQL2 (XAMPP MariaDB) / bcryptjs
 * Security: Server-side Session Authentication, Bcrypt Hashing, Parameterized SQL
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const { generateWeeklyReport, generateMonthlyReport, getWeekRange, getMonthRange, REPORTS_DIR } = require('./services/report-generator');
const { sendReportNotification } = require('./services/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

// Database Configuration
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'waiter_attendance_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create Shared MySQL Connection Pool
let dbPool = null;

async function initDatabase() {
  try {
    // 1. Ensure database exists
    const rootConn = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    // 2. Initialize pool
    dbPool = mysql.createPool(dbConfig);
    console.log(`[DB] Connected to MySQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database})`);

    // 3. Ensure managers table exists
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS \`managers\` (
        \`id\` VARCHAR(64) NOT NULL,
        \`name\` VARCHAR(128) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`password_hash\` VARCHAR(255) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`idx_manager_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure manager_passkeys table exists (WebAuthn credentials)
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS \`manager_passkeys\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`manager_id\` VARCHAR(64) NOT NULL,
        \`credential_id\` VARCHAR(255) NOT NULL,
        \`public_key\` TEXT NOT NULL,
        \`sign_count\` BIGINT NOT NULL DEFAULT 0,
        \`device_name\` VARCHAR(255) NOT NULL DEFAULT 'Device Passkey',
        \`transports\` VARCHAR(255) DEFAULT '["internal"]',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`last_used_at\` TIMESTAMP NULL,
        \`is_active\` TINYINT(1) NOT NULL DEFAULT 1,
        UNIQUE KEY \`idx_credential_id\` (\`credential_id\`),
        KEY \`idx_manager_passkeys\` (\`manager_id\`),
        CONSTRAINT \`fk_passkey_manager\` FOREIGN KEY (\`manager_id\`)
          REFERENCES \`managers\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Ensure table_assignments table exists (Floor Plan Table Assignments)
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS \`table_assignments\` (
        \`id\` VARCHAR(64) NOT NULL PRIMARY KEY,
        \`date\` DATE NOT NULL,
        \`shift\` VARCHAR(32) NOT NULL DEFAULT 'Morning',
        \`station_id\` VARCHAR(64) NOT NULL,
        \`staff_id\` VARCHAR(64) NULL,
        \`notes\` VARCHAR(255) DEFAULT '',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY \`idx_date_shift_station\` (\`date\`, \`shift\`, \`station_id\`),
        KEY \`idx_assign_staff\` (\`staff_id\`),
        CONSTRAINT \`fk_assign_staff\` FOREIGN KEY (\`staff_id\`)
          REFERENCES \`staff\` (\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Seed default manager account if table is empty
    const [rows] = await dbPool.execute('SELECT COUNT(*) as count FROM `managers`');
    if (rows[0].count === 0) {
      const defaultName = process.env.DEFAULT_MANAGER_NAME || 'Executive Manager';
      const defaultEmail = (process.env.DEFAULT_MANAGER_EMAIL || 'manager@executive.com').toLowerCase().trim();
      const defaultPassword = process.env.DEFAULT_MANAGER_PASSWORD || 'Manager123!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(defaultPassword, salt);
      const managerId = 'mgr_' + Date.now();

      await dbPool.execute(
        'INSERT INTO `managers` (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [managerId, defaultName, defaultEmail, passwordHash]
      );
      console.log(`[AUTH] Seeded default manager: ${defaultEmail} (Password configured in .env)`);
    }
  } catch (err) {
    console.error('[DB] Database initialization error:', err.message);
  }
}

// Enable trust proxy for reverse proxies / tunnels
app.set('trust proxy', 1);

// Global Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Secure Session Configuration
app.use(session({
  name: 'executive_session_id',
  secret: process.env.SESSION_SECRET || 'executive_waiter_manager_secret_key_2026',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Refresh cookie expiration on activity
  cookie: {
    httpOnly: true, // Prevent client-side JS access to session cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Helper: Email Format Validator
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Server-Side Auth Verification Middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.manager) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: 'Unauthorized. Active manager session required.'
  });
}

// No-Cache Headers for Protected Web Pages
function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

// Serve SimpleWebAuthn Browser bundle statically
app.get('/js/simplewebauthn-browser.js', (req, res) => {
  const localBundle = path.join(__dirname, 'js', 'simplewebauthn-browser.js');
  if (fs.existsSync(localBundle)) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(localBundle);
  }
  const bundlePath = path.join(__dirname, 'node_modules', '@simplewebauthn', 'browser', 'dist', 'bundle', 'index.umd.min.js');
  if (fs.existsSync(bundlePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(bundlePath);
  }
  return res.status(404).send('WebAuthn client library not found.');
});

// WebAuthn Helper to determine RP ID & Origin dynamically for localhost / production HTTPS
function getWebAuthnConfig(req) {
  const host = req.get('host') || 'localhost:3000';
  let hostname = req.hostname || 'localhost';
  if (host.includes(':')) {
    hostname = host.split(':')[0];
  } else {
    hostname = host;
  }
  const isHttps = req.protocol === 'https' || req.secure || req.get('x-forwarded-proto') === 'https';
  const protocol = isHttps ? 'https' : 'http';

  // For localhost / 127.0.0.1, standard RP ID is 'localhost'
  const rpID = (hostname === '127.0.0.1' || hostname === 'localhost') ? 'localhost' : hostname;
  const origin = `${protocol}://${host}`;

  return {
    rpName: 'Executive Waiter Attendance Register',
    rpID,
    origin
  };
}


// ============================================================================
// AUTHENTICATION API ROUTES (PUBLIC)
// ============================================================================

/**
 * POST /api/auth/login
 * Validates credentials, verifies bcrypt hash, regenerates session ID
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Input Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 2. Query database using Prepared Statements
    const [rows] = await dbPool.execute(
      'SELECT id, name, email, password_hash FROM `managers` WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    // 3. User Existence Check
    if (!rows || rows.length === 0) {
      // Intentionally generic message to avoid email enumeration
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const manager = rows[0];

    // 4. Constant-time Bcrypt Password Hash Verification
    const passwordMatch = await bcrypt.compare(password, manager.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // 5. Regenerate Session ID on Login to Prevent Session Fixation Attacks
    req.session.regenerate((err) => {
      if (err) {
        console.error('[AUTH] Session regeneration error:', err);
        return res.status(500).json({ success: false, message: 'Session error. Please try again.' });
      }

      // Store authenticated manager state in session
      req.session.manager = {
        id: manager.id,
        name: manager.name,
        email: manager.email,
        loginTime: Date.now()
      };

      return res.json({
        success: true,
        message: 'Login successful.',
        manager: {
          id: manager.id,
          name: manager.name,
          email: manager.email
        }
      });
    });

  } catch (err) {
    console.error('[AUTH] Login exception:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication service temporarily unavailable.'
    });
  }
});

/**
 * GET /api/auth/me
 * Checks current session state
 */
app.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.manager) {
    return res.json({
      authenticated: true,
      manager: {
        id: req.session.manager.id,
        name: req.session.manager.name,
        email: req.session.manager.email
      }
    });
  }
  return res.json({
    authenticated: false,
    manager: null
  });
});

/**
 * POST /api/auth/logout
 * Destroys session, clears cookie, prevents back-navigation caching
 */
app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('[AUTH] Logout error:', err);
        return res.status(500).json({ success: false, message: 'Could not log out.' });
      }
      res.clearCookie('executive_session_id', { path: '/' });
      return res.json({
        success: true,
        message: 'Logged out successfully.'
      });
    });
  } else {
    res.clearCookie('executive_session_id', { path: '/' });
    return res.json({ success: true, message: 'Logged out.' });
  }
});

/**
 * POST /api/auth/signup
 * Validates manager registration and hashes password with bcrypt
 */
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required.'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Full name must be at least 2 characters.'
      });
    }

    if (!isValidEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    // Check if email already registered (parameterized query)
    const [existing] = await dbPool.execute(
      'SELECT id FROM `managers` WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Hash password with bcrypt (10 rounds)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const managerId = 'mgr_' + Date.now();

    await dbPool.execute(
      'INSERT INTO `managers` (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [managerId, cleanName, cleanEmail, passwordHash]
    );

    console.log(`[AUTH] New manager registered: ${cleanEmail}`);

    return res.status(201).json({
      success: true,
      message: 'Manager account created successfully! You can now log in.'
    });

  } catch (err) {
    console.error('[AUTH] Signup error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Registration service temporarily unavailable.'
    });
  }
});


// ============================================================================
// WEBAUTHN / BIOMETRIC PASSKEY AUTHENTICATION ROUTES
// Strict Security: ZERO biometric data is collected or stored on server.
// Only standard W3C WebAuthn cryptographic public keys and counters are stored.
// ============================================================================

/**
 * GET /api/auth/passkey/register-options
 * Generates WebAuthn registration challenge for authenticated manager
 */
app.get('/api/auth/passkey/register-options', requireAuth, async (req, res) => {
  try {
    const manager = req.session.manager;
    const { rpName, rpID } = getWebAuthnConfig(req);

    // Fetch existing active passkeys to exclude re-registering the same hardware authenticator
    const [existing] = await dbPool.execute(
      'SELECT credential_id, transports FROM `manager_passkeys` WHERE manager_id = ? AND is_active = 1',
      [manager.id]
    );

    const excludeCredentials = existing.map(row => ({
      id: row.credential_id,
      transports: row.transports ? JSON.parse(row.transports) : undefined
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(manager.id, 'utf-8'),
      userName: manager.email,
      userDisplayName: manager.name || manager.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    });

    req.session.currentWebAuthnChallenge = options.challenge;

    return res.json({
      success: true,
      options
    });
  } catch (err) {
    console.error('[WEBAUTHN] Error generating registration options:', err);
    return res.status(500).json({ success: false, message: 'Could not generate passkey registration challenge.' });
  }
});

/**
 * POST /api/auth/passkey/register-verify
 * Verifies WebAuthn registration response and stores public key in MySQL
 */
app.post('/api/auth/passkey/register-verify', requireAuth, async (req, res) => {
  try {
    const manager = req.session.manager;
    const expectedChallenge = req.session.currentWebAuthnChallenge;
    const { response, deviceName } = req.body;

    if (!response || !expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Invalid registration response or missing challenge session.' });
    }

    const { rpID, origin } = getWebAuthnConfig(req);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ success: false, message: 'Passkey registration verification failed.' });
    }

    const { credential } = verification.registrationInfo;
    const credentialID = credential.id;
    const credentialPublicKey = Buffer.from(credential.publicKey).toString('base64');
    const counter = credential.counter;
    const transports = JSON.stringify(response.response?.transports || ['internal']);

    const passkeyId = 'pk_' + Date.now();
    const cleanDeviceName = (deviceName && deviceName.trim()) || 'Device Passkey';

    // Store in MySQL manager_passkeys table
    await dbPool.execute(
      `INSERT INTO \`manager_passkeys\`
        (id, manager_id, credential_id, public_key, sign_count, device_name, transports, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE public_key = VALUES(public_key), sign_count = VALUES(sign_count), is_active = 1`,
      [passkeyId, manager.id, credentialID, credentialPublicKey, counter, cleanDeviceName, transports]
    );

    delete req.session.currentWebAuthnChallenge;

    console.log(`[WEBAUTHN] New passkey registered for manager ${manager.email}: "${cleanDeviceName}"`);

    return res.status(201).json({
      success: true,
      message: 'Biometric passkey registered successfully!',
      passkey: {
        id: passkeyId,
        deviceName: cleanDeviceName
      }
    });
  } catch (err) {
    console.error('[WEBAUTHN] Error verifying registration:', err);
    return res.status(500).json({ success: false, message: err.message || 'Passkey registration error.' });
  }
});

/**
 * POST /api/auth/passkey/login-options
 * Generates WebAuthn authentication challenge for passkey sign-in
 */
app.post('/api/auth/passkey/login-options', async (req, res) => {
  try {
    const { email } = req.body || {};
    const { rpID } = getWebAuthnConfig(req);
    let allowCredentials = undefined;

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const [managers] = await dbPool.execute(
        'SELECT id FROM `managers` WHERE email = ? LIMIT 1',
        [cleanEmail]
      );
      if (managers && managers.length > 0) {
        const managerId = managers[0].id;
        const [passkeys] = await dbPool.execute(
          'SELECT credential_id, transports FROM `manager_passkeys` WHERE manager_id = ? AND is_active = 1',
          [managerId]
        );
        if (passkeys.length > 0) {
          allowCredentials = passkeys.map(pk => ({
            id: pk.credential_id,
            transports: pk.transports ? JSON.parse(pk.transports) : undefined
          }));
        }
      }
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred'
    });

    req.session.currentWebAuthnChallenge = options.challenge;

    return res.json({
      success: true,
      options
    });
  } catch (err) {
    console.error('[WEBAUTHN] Error generating login options:', err);
    return res.status(500).json({ success: false, message: 'Could not generate passkey authentication challenge.' });
  }
});

/**
 * POST /api/auth/passkey/login-verify
 * Verifies cryptographic response against manager's public key and starts session
 */
app.post('/api/auth/passkey/login-verify', async (req, res) => {
  try {
    const expectedChallenge = req.session.currentWebAuthnChallenge;
    const { response } = req.body;

    if (!response || !expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Invalid authentication response or missing challenge session.' });
    }

    // Query passkey by credential_id
    const [rows] = await dbPool.execute(
      `SELECT pk.id AS passkey_id, pk.credential_id, pk.public_key, pk.sign_count, pk.is_active,
              m.id AS manager_id, m.name AS manager_name, m.email AS manager_email
       FROM \`manager_passkeys\` pk
       INNER JOIN \`managers\` m ON m.id = pk.manager_id
       WHERE pk.credential_id = ? LIMIT 1`,
      [response.id]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Passkey not recognized or not registered.' });
    }

    const passkey = rows[0];

    // Check if passkey was revoked
    if (!passkey.is_active) {
      return res.status(403).json({ success: false, message: 'This passkey has been revoked by the manager. Please use password login.' });
    }

    const { rpID, origin } = getWebAuthnConfig(req);
    const publicKeyBuffer = Buffer.from(passkey.public_key, 'base64');

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credential_id,
        publicKey: publicKeyBuffer,
        counter: Number(passkey.sign_count)
      },
      requireUserVerification: false
    });

    if (!verification.verified || !verification.authenticationInfo) {
      return res.status(401).json({ success: false, message: 'Biometric cryptographic verification failed.' });
    }

    const newCounter = verification.authenticationInfo.newCounter;

    // Update sign_count and last_used_at in MySQL
    await dbPool.execute(
      'UPDATE `manager_passkeys` SET sign_count = ?, last_used_at = NOW() WHERE id = ?',
      [newCounter, passkey.passkey_id]
    );

    delete req.session.currentWebAuthnChallenge;

    // Regenerate session ID to prevent fixation and set authenticated manager
    req.session.regenerate((err) => {
      if (err) {
        console.error('[WEBAUTHN] Session error on passkey login:', err);
        return res.status(500).json({ success: false, message: 'Session error. Please try again.' });
      }

      req.session.manager = {
        id: passkey.manager_id,
        name: passkey.manager_name,
        email: passkey.manager_email,
        loginTime: Date.now(),
        authMethod: 'passkey'
      };

      console.log(`[AUTH] Passkey biometric login successful for: ${passkey.manager_email}`);

      return res.json({
        success: true,
        message: 'Passkey biometric authentication successful.',
        manager: {
          id: passkey.manager_id,
          name: passkey.manager_name,
          email: passkey.manager_email
        },
        redirect: '/'
      });
    });

  } catch (err) {
    console.error('[WEBAUTHN] Error verifying authentication:', err);
    return res.status(500).json({ success: false, message: err.message || 'Passkey login error.' });
  }
});

/**
 * GET /api/auth/passkeys
 * Lists all registered passkeys for current manager (Protected)
 */
app.get('/api/auth/passkeys', requireAuth, async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      `SELECT id, device_name, created_at, last_used_at, is_active,
              CONCAT(SUBSTRING(credential_id, 1, 8), '...', SUBSTRING(credential_id, -8)) AS credential_preview
       FROM \`manager_passkeys\`
       WHERE manager_id = ?
       ORDER BY created_at DESC`,
      [req.session.manager.id]
    );
    return res.json({ success: true, passkeys: rows });
  } catch (err) {
    console.error('[WEBAUTHN] Error fetching passkeys:', err);
    return res.status(500).json({ success: false, message: 'Could not load passkeys.' });
  }
});

/**
 * DELETE /api/auth/passkeys/:id
 * Revokes / deletes a registered passkey (Protected)
 */
app.delete('/api/auth/passkeys/:id', requireAuth, async (req, res) => {
  try {
    const passkeyId = req.params.id;
    const [result] = await dbPool.execute(
      'DELETE FROM `manager_passkeys` WHERE id = ? AND manager_id = ?',
      [passkeyId, req.session.manager.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Passkey not found.' });
    }
    console.log(`[WEBAUTHN] Passkey ${passkeyId} revoked by manager ${req.session.manager.email}`);
    return res.json({ success: true, message: 'Passkey revoked successfully.' });
  } catch (err) {
    console.error('[WEBAUTHN] Error deleting passkey:', err);
    return res.status(500).json({ success: false, message: 'Could not revoke passkey.' });
  }
});

/**
 * POST /api/auth/passkeys/:id/rename
 * Renames a registered passkey (Protected)
 */
app.post('/api/auth/passkeys/:id/rename', requireAuth, async (req, res) => {
  try {
    const passkeyId = req.params.id;
    const { deviceName } = req.body;
    if (!deviceName || !deviceName.trim()) {
      return res.status(400).json({ success: false, message: 'Device name is required.' });
    }
    await dbPool.execute(
      'UPDATE `manager_passkeys` SET device_name = ? WHERE id = ? AND manager_id = ?',
      [deviceName.trim(), passkeyId, req.session.manager.id]
    );
    return res.json({ success: true, message: 'Device name updated.' });
  } catch (err) {
    console.error('[WEBAUTHN] Error renaming passkey:', err);
    return res.status(500).json({ success: false, message: 'Could not update device name.' });
  }
});


// ============================================================================
// STAFF MANAGEMENT API ROUTES (MySQL Direct Persistence)
// ============================================================================

/**
 * GET /api/staff
 * Retrieves all staff members from MySQL
 */
app.get('/api/staff', requireAuth, async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT id, code, name, station, shift, phone, active, created_at FROM `staff` ORDER BY code ASC');
    const staff = rows.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      station: s.station || '',
      shift: s.shift || 'Morning',
      phone: s.phone || '',
      active: s.active === 1,
      createdAt: s.created_at
    }));
    return res.json({ success: true, staff });
  } catch (err) {
    console.error('[STAFF] Error fetching staff:', err);
    return res.status(500).json({ success: false, message: 'Could not fetch staff records.' });
  }
});

/**
 * GET /api/staff/next-code
 * Calculates the next sequential employee code (e.g. W-109, W-110)
 */
app.get('/api/staff/next-code', requireAuth, async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT code FROM `staff`');
    let maxNum = 100;
    rows.forEach(r => {
      if (r.code) {
        const m = r.code.match(/\d+/);
        if (m) {
          const n = parseInt(m[0], 10);
          if (n > maxNum) maxNum = n;
        }
      }
    });
    return res.json({ success: true, nextCode: `W-${maxNum + 1}` });
  } catch (err) {
    return res.json({ success: true, nextCode: `W-${Date.now().toString().slice(-3)}` });
  }
});

/**
 * POST /api/staff
 * Adds a whole new staff member directly to MySQL `staff` table as a distinct entry
 */
app.post('/api/staff', requireAuth, async (req, res) => {
  try {
    let { code, name, station, shift, phone } = req.body;
    name = (name || '').trim();
    code = (code || '').trim();
    station = (station || '').trim();
    shift = (shift || 'Morning').trim();
    phone = (phone || '').trim();

    if (!name) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }

    // If code is empty, automatically assign next sequential code
    if (!code) {
      const [rows] = await dbPool.execute('SELECT code FROM `staff`');
      let maxNum = 100;
      rows.forEach(r => {
        if (r.code) {
          const m = r.code.match(/\d+/);
          if (m) {
            const n = parseInt(m[0], 10);
            if (n > maxNum) maxNum = n;
          }
        }
      });
      code = `W-${maxNum + 1}`;
    }

    // Check if code already exists in database
    const [existing] = await dbPool.execute('SELECT id, name FROM `staff` WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: `A staff member with employee code "${code}" already exists (${existing[0].name}). Please assign a unique employee code.`
      });
    }

    const staffId = 'st_' + Date.now();

    await dbPool.execute(`
      INSERT INTO \`staff\` (id, code, name, station, shift, phone, active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [staffId, code, name, station, shift, phone]);

    console.log(`[STAFF] New staff entry created: ${name} (${code}, ID: ${staffId}) by manager ${req.session.manager?.email}`);

    const newStaff = {
      id: staffId,
      code,
      name,
      station,
      shift,
      phone,
      active: true
    };

    return res.status(201).json({
      success: true,
      message: `Staff member "${name}" added to database as a new entry.`,
      staff: newStaff
    });
  } catch (err) {
    console.error('[STAFF] Error creating staff entry:', err);
    return res.status(500).json({ success: false, message: 'Database error creating staff: ' + err.message });
  }
});

/**
 * PUT /api/staff/:id
 * Updates an existing staff record in MySQL
 */
app.put('/api/staff/:id', requireAuth, async (req, res) => {
  try {
    const staffId = req.params.id;
    let { code, name, station, shift, phone, active } = req.body;
    name = (name || '').trim();
    code = (code || '').trim();
    station = (station || '').trim();
    shift = (shift || 'Morning').trim();
    phone = (phone || '').trim();
    const isActive = active === false ? 0 : 1;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Full name is required.' });
    }
    if (!code) {
      return res.status(400).json({ success: false, message: 'Staff code is required.' });
    }

    // Check if code is taken by another staff member
    const [existingCode] = await dbPool.execute(
      'SELECT id, name FROM `staff` WHERE code = ? AND id != ?',
      [code, staffId]
    );
    if (existingCode.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Employee code "${code}" is already in use by ${existingCode[0].name}.`
      });
    }

    const [result] = await dbPool.execute(`
      UPDATE \`staff\`
      SET code = ?, name = ?, station = ?, shift = ?, phone = ?, active = ?
      WHERE id = ?
    `, [code, name, station, shift, phone, isActive, staffId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Staff record not found.' });
    }

    console.log(`[STAFF] Staff ${staffId} (${name}) updated in database.`);

    return res.json({
      success: true,
      message: `Staff member "${name}" updated.`,
      staff: {
        id: staffId,
        code,
        name,
        station,
        shift,
        phone,
        active: isActive === 1
      }
    });
  } catch (err) {
    console.error('[STAFF] Error updating staff:', err);
    return res.status(500).json({ success: false, message: 'Database error updating staff: ' + err.message });
  }
});

/**
 * DELETE /api/staff/:id
 * Removes a staff record from MySQL (cascades attendance records via foreign key)
 */
app.delete('/api/staff/:id', requireAuth, async (req, res) => {
  try {
    const staffId = req.params.id;
    const [result] = await dbPool.execute('DELETE FROM `staff` WHERE id = ?', [staffId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Staff record not found in database.' });
    }
    console.log(`[STAFF] Staff ${staffId} removed from database by manager ${req.session.manager?.email}`);
    return res.json({ success: true, message: 'Staff member removed from database.' });
  } catch (err) {
    console.error('[STAFF] Error deleting staff:', err);
    return res.status(500).json({ success: false, message: 'Database error removing staff: ' + err.message });
  }
});


// ============================================================================
// RESTAURANT FLOOR PLAN & TABLE ASSIGNMENTS API
// ============================================================================

const FLOOR_PLAN_STATIONS = [
  { id: 'booth_1', name: 'Booth 1', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
  { id: 'booth_2', name: 'Booth 2', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
  { id: 'booth_3', name: 'Booth 3', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
  { id: 'booth_4', name: 'Booth 4', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
  { id: 'table_1', name: 'Table 1', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_2', name: 'Table 2', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_3', name: 'Table 3', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_4', name: 'Table 4', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_5', name: 'Table 5', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_6', name: 'Table 6', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_7', name: 'Table 7', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'table_8', name: 'Table 8', section: 'Main Dining', type: 'table', capacity: 4, shape: 'square' },
  { id: 'section_a_1', name: 'Section A - Upper', section: 'Section A', type: 'large_table', capacity: 6, shape: 'rect' },
  { id: 'section_a_2', name: 'Section A - Lower', section: 'Section A', type: 'large_table', capacity: 6, shape: 'rect' },
  { id: 'section_b_1', name: 'Section B', section: 'Section B', type: 'large_table', capacity: 6, shape: 'rect' },
  { id: 'bar', name: 'Bar Counter', section: 'Bar Area', type: 'bar', capacity: 4, shape: 'bar' }
];

const STAFF_AVATAR_COLORS = [
  '#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DC2626',
  '#EAB308', '#06B6D4', '#EC4899', '#0D9488', '#1E3A8A',
  '#6366F1', '#84CC16', '#B45309', '#991B1B', '#4F46E5',
  '#059669', '#D97706', '#7C3AED', '#DB2777', '#0891B2'
];

/**
 * GET /api/floorplan/stations
 * Returns the station blueprint catalog
 */
app.get('/api/floorplan/stations', requireAuth, (req, res) => {
  return res.json({ success: true, stations: FLOOR_PLAN_STATIONS });
});

/**
 * GET /api/floorplan/assignments
 * Returns assignments for a specific date and shift with waiter attendance status
 */
app.get('/api/floorplan/assignments', requireAuth, async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const date = (req.query.date || todayStr).trim();
    const shift = (req.query.shift || 'Morning').trim();

    // 1. Fetch active staff
    const [staffRows] = await dbPool.execute(
      'SELECT id, code, name, station, shift, phone, active FROM `staff` WHERE active = 1 ORDER BY code ASC'
    );

    // 2. Fetch daily attendance for this date
    const [attRows] = await dbPool.execute(
      'SELECT staff_id, status FROM `attendance` WHERE `date` = ?',
      [date]
    );
    const attendanceMap = {};
    attRows.forEach(a => { attendanceMap[a.staff_id] = a.status; });

    // 3. Fetch explicit table assignments
    const [assignRows] = await dbPool.execute(
      `SELECT ta.id, ta.station_id, ta.staff_id, ta.notes, ta.date, ta.shift,
              s.name as staff_name, s.code as staff_code, s.phone as staff_phone
       FROM \`table_assignments\` ta
       LEFT JOIN \`staff\` s ON ta.staff_id = s.id
       WHERE ta.date = ? AND ta.shift = ?`,
      [date, shift]
    );

    const assignmentByStation = {};
    assignRows.forEach(row => {
      assignmentByStation[row.station_id] = {
        id: row.id,
        station_id: row.station_id,
        staff_id: row.staff_id,
        staff_name: row.staff_name || null,
        staff_code: row.staff_code || null,
        staff_phone: row.staff_phone || null,
        notes: row.notes || '',
        status: row.staff_id ? (attendanceMap[row.staff_id] || 'P') : 'unassigned'
      };
    });

    // Staff color mapping index
    const staffColorMap = {};
    staffRows.forEach((s, idx) => {
      staffColorMap[s.id] = STAFF_AVATAR_COLORS[idx % STAFF_AVATAR_COLORS.length];
    });

    // Build complete stations data
    const stations = FLOOR_PLAN_STATIONS.map(st => {
      const assignment = assignmentByStation[st.id] || {
        station_id: st.id,
        staff_id: null,
        staff_name: null,
        staff_code: null,
        notes: '',
        status: 'unassigned'
      };

      const color = assignment.staff_id ? staffColorMap[assignment.staff_id] || '#64748B' : null;

      return {
        ...st,
        assignment: {
          ...assignment,
          color
        }
      };
    });

    // Staff list for sidebar with assigned station IDs
    const employees = staffRows.map((s, idx) => {
      const assignedStations = [];
      Object.values(assignmentByStation).forEach(a => {
        if (a.staff_id === s.id) assignedStations.push(a.station_id);
      });
      return {
        id: s.id,
        code: s.code,
        name: s.name,
        station: s.station,
        shift: s.shift,
        color: STAFF_AVATAR_COLORS[idx % STAFF_AVATAR_COLORS.length],
        status: attendanceMap[s.id] || 'P',
        assignedStations
      };
    });

    return res.json({
      success: true,
      date,
      shift,
      stations,
      employees
    });

  } catch (err) {
    console.error('[FLOORPLAN] Error fetching assignments:', err);
    return res.status(500).json({ success: false, message: 'Could not load floor plan assignments.' });
  }
});

/**
 * POST /api/floorplan/assign
 * Assigns or unassigns a waiter to a station
 */
app.post('/api/floorplan/assign', requireAuth, async (req, res) => {
  try {
    let { date, shift, station_id, staff_id, notes } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    date = (date || todayStr).trim();
    shift = (shift || 'Morning').trim();
    station_id = (station_id || '').trim();
    staff_id = staff_id && staff_id !== 'none' && staff_id !== 'unassigned' ? staff_id.trim() : null;
    notes = (notes || '').trim();

    if (!station_id) {
      return res.status(400).json({ success: false, message: 'Station ID is required.' });
    }

    const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    await dbPool.execute(`
      INSERT INTO \`table_assignments\` (id, date, shift, station_id, staff_id, notes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        staff_id = VALUES(staff_id),
        notes = VALUES(notes)
    `, [assignmentId, date, shift, station_id, staff_id, notes]);

    console.log(`[FLOORPLAN] Station ${station_id} assigned to staff ${staff_id || 'NONE'} (${date} - ${shift})`);

    return res.json({
      success: true,
      message: 'Station assignment updated successfully.',
      assignment: { date, shift, station_id, staff_id, notes }
    });

  } catch (err) {
    console.error('[FLOORPLAN] Error saving assignment:', err);
    return res.status(500).json({ success: false, message: 'Database error saving station assignment.' });
  }
});

/**
 * POST /api/floorplan/assign-bulk
 * Batch updates table assignments for a date & shift
 */
app.post('/api/floorplan/assign-bulk', requireAuth, async (req, res) => {
  const connection = await dbPool.getConnection();
  try {
    const { date, shift, assignments } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = (date || todayStr).trim();
    const targetShift = (shift || 'Morning').trim();

    if (!Array.isArray(assignments)) {
      return res.status(400).json({ success: false, message: 'Assignments list is required.' });
    }

    await connection.beginTransaction();

    for (const item of assignments) {
      const stationId = (item.station_id || '').trim();
      const staffId = item.staff_id && item.staff_id !== 'none' && item.staff_id !== 'unassigned' ? item.staff_id.trim() : null;
      if (!stationId) continue;

      const asgnId = `asgn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await connection.execute(`
        INSERT INTO \`table_assignments\` (id, date, shift, station_id, staff_id, notes)
        VALUES (?, ?, ?, ?, ?, '')
        ON DUPLICATE KEY UPDATE staff_id = VALUES(staff_id)
      `, [asgnId, targetDate, targetShift, stationId, staffId]);
    }

    await connection.commit();
    return res.json({ success: true, message: 'Floor plan assignments updated successfully.' });

  } catch (err) {
    await connection.rollback();
    console.error('[FLOORPLAN] Error in bulk assign:', err);
    return res.status(500).json({ success: false, message: 'Could not bulk assign tables.' });
  } finally {
    connection.release();
  }
});


// ============================================================================
// PROTECTED APPLICATION API ROUTES
// ============================================================================

/**
 * GET /api/state
 * Returns complete database state (staff, attendance, reminders, settings, security)
 */
app.get('/api/state', requireAuth, async (req, res) => {
  try {
    // 1. Fetch Staff
    const [staffRows] = await dbPool.execute('SELECT id, code, name, station, shift, phone, active FROM `staff` ORDER BY code ASC');
    const staff = staffRows.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      station: s.station || '',
      shift: s.shift || 'Morning',
      phone: s.phone || '',
      active: s.active === 1
    }));

    // 2. Fetch Attendance
    const [attRows] = await dbPool.execute('SELECT DATE_FORMAT(`date`, "%Y-%m-%d") as date_str, staff_id, status, note FROM `attendance`');
    const attendance = {};
    attRows.forEach(row => {
      if (!attendance[row.date_str]) attendance[row.date_str] = {};
      attendance[row.date_str][row.staff_id] = {
        status: row.status,
        note: row.note || ''
      };
    });

    // 3. Fetch Reminders
    const [remRows] = await dbPool.execute('SELECT id, title, due_time, priority, completed, created_at FROM `reminders` ORDER BY created_at DESC');
    const reminders = remRows.map(r => ({
      id: r.id,
      title: r.title,
      dueTime: r.due_time || '10:00',
      priority: r.priority || 'MEDIUM',
      completed: r.completed === 1,
      createdAt: r.created_at
    }));

    // 4. Fetch Settings
    const [setRows] = await dbPool.execute('SELECT setting_key, setting_value FROM `settings`');
    const settings = {
      businessName: 'EXECUTIVE RESTAURANT & BAR',
      branch: 'Main Service Operations'
    };
    setRows.forEach(s => {
      settings[s.setting_key] = s.setting_value;
    });

    // 5. Fetch Security Settings
    const [secRows] = await dbPool.execute('SELECT setting_key, setting_value FROM `security`');
    const security = {
      pin: '1234',
      autoLockMinutes: 5
    };
    secRows.forEach(s => {
      if (s.setting_key === 'autoLockMinutes') {
        security.autoLockMinutes = parseInt(s.setting_value, 10) || 5;
      } else {
        security[s.setting_key] = s.setting_value;
      }
    });

    return res.json({
      success: true,
      state: {
        staff,
        attendance,
        reminders,
        settings,
        security
      },
      manager: req.session.manager
    });
  } catch (err) {
    console.error('[API] /api/state error:', err.message);
    return res.status(500).json({ success: false, error: 'Database read error' });
  }
});

/**
 * POST /api/save
 * Transactional sync of state changes into MySQL
 */
app.post('/api/save', requireAuth, async (req, res) => {
  const connection = await dbPool.getConnection();
  try {
    const { staff, attendance, settings, reminders } = req.body;
    await connection.beginTransaction();

    // 1. Sync Staff
    if (Array.isArray(staff)) {
      for (const s of staff) {
        if (!s || !s.id) continue;
        const [existing] = await connection.execute('SELECT id FROM `staff` WHERE id = ?', [s.id]);
        if (existing.length > 0) {
          await connection.execute(`
            UPDATE \`staff\`
            SET code = ?, name = ?, station = ?, shift = ?, phone = ?, active = ?
            WHERE id = ?
          `, [s.code, s.name, s.station || '', s.shift || 'Morning', s.phone || '', s.active ? 1 : 0, s.id]);
        } else {
          // Check if code doesn't exist before inserting new
          const [codeCheck] = await connection.execute('SELECT id FROM `staff` WHERE code = ?', [s.code]);
          if (codeCheck.length === 0) {
            await connection.execute(`
              INSERT INTO \`staff\` (id, code, name, station, shift, phone, active)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [s.id, s.code, s.name, s.station || '', s.shift || 'Morning', s.phone || '', s.active ? 1 : 0]);
          }
        }
      }
    }

    // 2. Sync Attendance
    if (attendance && typeof attendance === 'object') {
      for (const [dateKey, dayRecords] of Object.entries(attendance)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
        for (const [staffId, att] of Object.entries(dayRecords)) {
          if (!att || !att.status) continue;
          await connection.execute(`
            INSERT INTO \`attendance\` (\`date\`, staff_id, status, note)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              note = VALUES(note)
          `, [dateKey, staffId, att.status, att.note || '']);
        }
      }
    }

    // 3. Sync Settings
    if (settings && typeof settings === 'object') {
      for (const [k, v] of Object.entries(settings)) {
        await connection.execute(`
          INSERT INTO \`settings\` (setting_key, setting_value)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
        `, [k, String(v)]);
      }
    }

    // 4. Sync Reminders
    if (Array.isArray(reminders)) {
      for (const r of reminders) {
        await connection.execute(`
          INSERT INTO \`reminders\` (id, title, due_time, priority, completed)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            due_time = VALUES(due_time),
            priority = VALUES(priority),
            completed = VALUES(completed)
        `, [r.id, r.title, r.dueTime || '10:00', r.priority || 'MEDIUM', r.completed ? 1 : 0]);
      }
    }

    await connection.commit();
    return res.json({ success: true, message: 'State synced to MySQL successfully.' });
  } catch (err) {
    await connection.rollback();
    console.error('[API] /api/save transaction error:', err.message);
    return res.status(500).json({ success: false, error: 'Database write error' });
  } finally {
    connection.release();
  }
});


// ============================================================================
// REMINDER & ALARM SYSTEM API ROUTES (AUTHENTICATED)
// ============================================================================

// Memory store for currently active due alarms waiting for manager interaction
const activeDueAlerts = new Map();

/**
 * GET /api/reminders
 * Fetch all reminders for the manager
 */
app.get('/api/reminders', requireAuth, async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      `SELECT id, manager_id, title, description, 
              DATE_FORMAT(reminder_date, "%Y-%m-%d") as reminder_date, 
              reminder_time, repeat_type, repeat_day, notification_type, 
              is_active, last_triggered, snooze_until, created_at, updated_at 
       FROM reminders 
       ORDER BY reminder_time ASC`
    );
    return res.json({ success: true, reminders: rows });
  } catch (err) {
    console.error('[API] /api/reminders error:', err.message);
    return res.status(500).json({ success: false, error: 'Database read error' });
  }
});

/**
 * POST /api/reminders
 * Create or update a manager reminder
 */
app.post('/api/reminders', requireAuth, async (req, res) => {
  try {
    const {
      id,
      title,
      description,
      reminder_date,
      reminder_time,
      repeat_type,
      repeat_day,
      notification_type,
      is_active
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Reminder title is required.' });
    }

    const cleanTitle = title.trim();
    const cleanDesc = (description || '').trim();
    const cleanTime = reminder_time || '10:00';
    const cleanRepeat = repeat_type || 'one-time';
    const cleanRepeatDay = repeat_day !== undefined && repeat_day !== '' ? String(repeat_day) : null;
    const cleanNotif = notification_type || 'both';
    const cleanActive = is_active === undefined ? 1 : (is_active ? 1 : 0);
    const cleanDate = (cleanRepeat === 'one-time' && reminder_date) ? reminder_date : null;
    const managerId = req.session.manager ? req.session.manager.id : null;

    if (id) {
      // Update existing
      await dbPool.execute(
        `UPDATE reminders SET 
           title = ?, description = ?, reminder_date = ?, reminder_time = ?, 
           repeat_type = ?, repeat_day = ?, notification_type = ?, is_active = ?, 
           snooze_until = NULL 
         WHERE id = ?`,
        [cleanTitle, cleanDesc, cleanDate, cleanTime, cleanRepeat, cleanRepeatDay, cleanNotif, cleanActive, id]
      );
      return res.json({ success: true, message: 'Reminder updated successfully.' });
    } else {
      // Create new
      const newId = 'rem_' + Date.now();
      await dbPool.execute(
        `INSERT INTO reminders 
         (id, manager_id, title, description, reminder_date, reminder_time, repeat_type, repeat_day, notification_type, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, managerId, cleanTitle, cleanDesc, cleanDate, cleanTime, cleanRepeat, cleanRepeatDay, cleanNotif, cleanActive]
      );
      return res.status(201).json({ success: true, message: 'Reminder created successfully.', id: newId });
    }
  } catch (err) {
    console.error('[API] Save reminder error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to save reminder.' });
  }
});

/**
 * DELETE /api/reminders/:id
 * Delete a reminder
 */
app.delete('/api/reminders/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbPool.execute('DELETE FROM reminders WHERE id = ?', [id]);
    activeDueAlerts.delete(id);
    return res.json({ success: true, message: 'Reminder deleted.' });
  } catch (err) {
    console.error('[API] Delete reminder error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete reminder.' });
  }
});

/**
 * POST /api/reminders/:id/snooze
 * Snooze a reminder for 5, 10, or 30 minutes
 */
app.post('/api/reminders/:id/snooze', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const minutes = parseInt(req.body.minutes || 10, 10);
    const validMinutes = [5, 10, 30].includes(minutes) ? minutes : 10;

    await dbPool.execute(
      'UPDATE reminders SET snooze_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [validMinutes, id]
    );

    // Remove from active alerts until snooze expires
    activeDueAlerts.delete(id);
    console.log(`[ALARM] Snoozed reminder ${id} for ${validMinutes} minutes`);
    return res.json({ success: true, message: `Snoozed for ${validMinutes} minutes.` });
  } catch (err) {
    console.error('[API] Snooze error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not snooze reminder.' });
  }
});

/**
 * POST /api/reminders/:id/dismiss
 * Dismiss an active reminder alarm
 */
app.post('/api/reminders/:id/dismiss', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await dbPool.execute(
      'UPDATE reminders SET snooze_until = NULL, last_triggered = NOW() WHERE id = ?',
      [id]
    );
    activeDueAlerts.delete(id);
    return res.json({ success: true, message: 'Reminder dismissed.' });
  } catch (err) {
    console.error('[API] Dismiss error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not dismiss reminder.' });
  }
});

/**
 * GET /api/reminders/due
 * Polled by active manager client to trigger audio chime and modal alarm
 */
app.get('/api/reminders/due', requireAuth, (req, res) => {
  const alerts = Array.from(activeDueAlerts.values());
  return res.json({ success: true, dueReminders: alerts });
});


// ============================================================================
// ATTENDANCE REPORT & WHATSAPP DELIVERY API ROUTES
// ============================================================================

/**
 * GET /api/reports
 * Fetch history of all generated PDF reports
 */
app.get('/api/reports', requireAuth, async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      `SELECT id, report_type, 
              DATE_FORMAT(period_start, "%Y-%m-%d") as period_start, 
              DATE_FORMAT(period_end, "%Y-%m-%d") as period_end, 
              filename, file_size, total_staff, turnout_rate, delivery_status, 
              whatsapp_status, whatsapp_error, generated_at 
       FROM generated_reports 
       ORDER BY generated_at DESC 
       LIMIT 50`
    );
    return res.json({ success: true, reports: rows });
  } catch (err) {
    console.error('[API] /api/reports error:', err.message);
    return res.status(500).json({ success: false, error: 'Database read error' });
  }
});

/**
 * POST /api/reports/generate
 * On-demand report generation trigger (Weekly or Monthly)
 */
app.post('/api/reports/generate', requireAuth, async (req, res) => {
  try {
    const { type, referenceDate } = req.body;
    const reportType = (type || 'WEEKLY').toUpperCase();
    const ref = referenceDate ? new Date(referenceDate) : new Date();

    let result = null;
    if (reportType === 'WEEKLY') {
      result = await generateWeeklyReport(dbPool, ref);
    } else if (reportType === 'MONTHLY') {
      result = await generateMonthlyReport(dbPool, ref.getFullYear(), ref.getMonth());
    } else {
      return res.status(400).json({ success: false, message: 'Invalid report type (WEEKLY or MONTHLY).' });
    }

    // Attempt WhatsApp delivery if enabled in report settings
    const [settingsRows] = await dbPool.execute('SELECT * FROM report_settings WHERE id = 1');
    const repSet = settingsRows[0] || {};
    const shouldSendWA = (reportType === 'WEEKLY' && repSet.weekly_whatsapp === 1) || 
                         (reportType === 'MONTHLY' && repSet.monthly_whatsapp === 1);

    if (shouldSendWA) {
      const baseUrl = process.env.BASE_SERVER_URL || `http://localhost:${PORT}`;
      const downloadUrl = `${baseUrl}/api/reports/${result.reportId}/download`;
      await sendReportNotification({
        reportId: result.reportId,
        reportType,
        periodLabel: result.periodLabel,
        recipientPhone: repSet.whatsapp_number,
        pdfFilename: result.filename,
        downloadUrl,
        dbPool
      });
    }

    return res.status(201).json({
      success: true,
      message: `${reportType} report generated successfully!`,
      report: result
    });
  } catch (err) {
    console.error('[API] On-demand report generation failed:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to generate report: ' + err.message });
  }
});

/**
 * GET /api/reports/:id/download
 * Secure authenticated PDF file download
 */
app.get('/api/reports/:id/download', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await dbPool.execute(
      'SELECT filename, file_path FROM generated_reports WHERE id = ? LIMIT 1',
      [id]
    );

    if (!rows || rows.length === 0) {
      return res.status(404).send('Report not found');
    }

    const report = rows[0];
    if (!fs.existsSync(report.file_path)) {
      return res.status(404).send('Report file no longer exists on server storage');
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    const fileStream = fs.createReadStream(report.file_path);
    fileStream.pipe(res);
  } catch (err) {
    console.error('[API] Report download error:', err.message);
    return res.status(500).send('Error retrieving report file');
  }
});

/**
 * GET /api/reports/settings
 * Fetch schedule & WhatsApp preferences
 */
app.get('/api/reports/settings', requireAuth, async (req, res) => {
  try {
    const [rows] = await dbPool.execute('SELECT * FROM report_settings WHERE id = 1');
    const settings = rows[0] || {
      weekly_enabled: 1,
      weekly_day: 0,
      weekly_time: '18:00',
      weekly_whatsapp: 0,
      monthly_enabled: 1,
      monthly_day: 1,
      monthly_time: '09:00',
      monthly_whatsapp: 0,
      whatsapp_number: ''
    };
    return res.json({ success: true, settings });
  } catch (err) {
    console.error('[API] /api/reports/settings read error:', err.message);
    return res.status(500).json({ success: false, error: 'Database read error' });
  }
});

/**
 * POST /api/reports/settings
 * Save schedule & WhatsApp preferences
 */
app.post('/api/reports/settings', requireAuth, async (req, res) => {
  try {
    const {
      weekly_enabled,
      weekly_day,
      weekly_time,
      weekly_whatsapp,
      monthly_enabled,
      monthly_day,
      monthly_time,
      monthly_whatsapp,
      whatsapp_number
    } = req.body;

    await dbPool.execute(
      `INSERT INTO report_settings 
       (id, weekly_enabled, weekly_day, weekly_time, weekly_whatsapp, monthly_enabled, monthly_day, monthly_time, monthly_whatsapp, whatsapp_number)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         weekly_enabled = VALUES(weekly_enabled),
         weekly_day = VALUES(weekly_day),
         weekly_time = VALUES(weekly_time),
         weekly_whatsapp = VALUES(weekly_whatsapp),
         monthly_enabled = VALUES(monthly_enabled),
         monthly_day = VALUES(monthly_day),
         monthly_time = VALUES(monthly_time),
         monthly_whatsapp = VALUES(monthly_whatsapp),
         whatsapp_number = VALUES(whatsapp_number)`,
      [
        weekly_enabled ? 1 : 0,
        parseInt(weekly_day || 0, 10),
        weekly_time || '18:00',
        weekly_whatsapp ? 1 : 0,
        monthly_enabled ? 1 : 0,
        parseInt(monthly_day || 1, 10),
        monthly_time || '09:00',
        monthly_whatsapp ? 1 : 0,
        (whatsapp_number || '').trim()
      ]
    );

    return res.json({ success: true, message: 'Report settings saved successfully.' });
  } catch (err) {
    console.error('[API] /api/reports/settings save error:', err.message);
    return res.status(500).json({ success: false, message: 'Could not save report settings.' });
  }
});


// ============================================================================
// SERVER-SIDE BACKGROUND SCHEDULER WORKER
// ============================================================================

let schedulerInterval = null;

async function checkSchedulerTick() {
  if (!dbPool) return;
  const now = new Date();
  const currentHHMM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  const todayStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const currentDayOfWeek = now.getDay(); // 0 = Sunday
  const currentDayOfMonth = now.getDate(); // 1-31

  // 1. CHECK DUE REMINDERS
  try {
    const [reminders] = await dbPool.execute(
      `SELECT * FROM reminders 
       WHERE is_active = 1 AND (
         (snooze_until IS NOT NULL AND snooze_until <= NOW()) OR
         (
           (snooze_until IS NULL OR snooze_until <= NOW()) AND
           reminder_time = ? AND
           (
             (repeat_type = 'one-time' AND reminder_date = ? AND (last_triggered IS NULL OR DATE(last_triggered) != ?)) OR
             (repeat_type = 'daily' AND (last_triggered IS NULL OR DATE(last_triggered) != ?)) OR
             (repeat_type = 'weekly' AND (repeat_day = ? OR repeat_day IS NULL) AND (last_triggered IS NULL OR DATE(last_triggered) != ?)) OR
             (repeat_type = 'monthly' AND (repeat_day = ? OR repeat_day IS NULL) AND (last_triggered IS NULL OR DATE(last_triggered) != ?))
           )
         )
       )`,
      [
        cleanTimeCheck(currentHHMM),
        todayStr, todayStr,
        todayStr,
        String(currentDayOfWeek), todayStr,
        String(currentDayOfMonth), todayStr
      ]
    );

    for (const rem of reminders) {
      await dbPool.execute(
        'UPDATE reminders SET last_triggered = NOW(), snooze_until = NULL WHERE id = ?',
        [rem.id]
      );

      activeDueAlerts.set(rem.id, {
        id: rem.id,
        title: rem.title,
        description: rem.description || '',
        reminderTime: rem.reminder_time,
        repeatType: rem.repeat_type,
        notificationType: rem.notification_type || 'both',
        dueAt: new Date().toISOString()
      });

      console.log(`[SCHEDULER] Triggered due reminder: "${rem.title}" at ${currentHHMM}`);
    }
  } catch (err) {
    console.error('[SCHEDULER] Reminders check error:', err.message);
  }

  // 2. CHECK AUTOMATED SCHEDULED REPORTS
  try {
    const [settingsRows] = await dbPool.execute('SELECT * FROM report_settings WHERE id = 1');
    if (settingsRows.length > 0) {
      const repSet = settingsRows[0];

      // A. Weekly Report Schedule (Sunday at weekly_time)
      if (repSet.weekly_enabled === 1 && currentDayOfWeek === repSet.weekly_day && currentHHMM >= repSet.weekly_time) {
        const { monday, sunday } = getWeekRange(now);
        const startStr = monday.toISOString().slice(0, 10);
        const endStr = sunday.toISOString().slice(0, 10);

        const [existing] = await dbPool.execute(
          'SELECT id FROM generated_reports WHERE report_type = "WEEKLY" AND period_start = ? AND period_end = ? LIMIT 1',
          [startStr, endStr]
        );

        if (existing.length === 0) {
          console.log(`[SCHEDULER] Generating scheduled weekly attendance report (${startStr} to ${endStr})...`);
          const repResult = await generateWeeklyReport(dbPool, now);
          console.log(`[SCHEDULER] Weekly report generated: ${repResult.filename}`);

          if (repSet.weekly_whatsapp === 1) {
            const baseUrl = process.env.BASE_SERVER_URL || `http://localhost:${PORT}`;
            const downloadUrl = `${baseUrl}/api/reports/${repResult.reportId}/download`;
            await sendReportNotification({
              reportId: repResult.reportId,
              reportType: 'WEEKLY',
              periodLabel: repResult.periodLabel,
              recipientPhone: repSet.whatsapp_number,
              pdfFilename: repResult.filename,
              downloadUrl,
              dbPool
            });
          }
        }
      }

      // B. Monthly Report Schedule (1st of month at monthly_time)
      if (repSet.monthly_enabled === 1 && currentDayOfMonth === repSet.monthly_day && currentHHMM >= repSet.monthly_time) {
        const prevMonth = now.getMonth() - 1;
        const prevYear = prevMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const adjustedMonthIndex = prevMonth < 0 ? 11 : prevMonth;
        const { start, end } = getMonthRange(prevYear, adjustedMonthIndex);
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);

        const [existing] = await dbPool.execute(
          'SELECT id FROM generated_reports WHERE report_type = "MONTHLY" AND period_start = ? AND period_end = ? LIMIT 1',
          [startStr, endStr]
        );

        if (existing.length === 0) {
          console.log(`[SCHEDULER] Generating scheduled monthly attendance report (${startStr} to ${endStr})...`);
          const repResult = await generateMonthlyReport(dbPool, prevYear, adjustedMonthIndex);
          console.log(`[SCHEDULER] Monthly report generated: ${repResult.filename}`);

          if (repSet.monthly_whatsapp === 1) {
            const baseUrl = process.env.BASE_SERVER_URL || `http://localhost:${PORT}`;
            const downloadUrl = `${baseUrl}/api/reports/${repResult.reportId}/download`;
            await sendReportNotification({
              reportId: repResult.reportId,
              reportType: 'MONTHLY',
              periodLabel: repResult.periodLabel,
              recipientPhone: repSet.whatsapp_number,
              pdfFilename: repResult.filename,
              downloadUrl,
              dbPool
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[SCHEDULER] Reports check error:', err.message);
  }
}

function cleanTimeCheck(hhmm) {
  return hhmm.length === 5 ? hhmm : hhmm.substring(0, 5);
}

function startBackgroundScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  checkSchedulerTick();
  schedulerInterval = setInterval(checkSchedulerTick, 30000); // 30-second interval
  console.log('[SCHEDULER] Background reminder alarm and report cron worker initialized');
}


// ============================================================================
// PAGE ROUTING & SERVER-SIDE ACCESS CONTROL
// ============================================================================

// Public Login Page Route
app.get(['/login', '/login.html'], (req, res) => {
  // If already logged in, redirect straight to dashboard
  if (req.session && req.session.manager) {
    return res.redirect('/');
  }
  setNoCacheHeaders(res);
  return res.sendFile(path.join(__dirname, 'login.html'));
});

// Public Sign Up Page Route
app.get(['/signup', '/signup.html'], (req, res) => {
  if (req.session && req.session.manager) {
    return res.redirect('/');
  }
  setNoCacheHeaders(res);
  return res.sendFile(path.join(__dirname, 'signup.html'));
});

// Protected Root & Dashboard Routes (SERVER-SIDE ENFORCED)
app.get(['/', '/index.html'], (req, res) => {
  setNoCacheHeaders(res);

  // If NOT authenticated, reject immediately and redirect to login
  if (!req.session || !req.session.manager) {
    return res.redirect('/login.html?unauthorized=1');
  }

  // If authenticated, serve protected Dashboard
  return res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve Public Static Assets (CSS, client JS, manifest, Service Worker)
app.use(express.static(path.join(__dirname), {
  index: false, // Prevent serving index.html automatically without requireAuth check
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.html') || filePath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Fallback 404 handler
app.use((req, res) => {
  if (req.accepts('html')) {
    return res.redirect('/login.html');
  }
  return res.status(404).json({ error: 'Endpoint not found' });
});

// Start Server
async function start() {
  await initDatabase();
  startBackgroundScheduler();
  app.listen(PORT, () => {
    console.log(`[SERVER] Executive Register running on http://localhost:${PORT}`);
    console.log(`[AUTH] Manager Login available at http://localhost:${PORT}/login.html`);
  });
}

start();
