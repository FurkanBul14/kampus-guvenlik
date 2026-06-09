#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const axios = require('axios');

// ── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const DEVICE_ID = getArg('deviceId', `SIM-${Date.now().toString(36).toUpperCase()}`);
const SCENARIO  = getArg('scenario', 'normal');
const INTERVAL  = parseInt(getArg('interval', '2000'), 10);
const BASE_URL  = getArg('url', process.env.SIMULATOR_URL || 'http://localhost:3001');

const SCENARIOS = ['normal', 'noise_event', 'crowd', 'restricted_zone', 'movement'];

if (!SCENARIOS.includes(SCENARIO)) {
  console.error(`\n❌ Unknown scenario "${SCENARIO}". Valid: ${SCENARIOS.join(', ')}\n`);
  process.exit(1);
}

// ── Auth state ────────────────────────────────────────────────────────────────
let token = null;
const DEVICE_NAME = `Simulator-${DEVICE_ID}`;
const EMAIL = `${DEVICE_ID.toLowerCase()}@sim.btu.edu.tr`;
const PASSWORD = 'sim-password-123';

// Campus BTU coordinates
const BASE_LAT = 40.2167;
const BASE_LNG = 29.0833;

// ── Helpers ───────────────────────────────────────────────────────────────────
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
function jitter(val, range) { return val + rand(-range, range); }
function now() { return new Date().toISOString(); }

function gps(latOffset = 0, lngOffset = 0, radius = 0.001) {
  return {
    lat: parseFloat((BASE_LAT + latOffset + rand(-radius, radius)).toFixed(6)),
    lng: parseFloat((BASE_LNG + lngOffset + rand(-radius, radius)).toFixed(6)),
    accuracy: randInt(3, 15)
  };
}

// ── Scenario generators ───────────────────────────────────────────────────────
let tick = 0;

function generateNormal() {
  const mag = rand(0.5, 4);
  const angle = Math.random() * 2 * Math.PI;
  return {
    accelerometer: { x: parseFloat((mag * Math.cos(angle)).toFixed(2)), y: parseFloat((mag * Math.sin(angle)).toFixed(2)), z: parseFloat(rand(0.8, 1.2).toFixed(2)) },
    gyroscope: { x: parseFloat(rand(-0.5, 0.5).toFixed(3)), y: parseFloat(rand(-0.5, 0.5).toFixed(3)), z: parseFloat(rand(-0.5, 0.5).toFixed(3)) },
    gps: gps(),
    audioLevel: parseFloat(rand(35, 65).toFixed(1)),
    networkStrength: randInt(60, 100)
  };
}

function generateNoiseEvent() {
  // Gradually increases to trigger NOISE_ANOMALY (needs 10 consecutive >85dB)
  const phase = tick % 25;
  const audioLevel = phase < 15
    ? parseFloat(rand(88, 105).toFixed(1))  // elevated
    : parseFloat(rand(40, 65).toFixed(1));  // normal recovery
  const mag = rand(0.5, 3);
  const angle = Math.random() * 2 * Math.PI;
  return {
    accelerometer: { x: parseFloat((mag * Math.cos(angle)).toFixed(2)), y: parseFloat((mag * Math.sin(angle)).toFixed(2)), z: 1 },
    gyroscope: { x: 0, y: 0, z: 0 },
    gps: gps(),
    audioLevel,
    networkStrength: randInt(55, 90)
  };
}

function generateMovement() {
  // Sustained high acceleration to trigger UNUSUAL_MOVEMENT (3+ consecutive >20)
  const phase = tick % 15;
  const high = phase < 6;
  const mag = high ? rand(22, 35) : rand(1, 5);
  const angle = Math.random() * 2 * Math.PI;
  return {
    accelerometer: {
      x: parseFloat((mag * Math.cos(angle)).toFixed(2)),
      y: parseFloat((mag * Math.sin(angle)).toFixed(2)),
      z: parseFloat(rand(1, 5).toFixed(2))
    },
    gyroscope: {
      x: parseFloat(rand(-3, 3).toFixed(3)),
      y: parseFloat(rand(-3, 3).toFixed(3)),
      z: parseFloat(rand(-3, 3).toFixed(3))
    },
    gps: gps(),
    audioLevel: parseFloat(rand(50, 75).toFixed(1)),
    networkStrength: randInt(50, 90)
  };
}

function generateCrowd() {
  // Normal readings near the same spot (crowd simulation requires multiple devices)
  return {
    accelerometer: { x: parseFloat(rand(-2, 2).toFixed(2)), y: parseFloat(rand(-2, 2).toFixed(2)), z: 1 },
    gyroscope: { x: 0, y: 0, z: 0 },
    gps: gps(0, 0, 0.0002),   // very tight cluster
    audioLevel: parseFloat(rand(65, 80).toFixed(1)),  // elevated crowd noise
    networkStrength: randInt(40, 75)  // crowded network
  };
}

function generateRestrictedZone() {
  // GPS coordinates inside the "Server Room" restricted zone
  const zone = {
    lat: jitter(40.21655, 0.00005),
    lng: jitter(29.08320, 0.00005),
    accuracy: 4
  };
  return {
    accelerometer: { x: parseFloat(rand(-1, 1).toFixed(2)), y: parseFloat(rand(-1, 1).toFixed(2)), z: 1 },
    gyroscope: { x: 0, y: 0, z: 0 },
    gps: zone,
    audioLevel: parseFloat(rand(40, 60).toFixed(1)),
    networkStrength: randInt(70, 95)
  };
}

function generateSensors() {
  switch (SCENARIO) {
    case 'noise_event':    return generateNoiseEvent();
    case 'movement':       return generateMovement();
    case 'crowd':          return generateCrowd();
    case 'restricted_zone': return generateRestrictedZone();
    default:               return generateNormal();
  }
}

// ── Auth helpers ──────────────────────────────────────────────────────────────
async function register() {
  const res = await axios.post(`${BASE_URL}/api/auth/register`, {
    username: `sim_${DEVICE_ID.toLowerCase().replace(/-/g, '_')}`,
    email: EMAIL,
    password: PASSWORD,
    role: 'operator'
  });
  return res.data.data.token;
}

async function login() {
  const res = await axios.post(`${BASE_URL}/api/auth/login`, { email: EMAIL, password: PASSWORD });
  return res.data.data.token;
}

async function ensureDevice() {
  try {
    await axios.post(
      `${BASE_URL}/api/devices`,
      { deviceId: DEVICE_ID, name: DEVICE_NAME, location: { lat: BASE_LAT, lng: BASE_LNG } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`📱 Device "${DEVICE_NAME}" registered`);
  } catch (err) {
    if (err.response?.data?.error?.includes('already registered')) {
      console.log(`📱 Device "${DEVICE_NAME}" already exists — continuing`);
    } else {
      throw err;
    }
  }
}

async function authenticate() {
  try {
    token = await login();
    console.log('🔐 Logged in successfully');
  } catch (_) {
    try {
      token = await register();
      console.log('🔐 Registered and logged in');
    } catch (err) {
      console.error('❌ Auth failed:', err.response?.data?.error || err.message);
      process.exit(1);
    }
  }
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function sendData() {
  const sensors = generateSensors();
  try {
    const res = await axios.post(
      `${BASE_URL}/api/sensors/data`,
      { deviceId: DEVICE_ID, sensors, batteryLevel: randInt(20, 100) },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const { riskScore, alarms } = res.data.data;
    const gpsStr = sensors.gps ? `${sensors.gps.lat.toFixed(5)},${sensors.gps.lng.toFixed(5)}` : 'N/A';

    const line = [
      `[${new Date().toLocaleTimeString()}]`,
      `🎙 ${sensors.audioLevel.toFixed(1)}dB`,
      `⚡ ${Math.sqrt(sensors.accelerometer.x**2 + sensors.accelerometer.y**2 + sensors.accelerometer.z**2).toFixed(1)}m/s²`,
      `📍 ${gpsStr}`,
      `🔴 Risk: ${riskScore}`,
      alarms.length > 0 ? `🚨 ${alarms.length} alarm(s)!` : ''
    ].filter(Boolean).join(' | ');

    console.log(line);

    if (alarms.length > 0) {
      alarms.forEach((a) => console.log(`   ⚠️  [${a.severity.toUpperCase()}] ${a.type}: ${a.message}`));
    }

    tick++;
  } catch (err) {
    if (err.response?.status === 401) {
      console.log('🔄 Token expired, re-authenticating...');
      await authenticate();
    } else {
      console.error('❌ Send error:', err.response?.data?.error || err.message);
    }
  }
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║      Campus Safety Platform — Mobile Simulator       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Device ID : ${DEVICE_ID}`);
  console.log(`  Scenario  : ${SCENARIO}`);
  console.log(`  Interval  : ${INTERVAL}ms`);
  console.log(`  Backend   : ${BASE_URL}`);
  console.log('');
  console.log('  Scenarios: normal | noise_event | movement | crowd | restricted_zone');
  console.log('  Usage: node simulator.js --deviceId MY-001 --scenario noise_event');
  console.log('');

  await authenticate();
  await ensureDevice();

  console.log(`\n▶ Starting sensor stream (${INTERVAL}ms interval)...\n`);
  await sendData(); // immediate first send
  const timer = setInterval(sendData, INTERVAL);

  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log('\n\n⏹ Simulator stopped.\n');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
