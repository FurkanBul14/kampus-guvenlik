const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer'
};

const DEVICE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
};

const ALARM_TYPES = {
  CROWD_DENSITY: 'CROWD_DENSITY',
  NOISE_ANOMALY: 'NOISE_ANOMALY',
  RESTRICTED_ZONE: 'RESTRICTED_ZONE',
  UNUSUAL_MOVEMENT: 'UNUSUAL_MOVEMENT',
  DEVICE_OFFLINE: 'DEVICE_OFFLINE'
};

const ALARM_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const THRESHOLDS = {
  NOISE_DB: 85,
  NOISE_CONSECUTIVE: 10,
  ACCEL_MAGNITUDE: 20,
  MOVEMENT_CONSECUTIVE: 3,
  CROWD_RADIUS_M: 50,
  CROWD_COUNT: 15,
  OFFLINE_MINUTES: 10,
  ZSCORE_THRESHOLD: 2.5,
  ROLLING_WINDOW: 30,
  ALARM_COOLDOWN_MS: 5 * 60 * 1000,
  CROWD_COOLDOWN_MS: 10 * 60 * 1000,
  RESTRICTED_COOLDOWN_MS: 15 * 60 * 1000
};

const SOCKET_EVENTS = {
  SENSOR_UPDATE: 'sensor:update',
  ALARM_NEW: 'alarm:new',
  DEVICE_STATUS: 'device:status',
  JOIN_DASHBOARD: 'join:dashboard'
};

// Bursa Technical University campus area restricted zones
const RESTRICTED_ZONES = [
  {
    name: 'Server Room',
    color: '#dc2626',
    polygon: [
      { lat: 40.21650, lng: 29.08300 },
      { lat: 40.21665, lng: 29.08320 },
      { lat: 40.21655, lng: 29.08340 },
      { lat: 40.21640, lng: 29.08320 }
    ]
  },
  {
    name: 'Administrative Building',
    color: '#ea580c',
    polygon: [
      { lat: 40.21700, lng: 29.08400 },
      { lat: 40.21725, lng: 29.08435 },
      { lat: 40.21715, lng: 29.08465 },
      { lat: 40.21690, lng: 29.08430 }
    ]
  },
  {
    name: 'Research Lab',
    color: '#d97706',
    polygon: [
      { lat: 40.21580, lng: 29.08250 },
      { lat: 40.21602, lng: 29.08282 },
      { lat: 40.21592, lng: 29.08312 },
      { lat: 40.21570, lng: 29.08280 }
    ]
  }
];

module.exports = {
  ROLES,
  DEVICE_STATUS,
  ALARM_TYPES,
  ALARM_SEVERITY,
  THRESHOLDS,
  SOCKET_EVENTS,
  RESTRICTED_ZONES
};
