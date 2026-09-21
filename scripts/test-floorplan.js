/**
 * Automated Verification Script for Restaurant Floor Plan & Staff Assignment Blueprint
 */

const http = require('http');

const PORT = 3000;
let sessionCookie = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (sessionCookie) {
      reqHeaders['Cookie'] = sessionCookie;
    }

    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: reqHeaders
    }, (res) => {
      let data = '';
      if (res.headers['set-cookie']) {
        sessionCookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
      }
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('FLOOR PLAN & TABLE ASSIGNMENTS API VERIFICATION');
  console.log('================================================================\n');

  try {
    // 1. Authenticate Manager
    console.log('[1/7] Authenticating manager session...');
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'manager@executive.com',
      password: 'Manager123!'
    });

    if (loginRes.status !== 200 || !loginRes.body.success) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.body)}`);
    }
    console.log('✓ Manager logged in successfully. Session cookie acquired.\n');

    // 2. Test Stations Catalog
    console.log('[2/7] Testing GET /api/floorplan/stations...');
    const stationsRes = await request('GET', '/api/floorplan/stations');
    if (stationsRes.status !== 200 || !stationsRes.body.success) {
      throw new Error(`Stations catalog failed: ${JSON.stringify(stationsRes.body)}`);
    }
    const stations = stationsRes.body.stations;
    console.log(`✓ Stations count: ${stations.length} (Expected: 16)`);

    const expectedStationIds = [
      'booth_1', 'booth_2', 'booth_3', 'booth_4',
      'table_1', 'table_2', 'table_3', 'table_4',
      'table_5', 'table_6', 'table_7', 'table_8',
      'section_a_1', 'section_a_2', 'section_b_1', 'bar'
    ];

    const missingStations = expectedStationIds.filter(id => !stations.some(s => s.id === id));
    if (missingStations.length > 0) {
      throw new Error(`Missing expected stations: ${missingStations.join(', ')}`);
    }
    console.log('✓ All 16 architectural stations verified (4 Booths, 8 Main Tables, 2 Sec A, 1 Sec B, 1 Bar).\n');

    // 3. Test GET Assignments for Date & Shift
    console.log('[3/7] Testing GET /api/floorplan/assignments?date=2026-09-21&shift=Morning...');
    const assignRes = await request('GET', '/api/floorplan/assignments?date=2026-09-21&shift=Morning');
    if (assignRes.status !== 200 || !assignRes.body.success) {
      throw new Error(`Assignments query failed: ${JSON.stringify(assignRes.body)}`);
    }
    console.log(`✓ Response contains date: ${assignRes.body.date}, shift: ${assignRes.body.shift}`);
    console.log(`✓ Active employees on roster: ${assignRes.body.employees.length}`);
    console.log(`✓ Stations returned: ${assignRes.body.stations.length}\n`);

    // 4. Test Single Table Assignment (Table 2 -> Marcus Vance)
    console.log('[4/7] Testing POST /api/floorplan/assign (Assign Table 2 to Marcus Vance)...');
    const singleAssignRes = await request('POST', '/api/floorplan/assign', {
      date: '2026-09-21',
      shift: 'Morning',
      station_id: 'table_2',
      staff_id: 'st_101',
      notes: 'VIP Window View'
    });

    if (singleAssignRes.status !== 200 || !singleAssignRes.body.success) {
      throw new Error(`Single assignment failed: ${JSON.stringify(singleAssignRes.body)}`);
    }
    console.log('✓ Table 2 assigned successfully.');

    // Verify assignment persistence in GET
    const verifySingle = await request('GET', '/api/floorplan/assignments?date=2026-09-21&shift=Morning');
    const table2 = verifySingle.body.stations.find(s => s.id === 'table_2');
    if (!table2 || !table2.assignment || table2.assignment.staff_id !== 'st_101') {
      throw new Error(`Table 2 verification failed: ${JSON.stringify(table2)}`);
    }
    console.log(`✓ Verified persistence: Table 2 assigned to "${table2.assignment.staff_name}" (${table2.assignment.staff_code}), status="${table2.assignment.status}"\n`);

    // 5. Test Bulk Assignment
    console.log('[5/7] Testing POST /api/floorplan/assign-bulk...');
    const bulkRes = await request('POST', '/api/floorplan/assign-bulk', {
      date: '2026-09-21',
      shift: 'Morning',
      assignments: [
        { station_id: 'booth_1', staff_id: 'st_102' },
        { station_id: 'booth_2', staff_id: 'st_103' },
        { station_id: 'section_a_1', staff_id: 'st_104' },
        { station_id: 'bar', staff_id: 'st_106' }
      ]
    });

    if (bulkRes.status !== 200 || !bulkRes.body.success) {
      throw new Error(`Bulk assignment failed: ${JSON.stringify(bulkRes.body)}`);
    }
    console.log('✓ Bulk assignments saved.');

    // Verify bulk assignments in GET
    const verifyBulk = await request('GET', '/api/floorplan/assignments?date=2026-09-21&shift=Morning');
    const booth1 = verifyBulk.body.stations.find(s => s.id === 'booth_1');
    const barStation = verifyBulk.body.stations.find(s => s.id === 'bar');

    if (!booth1 || !booth1.assignment || booth1.assignment.staff_id !== 'st_102') {
      throw new Error(`Booth 1 bulk assignment verification failed: ${JSON.stringify(booth1)}`);
    }
    if (!barStation || !barStation.assignment || barStation.assignment.staff_id !== 'st_106') {
      throw new Error(`Bar bulk assignment verification failed: ${JSON.stringify(barStation)}`);
    }
    console.log('✓ Verified bulk assignments: Booth 1 -> Elena Rostova, Bar -> Chloe Bennett\n');

    // 6. Test Shift Isolation (Evening shift should NOT have Table 2 assigned)
    console.log('[6/7] Testing shift isolation (Evening vs Morning)...');
    const eveningRes = await request('GET', '/api/floorplan/assignments?date=2026-09-21&shift=Evening');
    const eveningTable2 = eveningRes.body.stations.find(s => s.id === 'table_2');
    if (eveningTable2.assignment && eveningTable2.assignment.staff_id) {
      throw new Error(`Shift isolation failed: Evening shift inherited Morning assignment!`);
    }
    console.log('✓ Shift isolation verified: Evening shift has clean unassigned tables.\n');

    // 7. Test Table Unassignment
    console.log('[7/7] Testing table unassignment (Clear Table 2)...');
    const unassignRes = await request('POST', '/api/floorplan/assign', {
      date: '2026-09-21',
      shift: 'Morning',
      station_id: 'table_2',
      staff_id: null
    });

    if (unassignRes.status !== 200 || !unassignRes.body.success) {
      throw new Error(`Unassignment failed: ${JSON.stringify(unassignRes.body)}`);
    }

    const verifyUnassign = await request('GET', '/api/floorplan/assignments?date=2026-09-21&shift=Morning');
    const table2After = verifyUnassign.body.stations.find(s => s.id === 'table_2');
    if (table2After.assignment && table2After.assignment.staff_id) {
      throw new Error(`Table 2 was not unassigned properly: ${JSON.stringify(table2After)}`);
    }
    console.log('✓ Table 2 successfully cleared back to unassigned status.\n');

    console.log('================================================================');
    console.log('ALL 7 FLOOR PLAN VERIFICATION TESTS PASSED SUCCESSFULLY! ✓');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ VERIFICATION TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();
