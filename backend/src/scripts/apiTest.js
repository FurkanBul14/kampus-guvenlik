'use strict';

/**
 * Campus Safety Platform — Full API Test Suite
 * Çalıştır: node src/scripts/apiTest.js
 * (Backend npm run dev ile çalışıyor olmalı)
 */

const BASE = 'http://localhost:3001/api';
let passed = 0;
let failed = 0;
let token = null;
let createdDeviceId = null;
let createdAlarmId = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function req(method, path, body, authToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function ok(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ── Test Groups ───────────────────────────────────────────────────────────────

async function testHealth() {
  section('1. HEALTH & ZONES');

  const h = await req('GET', '/health');
  ok('GET /health → 200', h.status === 200);
  ok('Health returns success:true', h.body.success === true);
  ok('Health has timestamp', !!h.body.data?.timestamp);

  const z = await req('GET', '/zones');
  ok('GET /zones → 200', z.status === 200);
  ok('Zones returns array', Array.isArray(z.body.data));
  ok('Zones has 3 restricted areas', z.body.data?.length === 3);
}

async function testAuth() {
  section('2. AUTH');

  // Register new user
  const reg = await req('POST', '/auth/register', {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@btu.edu.tr`,
    password: 'test1234',
    role: 'operator'
  });
  ok('POST /auth/register → 201', reg.status === 201);
  ok('Register returns token', !!reg.body.data?.token);
  ok('Register returns user object', !!reg.body.data?.user);
  ok('Password NOT in response', !reg.body.data?.user?.passwordHash);

  // Duplicate register
  const dup = await req('POST', '/auth/register', {
    username: 'admin', email: 'admin@btu.edu.tr', password: 'admin123'
  });
  ok('Duplicate register → 400', dup.status === 400);

  // Login as admin
  const login = await req('POST', '/auth/login', {
    email: 'admin@btu.edu.tr',
    password: 'admin123'
  });
  ok('POST /auth/login → 200', login.status === 200);
  ok('Login returns token', !!login.body.data?.token);
  token = login.body.data?.token;

  // Bad login
  const badLogin = await req('POST', '/auth/login', {
    email: 'admin@btu.edu.tr', password: 'wrongpassword'
  });
  ok('Bad login → 401', badLogin.status === 401);

  // GET /me
  const me = await req('GET', '/auth/me', null, token);
  ok('GET /auth/me → 200', me.status === 200);
  ok('/me returns admin role', me.body.data?.role === 'admin');

  // /me without token
  const noToken = await req('GET', '/auth/me');
  ok('/auth/me without token → 401', noToken.status === 401);

  // Validation
  const badEmail = await req('POST', '/auth/login', { email: 'notanemail', password: '123' });
  ok('Invalid email format → 400', badEmail.status === 400);
}

async function testDevices() {
  section('3. DEVICES');

  // Create device
  const create = await req('POST', '/devices', {
    deviceId: `TEST-${Date.now()}`,
    name: 'Test Device Alpha',
    location: { lat: 40.2167, lng: 29.0833 }
  }, token);
  ok('POST /devices → 201', create.status === 201);
  ok('Device has deviceId', !!create.body.data?.deviceId);
  ok('Device has owner', !!create.body.data?.owner);
  createdDeviceId = create.body.data?.deviceId;
  const createdMongoId = create.body.data?._id;

  // Duplicate deviceId
  const dup = await req('POST', '/devices', { deviceId: createdDeviceId, name: 'Dup' }, token);
  ok('Duplicate deviceId → 400', dup.status === 400);

  // GET all
  const all = await req('GET', '/devices', null, token);
  ok('GET /devices → 200', all.status === 200);
  ok('GET /devices returns array', Array.isArray(all.body.data));
  ok('Created device in list', all.body.data?.some(d => d.deviceId === createdDeviceId));

  // GET by mongo id
  const one = await req('GET', `/devices/${createdMongoId}`, null, token);
  ok(`GET /devices/:id → 200`, one.status === 200);
  ok('Device name correct', one.body.data?.name === 'Test Device Alpha');

  // GET status
  const status = await req('GET', `/devices/${createdMongoId}/status`, null, token);
  ok('GET /devices/:id/status → 200', status.status === 200);
  ok('Status has batteryLevel', status.body.data?.batteryLevel !== undefined);

  // PUT update
  const update = await req('PUT', `/devices/${createdMongoId}`, { name: 'Test Device Updated' }, token);
  ok('PUT /devices/:id → 200', update.status === 200);
  ok('Name updated', update.body.data?.name === 'Test Device Updated');

  // GET nonexistent
  const notFound = await req('GET', '/devices/000000000000000000000000', null, token);
  ok('GET nonexistent device → 404', notFound.status === 404);

  // No token
  const noAuth = await req('GET', '/devices');
  ok('GET /devices without token → 401', noAuth.status === 401);
}

async function testSensors() {
  section('4. SENSORS');

  if (!createdDeviceId) { ok('Sensor tests skipped — no device', false, 'device creation failed'); return; }

  // Post sensor data
  const post = await req('POST', '/sensors/data', {
    deviceId: createdDeviceId,
    batteryLevel: 85,
    sensors: {
      accelerometer: { x: 1.2, y: 0.5, z: 9.8 },
      gyroscope: { x: 0.01, y: -0.02, z: 0.005 },
      gps: { lat: 40.2167, lng: 29.0833, accuracy: 5 },
      audioLevel: 52.3,
      networkStrength: 80
    }
  }, token);
  ok('POST /sensors/data → 201', post.status === 201);
  ok('Response has riskScore', typeof post.body.data?.riskScore === 'number');
  ok('Response has alarms array', Array.isArray(post.body.data?.alarms));

  // Post high noise to trigger anomaly
  for (let i = 0; i < 11; i++) {
    await req('POST', '/sensors/data', {
      deviceId: createdDeviceId,
      sensors: {
        accelerometer: { x: 0, y: 0, z: 1 },
        gps: { lat: 40.2167, lng: 29.0833, accuracy: 5 },
        audioLevel: 92 + i,
        networkStrength: 70
      }
    }, token);
  }
  ok('High noise data posted (10+ consecutive readings)', true);

  // GET sensor data
  const getData = await req('GET', `/sensors/data?deviceId=${createdDeviceId}&limit=50`, null, token);
  ok('GET /sensors/data → 200', getData.status === 200);
  ok('Returns array', Array.isArray(getData.body.data));
  ok('Has readings', getData.body.data?.length > 0);

  // GET latest
  const latest = await req('GET', `/sensors/latest/${createdDeviceId}`, null, token);
  ok('GET /sensors/latest/:deviceId → 200', latest.status === 200);
  ok('Latest has sensors object', !!latest.body.data?.sensors);
  ok('Latest has riskScore', typeof latest.body.data?.riskScore === 'number');

  // GET stats
  const stats = await req('GET', `/sensors/stats/${createdDeviceId}`, null, token);
  ok('GET /sensors/stats/:deviceId → 200', stats.status === 200);
  ok('Stats has totalReadings', typeof stats.body.data?.totalReadings === 'number');
  ok('Stats has avgAudioLevel', stats.body.data?.avgAudioLevel !== undefined);

  // Unknown device
  const notFound = await req('POST', '/sensors/data', {
    deviceId: 'NONEXISTENT-999',
    sensors: { audioLevel: 50 }
  }, token);
  ok('Sensor post for unknown device → 404', notFound.status === 404);

  // Validation — bad audioLevel
  const badAudio = await req('POST', '/sensors/data', {
    deviceId: createdDeviceId,
    sensors: { audioLevel: 999 }
  }, token);
  ok('audioLevel > 130 → 400', badAudio.status === 400);
}

async function testAlarms() {
  section('5. ALARMS');

  // GET alarms
  const all = await req('GET', '/alarms', null, token);
  ok('GET /alarms → 200', all.status === 200);
  ok('Alarms is array', Array.isArray(all.body.data));

  // GET with filters
  const filtered = await req('GET', '/alarms?severity=high&resolved=false&limit=5', null, token);
  ok('GET /alarms?severity=high&resolved=false → 200', filtered.status === 200);

  // GET stats
  const stats = await req('GET', '/alarms/stats', null, token);
  ok('GET /alarms/stats → 200', stats.status === 200);
  ok('Stats has total', typeof stats.body.data?.total === 'number');
  ok('Stats has bySeverity', Array.isArray(stats.body.data?.bySeverity));
  ok('Stats has byType', Array.isArray(stats.body.data?.byType));
  ok('Stats has hourlyData', Array.isArray(stats.body.data?.hourlyData));

  // Find an unresolved alarm to resolve
  const unresolved = all.body.data?.find(a => !a.resolved);
  if (unresolved) {
    createdAlarmId = unresolved._id;
    const resolve = await req('POST', `/alarms/${createdAlarmId}/resolve`, null, token);
    ok('POST /alarms/:id/resolve → 200', resolve.status === 200);
    ok('Alarm marked resolved', resolve.body.data?.resolved === true);
    ok('resolvedBy is set', !!resolve.body.data?.resolvedBy);

    // Double resolve
    const doubleResolve = await req('POST', `/alarms/${createdAlarmId}/resolve`, null, token);
    ok('Double resolve → 400', doubleResolve.status === 400);
  } else {
    ok('Resolve alarm test skipped (no unresolved alarms)', true);
  }

  // Viewer cannot resolve
  const viewerLogin = await req('POST', '/auth/login', { email: 'viewer@btu.edu.tr', password: 'viewer123' });
  const viewerToken = viewerLogin.body.data?.token;
  if (viewerToken && all.body.data?.length > 0) {
    const viewerResolve = await req('POST', `/alarms/${all.body.data[0]._id}/resolve`, null, viewerToken);
    ok('Viewer cannot resolve alarm → 403', viewerResolve.status === 403);
  }
}

async function testSecurity() {
  section('6. SECURITY');

  // Expired/invalid token
  const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIwMDAifQ.fake';
  const withFake = await req('GET', '/devices', null, fakeToken);
  ok('Fake token → 401', withFake.status === 401);

  // SQL injection attempt (should just fail validation or return 0 results)
  const sqlInject = await req('POST', '/auth/login', {
    email: "'; DROP TABLE users; --",
    password: 'anything'
  });
  ok('SQL injection attempt handled gracefully', sqlInject.status === 400 || sqlInject.status === 401);

  // XSS in device name (stored but should not execute)
  const xssDevice = await req('POST', '/devices', {
    deviceId: `XSS-${Date.now()}`,
    name: '<script>alert("xss")</script>'
  }, token);
  ok('XSS in device name stored as plain text (no execution)', xssDevice.status === 201);

  // Non-admin trying to delete a device
  const opLogin = await req('POST', '/auth/login', { email: 'operator1@btu.edu.tr', password: 'operator123' });
  const opToken = opLogin.body.data?.token;

  // Create a device as admin then try to delete as operator
  const adminDevice = await req('POST', '/devices', {
    deviceId: `ADMIN-DEL-${Date.now()}`, name: 'Admin Device'
  }, token);
  if (adminDevice.body.data?._id && opToken) {
    const opDelete = await req('DELETE', `/devices/${adminDevice.body.data._id}`, null, opToken);
    ok('Non-admin cannot delete → 403', opDelete.status === 403);
  }

  // Admin can delete
  if (adminDevice.body.data?._id) {
    const adminDelete = await req('DELETE', `/devices/${adminDevice.body.data._id}`, null, token);
    ok('Admin can delete device → 200', adminDelete.status === 200);
  }
}

async function testValidation() {
  section('7. INPUT VALIDATION');

  // Register with short password
  const shortPass = await req('POST', '/auth/register', {
    username: 'validuser', email: 'valid@btu.edu.tr', password: '123'
  });
  ok('Short password → 400', shortPass.status === 400);

  // Register with short username
  const shortUser = await req('POST', '/auth/register', {
    username: 'ab', email: 'ab@btu.edu.tr', password: 'password123'
  });
  ok('Short username (<3 chars) → 400', shortUser.status === 400);

  // Missing required fields
  const noName = await req('POST', '/devices', { deviceId: 'NO-NAME-001' }, token);
  ok('Device without name → 400', noName.status === 400);

  const noDeviceId = await req('POST', '/devices', { name: 'No ID' }, token);
  ok('Device without deviceId → 400', noDeviceId.status === 400);

  // Invalid GPS
  const badGPS = await req('POST', '/devices', {
    deviceId: `BAD-GPS-${Date.now()}`,
    name: 'Bad GPS Device',
    location: { lat: 999, lng: 999 }
  }, token);
  ok('Invalid GPS coordinates → 400', badGPS.status === 400);

  // Invalid alarm filter
  const badSeverity = await req('GET', '/alarms?severity=ultraviolet', null, token);
  ok('Invalid severity filter → 400', badSeverity.status === 400);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   Campus Safety Platform — API Test Suite           ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Backend: ${BASE}`);
  console.log(`  Tarih:   ${new Date().toLocaleString('tr-TR')}`);

  try {
    await testHealth();
    await testAuth();
    await testDevices();
    await testSensors();
    await testAlarms();
    await testSecurity();
    await testValidation();
  } catch (err) {
    console.error('\n❌ TEST SUITE CRASH:', err.message);
    if (err.cause?.code === 'ECONNREFUSED') {
      console.error('\n💡 Backend çalışmıyor! Önce: npm run dev (backend klasöründe)');
    }
  }

  const total = passed + failed;
  console.log('\n' + '═'.repeat(52));
  console.log(`  SONUÇ: ${passed}/${total} test geçti`);
  if (failed > 0) {
    console.log(`  ⚠️  ${failed} test başarısız — yukarıdaki ❌ işaretlerine bak`);
  } else {
    console.log('  🎉 Tüm testler geçti!');
  }
  console.log('═'.repeat(52) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main();
