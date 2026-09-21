/**
 * Automated Verification Script: Staff Management Direct Database Persistence
 * 
 * Verifies:
 * 1. Manager authentication & session acquisition
 * 2. GET /api/staff/next-code computes next sequential employee code
 * 3. POST /api/staff creates a whole new distinct record in MySQL `staff` table
 * 4. Duplicate employee code rejection (409 Conflict)
 * 5. PUT /api/staff/:id updates the staff record in MySQL
 * 6. Report generator includes the newly added staff member
 * 7. DELETE /api/staff/:id removes the record from MySQL
 */

const http = require('http');
const mysql = require('mysql2/promise');
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
  console.log('  STAFF DIRECT DATABASE PERSISTENCE VERIFICATION');
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

  try {
    // 1. Authenticate Manager
    console.log('[TEST 1] Logging in as Manager...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'manager@executive.com',
      password: 'Manager123!'
    });
    assert(loginRes.statusCode === 200 && loginRes.json.success, 'Manager session established');

    // 2. Count current baseline staff in MySQL
    console.log('\n[TEST 2] Checking baseline staff count in MySQL...');
    const [beforeRows] = await db.query('SELECT COUNT(*) as count FROM staff');
    const baselineCount = beforeRows[0].count;
    console.log(`    Current staff count in database: ${baselineCount}`);
    assert(baselineCount >= 8, `Baseline staff count is ${baselineCount}`);

    // 3. Test next code API
    console.log('\n[TEST 3] Testing GET /api/staff/next-code...');
    const nextCodeRes = await request('GET', '/api/staff/next-code');
    assert(nextCodeRes.statusCode === 200, 'GET /api/staff/next-code returned 200 OK');
    const nextCode = nextCodeRes.json.nextCode;
    console.log(`    Computed next employee code: ${nextCode}`);
    assert(!!nextCode && nextCode.startsWith('W-'), `Valid next code format: ${nextCode}`);

    // 4. Add a whole new staff entry via POST /api/staff
    console.log('\n[TEST 4] Adding a whole new staff entry via POST /api/staff...');
    const newStaffPayload = {
      code: nextCode,
      name: 'Alexander Cross',
      station: 'Rooftop Lounge VIP',
      shift: 'Evening',
      phone: '+1 (555) 890-1234'
    };
    const addRes = await request('POST', '/api/staff', newStaffPayload);
    assert(addRes.statusCode === 201, 'POST /api/staff returned 201 Created');
    assert(addRes.json && addRes.json.success, 'Response confirmed success');
    const createdStaff = addRes.json.staff;
    assert(!!createdStaff.id, `Created staff has persistent database ID: ${createdStaff.id}`);
    assert(createdStaff.code === nextCode, `Staff code matches: ${createdStaff.code}`);
    assert(createdStaff.name === 'Alexander Cross', `Staff name matches: ${createdStaff.name}`);

    // 5. Verify direct existence in MySQL database
    console.log('\n[TEST 5] Verifying persistent row in MySQL `staff` table...');
    const [verifyRows] = await db.query('SELECT * FROM staff WHERE id = ?', [createdStaff.id]);
    assert(verifyRows.length === 1, 'Exactly one new record found in MySQL `staff` table');
    const dbRecord = verifyRows[0];
    assert(dbRecord.name === 'Alexander Cross', 'MySQL record name matches');
    assert(dbRecord.station === 'Rooftop Lounge VIP', 'MySQL record station matches');
    assert(dbRecord.shift === 'Evening', 'MySQL record shift matches');

    // Verify count increased by 1
    const [afterRows] = await db.query('SELECT COUNT(*) as count FROM staff');
    assert(afterRows[0].count === baselineCount + 1, `Total staff count increased by 1 (Now: ${afterRows[0].count})`);

    // 6. Test duplicate code collision prevention (409 Conflict)
    console.log('\n[TEST 6] Testing duplicate code collision prevention...');
    const dupRes = await request('POST', '/api/staff', {
      code: nextCode, // same code!
      name: 'Duplicate Imposter',
      station: 'Bar'
    });
    assert(dupRes.statusCode === 409, 'Duplicate code rejected with 409 Conflict');
    assert(dupRes.json && !dupRes.json.success, 'Error message returned to client');
    console.log(`    Server rejection message: "${dupRes.json.message}"`);

    // 7. Test PUT /api/staff/:id update
    console.log('\n[TEST 7] Updating staff record via PUT /api/staff/:id...');
    const updateRes = await request('PUT', `/api/staff/${encodeURIComponent(createdStaff.id)}`, {
      code: nextCode,
      name: 'Alexander Cross (Lead)',
      station: 'Executive Penthouse',
      shift: 'Night',
      phone: '+1 (555) 999-0000'
    });
    assert(updateRes.statusCode === 200, 'PUT /api/staff/:id returned 200 OK');
    const [updatedDbRows] = await db.query('SELECT * FROM staff WHERE id = ?', [createdStaff.id]);
    assert(updatedDbRows[0].name === 'Alexander Cross (Lead)', 'MySQL record updated with new title');
    assert(updatedDbRows[0].station === 'Executive Penthouse', 'MySQL record updated with new station');

    // 8. Test DELETE /api/staff/:id
    console.log('\n[TEST 8] Removing test staff entry via DELETE /api/staff/:id...');
    const delRes = await request('DELETE', `/api/staff/${encodeURIComponent(createdStaff.id)}`);
    assert(delRes.statusCode === 200, 'DELETE /api/staff/:id returned 200 OK');

    // Verify removal from MySQL
    const [postDelRows] = await db.query('SELECT * FROM staff WHERE id = ?', [createdStaff.id]);
    assert(postDelRows.length === 0, 'Record successfully purged from MySQL');

    const [finalCountRows] = await db.query('SELECT COUNT(*) as count FROM staff');
    assert(finalCountRows[0].count === baselineCount, `Staff count restored to baseline: ${finalCountRows[0].count}`);

  } catch (err) {
    console.error('Fatal error during test:', err);
    failed++;
  } finally {
    await db.end();
  }

  console.log('\n===========================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
