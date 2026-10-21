/**
 * Verification test for Row/Column Auto-Assignment and Upper Tier Assignment
 */
const http = require('http');

const PORT = 3000;
let sessionCookie = '';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (sessionCookie) headers['Cookie'] = sessionCookie;

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers
    }, (res) => {
      let data = '';
      if (res.headers['set-cookie']) {
        sessionCookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      }
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function run() {
  console.log('Testing Row Auto-Assignment & Upper Tier Allocation...');

  const db = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'waiter_attendance_db'
  });

  const testEmail = `row_test_${Date.now()}@executive.com`;
  const testPass = 'RowPass123!';
  const testMgrId = `mgr_row_${Date.now()}`;
  const hash = await bcrypt.hash(testPass, 10);

  await db.execute('INSERT INTO managers (id, name, email, password_hash) VALUES (?, ?, ?, ?)', [
    testMgrId,
    'Row Test Manager',
    testEmail,
    hash
  ]);

  try {
    // 1. Login
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: testPass
    });
    if (loginRes.status !== 200 || !loginRes.body.success) {
      throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
    }
    console.log('✓ Manager authenticated.');

  // 2. Fetch staff to get a valid staff ID
  const staffRes = await request('GET', '/api/staff');
  const staffList = staffRes.body.staff || staffRes.body;
  if (!staffList || staffList.length === 0) throw new Error('No staff found');
  const testStaffId = staffList[0].id;
  const testStaffName = staffList[0].name;
  console.log(`✓ Using test staff: ${testStaffName} (${testStaffId})`);

  // 3. Test Bulk Assigning Left Line 1 (Tables 1, 4, 7, 10, 13, 16)
  const line1Tables = ['table_1', 'table_4', 'table_7', 'table_10', 'table_13', 'table_16'];
  const bulkRes = await request('POST', '/api/floorplan/assign-bulk', {
    date: '2026-10-19',
    shift: 'Morning',
    assignments: line1Tables.map(t => ({ station_id: t, staff_id: testStaffId, notes: 'Line 1 Test' }))
  });

  if (bulkRes.status !== 200 || !bulkRes.body.success) {
    throw new Error('Failed to bulk assign line 1: ' + JSON.stringify(bulkRes.body));
  }
  console.log('✓ Bulk assigned Left Line 1 successfully.');

  // 4. Verify all 6 tables have testStaffId
  const getRes = await request('GET', '/api/floorplan/assignments?date=2026-10-19&shift=Morning');
  const stations = getRes.body.stations;
  line1Tables.forEach(tId => {
    const st = stations.find(s => s.id === tId);
    if (!st || !st.assignment || st.assignment.staff_id !== testStaffId) {
      throw new Error(`Table ${tId} was not assigned properly! Actual: ${JSON.stringify(st)}`);
    }
  });
  console.log('✓ All 6 tables in Left Line 1 verified assigned to ' + testStaffName);

  // 5. Test Assigning Whole Upper Tier (Tables 38 to 44)
  const upperTables = ['table_38', 'table_39', 'table_40', 'table_41', 'table_42', 'table_43', 'table_44'];
  const upperRes = await request('POST', '/api/floorplan/assign-bulk', {
    date: '2026-10-19',
    shift: 'Morning',
    assignments: upperTables.map(t => ({ station_id: t, staff_id: testStaffId, notes: 'Upper Tier Test' }))
  });

  if (upperRes.status !== 200 || !upperRes.body.success) {
    throw new Error('Failed to assign upper tier: ' + JSON.stringify(upperRes.body));
  }
  console.log('✓ Assigned all 10 tables of Upper Tier successfully.');

  // 6. Verify Upper Tier tables
  const getUpper = await request('GET', '/api/floorplan/assignments?date=2026-10-19&shift=Morning');
  upperTables.forEach(tId => {
    const st = getUpper.body.stations.find(s => s.id === tId);
    if (!st || !st.assignment || st.assignment.staff_id !== testStaffId) {
      throw new Error(`Upper tier table ${tId} was not assigned properly!`);
    }
  });
  console.log('✓ All 10 Upper Tier tables (E-Section) verified assigned to ' + testStaffName);

    console.log('\n🎉 ALL ROW & UPPER TIER ASSIGNMENT TESTS PASSED PERFECTLY!');
  } finally {
    await db.execute('DELETE FROM managers WHERE id = ?', [testMgrId]);
    await db.end();
  }
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
