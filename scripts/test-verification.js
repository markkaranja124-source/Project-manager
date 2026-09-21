/**
 * Verification Test Script: Reminders & Automatic Reports System
 */

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING VERIFICATION TESTS ===\n');
  let cookie = '';

  // 1. Unauthenticated request to /api/reminders should return 401
  console.log('Test 1: Unauthenticated protection check...');
  const unauthRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reminders',
    method: 'GET'
  });
  if (unauthRes.statusCode === 401) {
    console.log('✓ PASS: Unauthenticated access blocked with 401');
  } else {
    console.error(`✗ FAIL: Expected 401, got ${unauthRes.statusCode}`);
  }

  // 2. Manager Login
  console.log('\nTest 2: Manager Authentication...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'manager@executive.com', password: 'Manager123!' });

  if (loginRes.statusCode === 200) {
    const setCookie = loginRes.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      cookie = setCookie[0].split(';')[0];
      console.log('✓ PASS: Manager login successful, session cookie acquired:', cookie);
    } else {
      console.error('✗ FAIL: No session cookie returned');
    }
  } else {
    console.error('✗ FAIL: Login failed:', loginRes.body);
  }

  // 3. Create a Reminder
  console.log('\nTest 3: Create Reminder with Repeat & Notification Settings...');
  const createReminderRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reminders',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, {
    title: 'Verify Friday Evening Roster & Absentee Register',
    description: 'Audit service stations, ensure 8 active waiters marked, verify tip pool ledger',
    reminder_date: new Date().toISOString().substring(0, 10),
    reminder_time: '18:00',
    repeat_type: 'weekly',
    repeat_day: 5,
    notification_type: 'both',
    is_active: 1
  });

  let createdReminderId = null;
  const createReminderData = JSON.parse(createReminderRes.body);
  if ((createReminderRes.statusCode === 200 || createReminderRes.statusCode === 201) && createReminderData.success) {
    createdReminderId = createReminderData.id;
    console.log(`✓ PASS: Reminder created with ID: ${createdReminderId}`);
  } else {
    console.error('✗ FAIL: Reminder creation failed:', createReminderRes.body);
  }

  // 4. List Reminders
  console.log('\nTest 4: List Reminders...');
  const listRemindersRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reminders',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  const listRemindersData = JSON.parse(listRemindersRes.body);
  if (listRemindersData.success && Array.isArray(listRemindersData.reminders)) {
    console.log(`✓ PASS: Retrieved ${listRemindersData.reminders.length} reminders from database`);
  } else {
    console.error('✗ FAIL: List reminders failed:', listRemindersRes.body);
  }

  // 5. Test Snooze Reminder
  if (createdReminderId) {
    console.log('\nTest 5: Snooze Reminder for 10 minutes...');
    const snoozeRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/reminders/${createdReminderId}/snooze`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    }, { minutes: 10 });
    const snoozeData = JSON.parse(snoozeRes.body);
    if (snoozeData.success) {
      console.log(`✓ PASS: Reminder snoozed until: ${snoozeData.snooze_until}`);
    } else {
      console.error('✗ FAIL: Snooze failed:', snoozeRes.body);
    }

    // 6. Test Dismiss Reminder
    console.log('\nTest 6: Dismiss Reminder...');
    const dismissRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/reminders/${createdReminderId}/dismiss`,
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    const dismissData = JSON.parse(dismissRes.body);
    if (dismissData.success) {
      console.log('✓ PASS: Reminder dismissed');
    } else {
      console.error('✗ FAIL: Dismiss failed:', dismissRes.body);
    }
  }

  // 7. Get and Update Report Settings
  console.log('\nTest 7: Report Settings API...');
  const getSettingsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/settings',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  const getSettingsData = JSON.parse(getSettingsRes.body);
  if (getSettingsData.success && getSettingsData.settings) {
    console.log('✓ PASS: Retrieved report settings:', {
      weekly_enabled: getSettingsData.settings.weekly_enabled,
      weekly_day: getSettingsData.settings.weekly_day,
      weekly_time: getSettingsData.settings.weekly_time,
      monthly_enabled: getSettingsData.settings.monthly_enabled,
      monthly_day: getSettingsData.settings.monthly_day,
      monthly_time: getSettingsData.settings.monthly_time
    });
  } else {
    console.error('✗ FAIL: Could not retrieve report settings:', getSettingsRes.body);
  }

  // 8. Generate On-Demand Weekly Attendance Report (PDF)
  console.log('\nTest 8: Generate Weekly Attendance Report (PDF)...');
  const genWeeklyRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, { type: 'weekly', option: 'current' });

  let weeklyReportId = null;
  const genWeeklyData = JSON.parse(genWeeklyRes.body);
  if ((genWeeklyRes.statusCode === 200 || genWeeklyRes.statusCode === 201) && genWeeklyData.success) {
    weeklyReportId = genWeeklyData.report.reportId;
    console.log('✓ PASS: Weekly report PDF generated:', {
      id: genWeeklyData.report.reportId,
      file_path: genWeeklyData.report.filePath,
      period: `${genWeeklyData.report.periodStart} to ${genWeeklyData.report.periodEnd}`,
      turnout: `${genWeeklyData.report.turnoutRate}%`
    });
  } else {
    console.error('✗ FAIL: Weekly report generation failed:', genWeeklyRes.body);
  }

  // 9. Generate On-Demand Monthly Attendance Report (PDF)
  console.log('\nTest 9: Generate Monthly Attendance Report (PDF)...');
  const genMonthlyRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports/generate',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, { type: 'monthly', month: 8, year: 2026 });

  let monthlyReportId = null;
  const genMonthlyData = JSON.parse(genMonthlyRes.body);
  if ((genMonthlyRes.statusCode === 200 || genMonthlyRes.statusCode === 201) && genMonthlyData.success) {
    monthlyReportId = genMonthlyData.report.reportId;
    console.log('✓ PASS: Monthly report PDF generated:', {
      id: genMonthlyData.report.reportId,
      file_path: genMonthlyData.report.filePath,
      period: `${genMonthlyData.report.periodStart} to ${genMonthlyData.report.periodEnd}`,
      turnout: `${genMonthlyData.report.turnoutRate}%`
    });
  } else {
    console.error('✗ FAIL: Monthly report generation failed:', genMonthlyRes.body);
  }

  // 10. List Reports History
  console.log('\nTest 10: List Reports History Archive...');
  const listReportsRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/api/reports',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  const listReportsData = JSON.parse(listReportsRes.body);
  if (listReportsData.success && Array.isArray(listReportsData.reports)) {
    console.log(`✓ PASS: Found ${listReportsData.reports.length} generated reports in history`);
    if (!weeklyReportId && listReportsData.reports.length > 0) {
      weeklyReportId = listReportsData.reports[0].id;
    }
  } else {
    console.error('✗ FAIL: List reports failed:', listReportsRes.body);
  }

  // 11. Download Report PDF with Authentication
  if (weeklyReportId) {
    console.log(`\nTest 11: Authenticated PDF Download (${weeklyReportId})...`);
    const downloadRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/reports/${weeklyReportId}/download`,
      method: 'GET',
      headers: { 'Cookie': cookie }
    });
    if (downloadRes.statusCode === 200 && downloadRes.headers['content-type'] === 'application/pdf') {
      console.log(`✓ PASS: Successfully streamed PDF (${downloadRes.body.length} bytes) with Content-Type: application/pdf`);
    } else {
      console.error(`✗ FAIL: Download failed. Status: ${downloadRes.statusCode}, Type: ${downloadRes.headers['content-type']}`);
    }
  }

  // 12. Download Report PDF without Authentication should be 401
  if (weeklyReportId) {
    console.log('\nTest 12: Unauthenticated PDF Download check...');
    const unauthDownloadRes = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/reports/${weeklyReportId}/download`,
      method: 'GET'
    });
    if (unauthDownloadRes.statusCode === 401) {
      console.log('✓ PASS: Unauthenticated report download blocked with 401');
    } else {
      console.error(`✗ FAIL: Expected 401, got ${unauthDownloadRes.statusCode}`);
    }
  }

  console.log('\n=== ALL VERIFICATION TESTS COMPLETED ===');
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
});
