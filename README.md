# Campus Safety & Environmental Monitoring Platform

**Bursa Technical University — Computer Engineering Department**  
**Web Programming with Node.js — Semester Project**  
**Scenario 3: Campus Safety & Environmental Observation**

---

## Project Description

Smartphones act as IoT nodes collecting location, motion, audio level, and environmental data to detect unusual situations across campus. The system detects crowd density, noise anomalies, proximity to restricted zones, and suspicious movement in real-time.

### Key Features
- **Real-time monitoring** via Socket.io — dashboard updates without page refresh
- **7 anomaly detection algorithms** (noise, movement, crowd, restricted zones, z-score, offline detection, risk scoring)
- **Interactive campus map** with color-coded device markers and restricted zone overlays
- **Role-based access control** (admin / operator / viewer)
- **Mobile simulator** to generate realistic sensor data for demo purposes
- **Analytics dashboard** with time series charts and alarm heatmaps

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│  React 18 + Vite + Tailwind CSS + Recharts + Leaflet.js        │
│  Pages: Dashboard | Map | Devices | Alarms | Analytics         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST + Socket.io (ws)
┌──────────────────────────▼──────────────────────────────────────┐
│                     BACKEND (Node.js)                           │
│  Express.js REST API          Socket.io Server                  │
│  ├─ /api/auth                 ├─ join:dashboard room            │
│  ├─ /api/devices              ├─ sensor:update event            │
│  ├─ /api/sensors              ├─ alarm:new event                │
│  └─ /api/alarms               └─ device:status event           │
│                                                                 │
│  Anomaly Detector Service                                       │
│  ├─ Noise Analysis (>85dB × 10 consecutive)                    │
│  ├─ Movement Analysis (accel magnitude >20 × 3 consecutive)    │
│  ├─ Crowd Density (>15 devices within 50m)                      │
│  ├─ Restricted Zone (GPS polygon check)                         │
│  ├─ Device Offline (lastSeen >10 min)                           │
│  ├─ Risk Score Composite (0-100)                                │
│  └─ Z-Score Audio Anomaly (rolling window, |z|>2.5)            │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Mongoose ODM
┌──────────────────────────▼──────────────────────────────────────┐
│                    MongoDB Database                             │
│  Collections: users | devices | sensordatas | alarms           │
└─────────────────────────────────────────────────────────────────┘
         ▲
         │ POST /api/sensors/data (every 2s)
┌────────┴────────────────────────────────────────────────────────┐
│                   Mobile Simulator (Node.js)                    │
│  Scenarios: normal | noise_event | movement | crowd | restricted│
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation & Running

### Prerequisites
- Node.js 18+
- MongoDB (local or Docker)
- npm

### Option 1 — Without Docker (Development)

**1. Clone & setup:**
```bash
git clone <repo-url>
cd campus-safety-platform
```

**2. Backend:**
```bash
cd backend
cp .env.example .env
# Edit .env — set MONGODB_URI and JWT_SECRET
npm install
npm run seed          # seed demo data
npm run dev           # starts on http://localhost:3001
```

**3. Frontend (new terminal):**
```bash
cd frontend
npm install
npm run dev           # starts on http://localhost:5173
```

**4. Simulator (new terminal):**
```bash
cd mobile-simulator
npm install
node simulator.js --scenario noise_event
```

### Option 2 — With Docker Compose

```bash
cd campus-safety-platform
docker-compose up --build
```

Then seed the database:
```bash
docker exec campus_backend node src/scripts/seed.js
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api/health

---

## Simulator Usage

The simulator acts as a virtual smartphone posting sensor data every 2 seconds.

```bash
cd mobile-simulator
npm install

# Basic usage
node simulator.js --scenario normal

# All scenarios
node simulator.js --scenario noise_event     # triggers NOISE_ANOMALY alarm
node simulator.js --scenario movement         # triggers UNUSUAL_MOVEMENT alarm
node simulator.js --scenario crowd            # simulates dense cluster
node simulator.js --scenario restricted_zone  # triggers RESTRICTED_ZONE alarm

# Custom device and interval
node simulator.js --deviceId BTU-099 --scenario noise_event --interval 1000

# Multiple simulators (open multiple terminals)
node simulator.js --deviceId SIM-A --scenario normal
node simulator.js --deviceId SIM-B --scenario noise_event
```

---

## API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user (protected) |

### Devices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/devices` | List all devices (admin: all, user: own) |
| POST | `/api/devices` | Register new device |
| GET | `/api/devices/:id` | Get device details |
| PUT | `/api/devices/:id` | Update device |
| DELETE | `/api/devices/:id` | Delete device (admin only) |
| GET | `/api/devices/:id/status` | Get device status |

### Sensors
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sensors/data` | Submit sensor reading (triggers anomaly detection) |
| GET | `/api/sensors/data` | Query historical data (filters: deviceId, from, to, limit) |
| GET | `/api/sensors/latest/:deviceId` | Latest reading for device |
| GET | `/api/sensors/stats/:deviceId` | 24h statistics |

### Alarms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alarms` | List alarms (filters: severity, type, resolved, from, to) |
| POST | `/api/alarms/:id/resolve` | Mark alarm as resolved (admin/operator) |
| GET | `/api/alarms/stats` | Alarm statistics |

### Socket.io Events
| Event | Direction | Description |
|-------|-----------|-------------|
| `join:dashboard` | Client → Server | Join dashboard room |
| `join:device` | Client → Server | Join specific device room |
| `sensor:update` | Server → Client | New sensor reading |
| `alarm:new` | Server → Client | New alarm triggered |
| `device:status` | Server → Client | Device status changed |

### Response Format
```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "Error message" }
```

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@btu.edu.tr | admin123 |
| Operator | operator1@btu.edu.tr | operator123 |
| Viewer | viewer@btu.edu.tr | viewer123 |

---

## Team Task Distribution Template

| Task | Responsible | Status |
|------|------------|--------|
| Backend architecture & models | - | ✅ |
| Authentication & JWT | - | ✅ |
| Anomaly detection algorithms | - | ✅ |
| REST API routes | - | ✅ |
| Socket.io real-time | - | ✅ |
| React frontend setup | - | ✅ |
| Dashboard & live charts | - | ✅ |
| Map view (Leaflet) | - | ✅ |
| Alarm management UI | - | ✅ |
| Analytics page | - | ✅ |
| Mobile simulator | - | ✅ |
| Docker configuration | - | ✅ |
| Seed data & testing | - | ✅ |

---

## Known Limitations

1. **Crowd density analysis** is CPU-intensive for large device counts (queries multiple DB records). In production, consider spatial indexing with MongoDB's `2dsphere` index.
2. **Simulator** only sends data from a single device per process. Run multiple terminals for crowd simulation.
3. **Map tiles** require internet connection (OpenStreetMap). No offline fallback.
4. **Z-score anomaly** requires at least 10 readings per device to activate (cold start).
5. **Restricted zones** are hardcoded constants. In production, they should be stored in DB and manageable via UI.
6. **No persistent socket rooms** — after server restart, clients need to reconnect.
