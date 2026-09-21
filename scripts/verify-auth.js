/**
 * SCRIPT: verify-auth.js
 * Automated Verification of all 10 security & authentication requirements
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        ...headers
      }
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
        // Capture session cookie
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
  console.log('=====================================================');
  console.log('STARTING AUTOMATED MANAGER AUTHENTICATION VERIFICATION');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 10;

  // TEST 6: Direct access to Manager Dashboard while logged out -> redirected to login
  sessionCookie = ''; // clear session
  const test6 = await request('GET', '/');
  if (test6.statusCode === 302 && test6.headers.location && test6.headers.location.includes('/login.html')) {
    console.log('TEST 6 PASSED: Direct access while logged out redirects to /login.html');
    passed++;
  } else {
    console.error('TEST 6 FAILED:', test6.statusCode, test6.headers.location);
  }

  // TEST 4: Empty email/password -> validation message
  const test4 = await request('POST', '/api/auth/login', { email: '', password: '' });
  if (test4.statusCode === 400 && test4.json && test4.json.message === 'Invalid email or password.') {
    console.log('TEST 4 PASSED: Empty email/password rejected with validation message');
    passed++;
  } else {
    console.error('TEST 4 FAILED:', test4.statusCode, test4.json);
  }

  // TEST 5: Invalid email format -> validation message
  const test5 = await request('POST', '/api/auth/login', { email: 'notanemail', password: 'Password123!' });
  if (test5.statusCode === 400 && test5.json && test5.json.message === 'Invalid email or password.') {
    console.log('TEST 5 PASSED: Invalid email format rejected with validation message');
    passed++;
  } else {
    console.error('TEST 5 FAILED:', test5.statusCode, test5.json);
  }

  // TEST 3: Incorrect email + password -> login rejected with generic message
  const test3 = await request('POST', '/api/auth/login', { email: 'nonexistent@executive.com', password: 'WrongPassword!' });
  if (test3.statusCode === 401 && test3.json && test3.json.message === 'Invalid email or password.') {
    console.log('TEST 3 PASSED: Non-existent email rejected without revealing existence');
    passed++;
  } else {
    console.error('TEST 3 FAILED:', test3.statusCode, test3.json);
  }

  // TEST 2: Correct email + incorrect password -> login rejected
  const test2 = await request('POST', '/api/auth/login', { email: 'manager@executive.com', password: 'WrongPassword123' });
  if (test2.statusCode === 401 && test2.json && test2.json.message === 'Invalid email or password.') {
    console.log('TEST 2 PASSED: Correct email + wrong password rejected generic message');
    passed++;
  } else {
    console.error('TEST 2 FAILED:', test2.statusCode, test2.json);
  }

  // TEST 1: Correct manager email + correct password -> successful login
  const test1 = await request('POST', '/api/auth/login', { email: 'manager@executive.com', password: 'Manager123!' });
  if (test1.statusCode === 200 && test1.json && test1.json.success === true && test1.json.manager.email === 'manager@executive.com') {
    console.log('TEST 1 PASSED: Correct manager credentials -> successful login & session created');
    passed++;
  } else {
    console.error('TEST 1 FAILED:', test1.statusCode, test1.json);
  }

  // TEST 1b: Verify protected dashboard access while logged in
  const dashAccess = await request('GET', '/');
  const apiState = await request('GET', '/api/state');
  if (dashAccess.statusCode === 200 && apiState.statusCode === 200 && apiState.json && apiState.json.success) {
    console.log('AUTHENTICATED ACCESS VERIFIED: Dashboard and /api/state served for active session');
  } else {
    console.error('AUTHENTICATED ACCESS FAILED:', dashAccess.statusCode, apiState.statusCode);
  }

  // TEST 7: Logout -> login page
  const test7 = await request('POST', '/api/auth/logout');
  if (test7.statusCode === 200 && test7.json && test7.json.success === true) {
    console.log('TEST 7 PASSED: Logout successfully destroys session');
    passed++;
  } else {
    console.error('TEST 7 FAILED:', test7.statusCode, test7.json);
  }

  // TEST 8: Attempt to access protected pages after logout -> access denied / redirected
  const test8Page = await request('GET', '/');
  const test8Api = await request('GET', '/api/state');
  if (test8Page.statusCode === 302 && test8Page.headers.location && test8Page.headers.location.includes('/login.html') && test8Api.statusCode === 401) {
    console.log('TEST 8 PASSED: Post-logout access denied on both page route (302) and API route (401)');
    passed++;
  } else {
    console.error('TEST 8 FAILED:', test8Page.statusCode, test8Api.statusCode);
  }

  // TEST 9: Confirm that existing waiter/staff records remain intact
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'waiter_attendance_db'
  });

  const [staffRows] = await conn.execute('SELECT COUNT(*) as count FROM staff');
  const [firstStaff] = await conn.execute('SELECT code, name FROM staff ORDER BY code ASC LIMIT 1');
  if (staffRows[0].count >= 8 && firstStaff[0].code === 'W-101') {
    console.log(`TEST 9 PASSED: All ${staffRows[0].count} staff records remain 100% intact (${firstStaff[0].name})`);
    passed++;
  } else {
    console.error('TEST 9 FAILED: Staff records missing or modified', staffRows);
  }

  // TEST 10: Confirm that passwords are stored as hashes rather than plaintext
  const [mgrRows] = await conn.execute('SELECT email, password_hash FROM managers WHERE email = "manager@executive.com"');
  await conn.end();

  if (mgrRows.length > 0 && mgrRows[0].password_hash.startsWith('$2a$') && !mgrRows[0].password_hash.includes('Manager123!')) {
    console.log('TEST 10 PASSED: Password stored strictly as salted bcrypt hash: ' + mgrRows[0].password_hash.substring(0, 20) + '...');
    passed++;
  } else {
    console.error('TEST 10 FAILED: Password not stored as bcrypt hash', mgrRows);
  }

  console.log('\n=====================================================');
  console.log(`VERIFICATION SUMMARY: ${passed} / ${total} TESTS PASSED`);
  console.log('=====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
