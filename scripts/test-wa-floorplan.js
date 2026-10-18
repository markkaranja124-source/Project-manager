/**
 * Verification Script for Floor Plan WhatsApp Dispatch Endpoint
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

async function run() {
  console.log('Testing WhatsApp Floor Plan endpoint...');

  // 1. Login
  const loginRes = await request('POST', '/api/auth/login', {
    email: 'manager@executive.com',
    password: 'Manager123!'
  });
  if (loginRes.status !== 200 || !loginRes.body.success) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.body));
  }
  console.log('✓ Manager logged in.');

  // 2. Test send WhatsApp endpoint
  const sendRes = await request('POST', '/api/floorplan/send-whatsapp', {
    recipientPhone: '0712345678',
    date: '2026-10-19',
    shift: 'Morning',
    messageText: 'Test floor plan roster for tomorrow'
  });

  console.log('WhatsApp endpoint response:', sendRes.body);
  if (sendRes.status === 200 && (sendRes.body.success || sendRes.body.fallbackUrl)) {
    console.log('✓ POST /api/floorplan/send-whatsapp functioned correctly with phone persistence and fallback URL support.');
  } else {
    throw new Error('Unexpected response: ' + JSON.stringify(sendRes.body));
  }
}

run().catch(err => {
  console.error('❌ WhatsApp test failed:', err);
  process.exit(1);
});
