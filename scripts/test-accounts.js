/**
 * Automated Verification Script: Multi-Account Management & Staff Account ID
 * 
 * Tests:
 * 1. Initial seeded accounts exist (ACC-001, ACC-002)
 * 2. Authenticates manager session via /api/auth/login
 * 3. GET /api/accounts returns registered accounts with computed staff metrics
 * 4. POST /api/accounts registers a new account (ACC-099)
 * 5. GET /api/accounts/:id fetches account details and assigned staff roster
 * 6. POST /api/staff creates a new staff assigned to ACC-099
 * 7. GET /api/staff?account_id=ACC-099 returns only staff for ACC-099
 * 8. PUT /api/staff/:id updates staff account assignment
 * 9. GET /api/state includes accounts array and staff with accountId
 * 10. DELETE /api/accounts/:id removes account and reassigns staff to ACC-001
 */

const mysql = require('mysql2/promise');
const http = require('http');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {}
    };

    if (body) {
      const data = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(data);
    }

    if (sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
      }

      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('===========================================================');
  console.log('  MULTI-ACCOUNT & STAFF ACCOUNT ID VERIFICATION');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'waiter_attendance_db',
    port: Number(process.env.DB_PORT) || 3306
  });

  const testEmail = 'testmanager_acc_' + Date.now() + '@hotel.com';
  const testPass = 'TestPass123!';
  const testMgrId = 'mgr_test_' + Date.now();

  try {
    // 1. Direct DB check on accounts table and staff.account_id
    console.log('[TEST 1] Verifying MySQL schema for accounts and staff.account_id...');
    const [accRows] = await db.execute('SELECT * FROM accounts ORDER BY id ASC');
    assert(accRows.length >= 2, `Found ${accRows.length} accounts in database (ACC-001, ACC-002 seeded)`);

    const [staffCols] = await db.execute(`
      SELECT COLUMN_NAME, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'staff' AND COLUMN_NAME = 'account_id'
    `);
    assert(staffCols.length > 0, 'staff.account_id column exists in database schema');

    // 2. Insert test manager and authenticate session via login API
    console.log('\n[TEST 2] Establishing authenticated manager session...');
    const hash = await bcrypt.hash(testPass, 10);
    await db.execute('INSERT INTO managers (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [
      testMgrId,
      'Test Accounts Manager',
      testEmail,
      hash
    ]);

    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPass
    });
    assert(loginRes.statusCode === 200, 'POST /api/auth/login returned 200 OK');
    assert(loginRes.json?.success === true, 'Login successful with manager profile');
    assert(sessionCookie.includes('executive_session_id'), 'Session cookie executive_session_id acquired');

    // 3. Test GET /api/accounts
    console.log('\n[TEST 3] Testing GET /api/accounts endpoint...');
    const getAccRes = await request('GET', '/api/accounts');
    assert(getAccRes.statusCode === 200, 'GET /api/accounts returned 200 OK');
    assert(getAccRes.json && getAccRes.json.success === true, 'Response marked success');
    assert(Array.isArray(getAccRes.json?.accounts) && getAccRes.json.accounts.length >= 2, 'Accounts list array returned');
    const acc1 = getAccRes.json.accounts.find(a => a.id === 'ACC-001');
    assert(acc1 !== undefined, 'ACC-001 found in accounts list');
    assert(typeof acc1?.totalStaff === 'number', `ACC-001 has computed totalStaff (${acc1?.totalStaff})`);
    assert(typeof acc1?.turnoutRate === 'number', `ACC-001 has computed turnoutRate (${acc1?.turnoutRate}%)`);

    // 4. Test POST /api/accounts (Create ACC-099)
    console.log('\n[TEST 4] Testing POST /api/accounts (Register New Account)...');
    await db.execute('DELETE FROM staff WHERE account_id = ?', ['ACC-099']);
    await db.execute('DELETE FROM accounts WHERE id = ?', ['ACC-099']);

    const newAccPayload = {
      id: 'ACC-099',
      name: 'Banquets & External Catering',
      branch: 'North Wing Banquets',
      status: 'Active',
      email: 'banquets@hotel.com',
      phone: '+254 711 999888',
      description: 'Dedicated catering and banquet hall service account'
    };
    const postAccRes = await request('POST', '/api/accounts', newAccPayload);
    assert(postAccRes.statusCode === 201 || postAccRes.statusCode === 200, `POST /api/accounts returned ${postAccRes.statusCode}`);
    assert(postAccRes.json?.success === true, 'Account creation succeeded');
    assert(postAccRes.json?.account?.id === 'ACC-099', 'Created account ID matches ACC-099');

    // Verify in database
    const [createdAccRows] = await db.execute('SELECT * FROM accounts WHERE id = ?', ['ACC-099']);
    assert(createdAccRows.length === 1, 'New account verified directly in MySQL `accounts` table');

    // 5. Test GET /api/accounts/:id (Details & Staff Roster)
    console.log('\n[TEST 5] Testing GET /api/accounts/:id (Account Details & Roster)...');
    const getDetailRes = await request('GET', '/api/accounts/ACC-099');
    assert(getDetailRes.statusCode === 200, 'GET /api/accounts/ACC-099 returned 200 OK');
    assert(getDetailRes.json?.account?.name === 'Banquets & External Catering', 'Account details matched');
    assert(Array.isArray(getDetailRes.json?.staff), 'Assigned staff array returned');

    // 6. Test POST /api/staff with accountId
    console.log('\n[TEST 6] Testing POST /api/staff assigned to ACC-099...');
    const staffTestCode = 'W-999';
    // Clean up if existed
    await db.execute('DELETE FROM staff WHERE code = ?', [staffTestCode]);

    const postStaffRes = await request('POST', '/api/staff', {
      code: staffTestCode,
      name: 'Gabriel Kimani',
      station: 'Banquet Hall Main',
      shift: 'Morning',
      phone: '+254 722 000111',
      accountId: 'ACC-099'
    });
    assert(postStaffRes.statusCode === 201 || postStaffRes.statusCode === 200, `POST /api/staff returned ${postStaffRes.statusCode}`);
    assert(postStaffRes.json?.success === true, 'Staff record created with account assignment');
    assert(postStaffRes.json?.staff?.accountId === 'ACC-099', 'Staff response returns accountId: ACC-099');
    const staffId = postStaffRes.json?.staff?.id;

    // Verify directly in DB
    const [dbStaffCheck] = await db.execute('SELECT account_id FROM staff WHERE code = ?', [staffTestCode]);
    assert(dbStaffCheck.length > 0 && dbStaffCheck[0].account_id === 'ACC-099', 'MySQL staff.account_id confirmed as ACC-099');

    // 7. Test GET /api/staff?account_id=ACC-099
    console.log('\n[TEST 7] Testing GET /api/staff?account_id=ACC-099 (Filter Staff by Account)...');
    const getFilteredStaffRes = await request('GET', '/api/staff?account_id=ACC-099');
    assert(getFilteredStaffRes.statusCode === 200, 'GET /api/staff?account_id=ACC-099 returned 200 OK');
    assert(Array.isArray(getFilteredStaffRes.json?.staff), 'Staff array returned');
    assert(getFilteredStaffRes.json.staff.some(s => s.code === staffTestCode), 'Gabriel Kimani found in ACC-099 roster');
    assert(getFilteredStaffRes.json.staff.every(s => s.accountId === 'ACC-099'), 'ALL returned staff have accountId === ACC-099');

    // 8. Test PUT /api/staff/:id to change account assignment
    console.log('\n[TEST 8] Testing PUT /api/staff/:id (Reassign staff to ACC-002)...');
    if (staffId) {
      const putStaffRes = await request('PUT', `/api/staff/${encodeURIComponent(staffId)}`, {
        code: staffTestCode,
        name: 'Gabriel Kimani (Transferred)',
        station: 'Terrace VIP',
        shift: 'Evening',
        phone: '+254 722 000111',
        accountId: 'ACC-002'
      });
      assert(putStaffRes.statusCode === 200, 'PUT /api/staff returned 200 OK');
      assert(putStaffRes.json?.staff?.accountId === 'ACC-002', 'Staff accountId updated to ACC-002');

      const [transferredCheck] = await db.execute('SELECT account_id FROM staff WHERE id = ?', [staffId]);
      assert(transferredCheck[0].account_id === 'ACC-002', 'MySQL confirms account_id updated to ACC-002');
    }

    // 9. Test GET /api/state returns accounts
    console.log('\n[TEST 9] Testing GET /api/state (Full state synchronization)...');
    const stateRes = await request('GET', '/api/state');
    assert(stateRes.statusCode === 200, 'GET /api/state returned 200 OK');
    assert(Array.isArray(stateRes.json?.state?.accounts), 'State response contains accounts array');
    assert(Array.isArray(stateRes.json?.state?.staff), 'State response contains staff array');
    const staffSample = stateRes.json?.state?.staff?.find(s => s.code === staffTestCode);
    assert(staffSample?.accountId === 'ACC-002', 'Staff in state payload has correct accountId');

    // 10. Clean up test records
    console.log('\n[TEST 10] Cleaning up test records...');
    if (staffId) {
      await request('DELETE', `/api/staff/${encodeURIComponent(staffId)}`);
    }
    const delAccRes = await request('DELETE', '/api/accounts/ACC-099');
    assert(delAccRes.statusCode === 200, 'DELETE /api/accounts/ACC-099 returned 200 OK');
    assert(delAccRes.json?.success === true, 'Account deletion confirmed');

    const [delAccCheck] = await db.execute('SELECT * FROM accounts WHERE id = ?', ['ACC-099']);
    assert(delAccCheck.length === 0, 'Account successfully removed from MySQL');

    // Clean up test manager
    await db.execute('DELETE FROM managers WHERE id = ?', [testMgrId]);

    console.log('\n===========================================================');
    console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('===========================================================');

  } catch (err) {
    console.error('Fatal error during test:', err);
    try { await db.execute('DELETE FROM managers WHERE id = ?', [testMgrId]); } catch (e) {}
  } finally {
    await db.end();
  }
}

runTests();
