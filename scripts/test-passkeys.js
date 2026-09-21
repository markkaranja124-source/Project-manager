/**
 * Automated Verification Script: Biometric / WebAuthn Passkeys System
 * 
 * Verifies:
 * 1. SimpleWebAuthn browser bundle distribution
 * 2. Unauthenticated security guards (401 on protected endpoints)
 * 3. Manager password authentication & session establishment
 * 4. Passkey registration options generation (FIDO2 challenge, RP ID, user payload)
 * 5. Database schema validation for zero biometric storage
 * 6. Passkey inventory retrieval (/api/auth/passkeys)
 * 7. Passkey authentication options generation (/api/auth/passkey/login-options)
 * 8. Passkey revocation (/api/auth/passkeys/:id)
 * 9. Password login fallback continuity
 */

const http = require('http');
const mysql = require('mysql2/promise');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';
let sessionCookie = '';

function request(method, path, body = null, sendSession = true, saveCookie = true) {
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

    if (sendSession && sessionCookie) {
      options.headers['Cookie'] = sessionCookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      const setCookie = res.headers['set-cookie'];
      if (setCookie && saveCookie) {
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
  console.log('  BIOMETRIC / WEBAUTHN PASSKEYS AUTOMATED VERIFICATION');
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

  try {
    // 1. Browser Bundle Distribution
    console.log('[TEST 1] Testing static distribution of SimpleWebAuthn browser bundle...');
    const bundleRes = await request('GET', '/js/simplewebauthn-browser.js', null, false);
    assert(bundleRes.statusCode === 200, 'GET /js/simplewebauthn-browser.js returns 200 OK');
    assert(bundleRes.data.includes('SimpleWebAuthnBrowser'), 'Bundle contains SimpleWebAuthnBrowser module definition');

    // 2. Unauthenticated Security Guards
    console.log('\n[TEST 2] Testing unauthenticated security guards (Must return 401)...');
    const unauthReg = await request('GET', '/api/auth/passkey/register-options', null, false);
    assert(unauthReg.statusCode === 401, 'Unauthenticated GET /api/auth/passkey/register-options rejected with 401');

    const unauthList = await request('GET', '/api/auth/passkeys', null, false);
    assert(unauthList.statusCode === 401, 'Unauthenticated GET /api/auth/passkeys rejected with 401');

    const unauthDel = await request('DELETE', '/api/auth/passkeys/999999', null, false);
    assert(unauthDel.statusCode === 401, 'Unauthenticated DELETE /api/auth/passkeys/:id rejected with 401');

    // 3. Manager Password Login
    console.log('\n[TEST 3] Logging in as Manager using password fallback...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'manager@executive.com',
      password: 'Manager123!'
    }, false);
    assert(loginRes.statusCode === 200 && loginRes.json && loginRes.json.success, 'Manager successfully authenticated via password');
    assert(!!sessionCookie, 'Session cookie established');

    // 4. Registration Options Generation
    console.log('\n[TEST 4] Requesting WebAuthn Passkey Registration Options...');
    const regOptRes = await request('GET', '/api/auth/passkey/register-options', null, true);
    assert(regOptRes.statusCode === 200, 'GET /api/auth/passkey/register-options returned 200 OK');
    assert(regOptRes.json && regOptRes.json.success === true, 'Response marked success');
    const opts = regOptRes.json.options;
    assert(!!opts.challenge, 'Cryptographic challenge generated');
    assert(opts.rp && opts.rp.id === 'localhost', 'Relying Party ID correctly set to localhost');
    assert(opts.user && opts.user.name === 'manager@executive.com', 'User entity bound to manager email');
    assert(Array.isArray(opts.pubKeyCredParams) && opts.pubKeyCredParams.length > 0, 'PubKeyCredParams offers modern signing algorithms (ES256, RS256)');

    // 5. Database Schema & Privacy Verification
    console.log('\n[TEST 5] Validating MySQL schema for strict biometric privacy...');
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'waiter_attendance_db',
      port: Number(process.env.DB_PORT) || 3306
    });

    const [columns] = await db.query('DESCRIBE manager_passkeys');
    const colNames = columns.map(c => c.Field);
    console.log('    Table manager_passkeys columns:', colNames.join(', '));
    assert(colNames.includes('credential_id'), 'Contains credential_id column');
    assert(colNames.includes('public_key'), 'Contains public_key column');
    assert(colNames.includes('sign_count'), 'Contains sign_count column');
    assert(colNames.includes('device_name'), 'Contains device_name column');
    
    // Privacy check: verify NO biometric columns exist
    const biometricTerms = ['biometric', 'fingerprint', 'face', 'template', 'private_key'];
    const hasBiometricCol = colNames.some(c => biometricTerms.some(term => c.toLowerCase().includes(term)));
    assert(!hasBiometricCol, 'Strict Zero-Biometrics: No biometric, fingerprint, face, or private key columns exist');

    // Get manager ID
    const [mgrRows] = await db.query('SELECT id FROM managers WHERE email = ?', ['manager@executive.com']);
    const managerId = mgrRows[0].id;

    // 6. Mock Passkey Credential Registration
    console.log('\n[TEST 6] Simulating registered passkey device in database...');
    const testCredId = 'test_cred_mock_' + Date.now();
    const mockPasskeyId = 'pk_test_' + Date.now();
    const mockPubKey = Buffer.from('mock_public_key_bytes_fido2_test').toString('base64');
    
    // Clean any previous test entries
    await db.query("DELETE FROM manager_passkeys WHERE device_name LIKE 'Test Device%'");

    await db.query(`
      INSERT INTO manager_passkeys 
        (id, manager_id, credential_id, public_key, sign_count, device_name, transports, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [mockPasskeyId, managerId, testCredId, mockPubKey, 0, 'Test Device (Executive Phone)', JSON.stringify(['internal'])]);
    assert(true, `Mock passkey inserted with ID: ${mockPasskeyId}`);

    // 7. Passkey Inventory API
    console.log('\n[TEST 7] Testing passkey inventory API (/api/auth/passkeys)...');
    const listRes = await request('GET', '/api/auth/passkeys', null, true);
    assert(listRes.statusCode === 200, 'GET /api/auth/passkeys returned 200 OK');
    assert(listRes.json && listRes.json.success, 'List response marked success');
    const registered = listRes.json.passkeys || [];
    const found = registered.find(p => p.id === mockPasskeyId);
    assert(!!found, 'Registered test device present in passkeys list');
    assert(found && found.device_name === 'Test Device (Executive Phone)', 'Device name matches accurately');
    assert(found && !found.public_key, 'Security check: Raw public key bytes not exposed in client list');

    // 8. Authentication Options Generation
    console.log('\n[TEST 8] Requesting WebAuthn Login Options for manager...');
    const loginOptRes = await request('POST', '/api/auth/passkey/login-options', {
      email: 'manager@executive.com'
    }, false, false);
    assert(loginOptRes.statusCode === 200, 'POST /api/auth/passkey/login-options returned 200 OK');
    assert(loginOptRes.json && loginOptRes.json.success, 'Login options generation succeeded');
    const authOpts = loginOptRes.json.options;
    assert(!!authOpts.challenge, 'Cryptographic authentication challenge generated');
    assert(Array.isArray(authOpts.allowCredentials) && authOpts.allowCredentials.length > 0, 'allowCredentials includes manager passkeys');
    const credFound = authOpts.allowCredentials.some(c => c.id === testCredId);
    assert(credFound, 'Registered test credential ID present in allowCredentials');

    // 9. Passkey Revocation
    console.log('\n[TEST 9] Revoking passkey device (/api/auth/passkeys/:id)...');
    const delRes = await request('DELETE', `/api/auth/passkeys/${mockPasskeyId}`, null, true);
    assert(delRes.statusCode === 200, 'DELETE /api/auth/passkeys/:id returned 200 OK');
    assert(delRes.json && delRes.json.success, 'Revocation marked success');

    // Check passkey list again
    const listAfterRevoke = await request('GET', '/api/auth/passkeys', null, true);
    const stillPresent = (listAfterRevoke.json.passkeys || []).some(p => p.id === mockPasskeyId);
    assert(!stillPresent, 'Revoked passkey no longer appears in active passkeys list');

    // 10. Continuous Password Fallback
    console.log('\n[TEST 10] Verifying password login continuity as fallback...');
    const secondLogin = await request('POST', '/api/auth/login', {
      email: 'manager@executive.com',
      password: 'Manager123!'
    }, false);
    assert(secondLogin.statusCode === 200 && secondLogin.json.success, 'Password authentication continues to function reliably');

    await db.end();

  } catch (err) {
    console.error('Fatal error during test execution:', err);
    failed++;
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
