# DEMO GUIDE — Campus Safety Platform
## Jury Presentation Step-by-Step

---

## Pre-Demo Checklist (5 min before)

- [ ] MongoDB running (`mongod` or Docker)
- [ ] Backend running (`npm run dev` in `/backend`)
- [ ] Frontend running (`npm run dev` in `/frontend`)
- [ ] Seed data loaded (`npm run seed` in `/backend`)
- [ ] Browser open at http://localhost:5173
- [ ] 2 extra terminal tabs ready for simulator

---

## Demo Flow (≈ 15 minutes)

### Step 1 — Login & Role Demo (2 min)

1. Open http://localhost:5173
2. Login as **Admin**: `admin@btu.edu.tr / admin123`
3. Show the login form, JWT stored in localStorage (DevTools → Application → Local Storage)
4. Mention role-based access: Admin sees all devices, Operator sees own, Viewer read-only

---

### Step 2 — Dashboard Overview (3 min)

1. Show **stats cards**: Active Devices, Alarms Today, Unresolved count, Total Devices
2. Show **empty live chart** (waiting for data)
3. Show **active alarms panel** from seed data
4. Show **device status grid** — 8 devices with online/offline indicators

> Key point: "All data here updates in real-time via Socket.io without page refresh"

---

### Step 3 — Start Simulator — Normal Mode (1 min)

```bash
cd mobile-simulator
node simulator.js --deviceId DEMO-001 --scenario normal
```

1. Switch back to browser Dashboard
2. Show the **live chart updating** in real-time — audio and risk score lines appear
3. Explain: "This is a simulated smartphone posting data every 2 seconds"

---

### Step 4 — Trigger Noise Alarm (2 min)

Open a new terminal:
```bash
cd mobile-simulator
node simulator.js --deviceId DEMO-002 --scenario noise_event
```

1. Watch the terminal — audio levels jump above 85dB
2. After ~10 readings (20 seconds), a **NOISE_ANOMALY alarm** appears
3. Switch to browser — alarm appears in **Active Alarms panel without refresh**
4. Navigate to **Alarm List** page — filter by "Noise Anomaly"
5. Resolve the alarm — show it disappears from active list

> Key point: "The z-score algorithm also fires on statistically anomalous audio spikes"

---

### Step 5 — Map View Demo (2 min)

1. Navigate to **Map View**
2. Show campus area with device markers
3. Explain **color coding**: Green (safe) → Yellow → Orange → Red (critical)
4. Show **restricted zone polygons** (Server Room, Admin Building, Research Lab)
5. Click a device marker — show popup with live readings

```bash
# Trigger restricted zone alarm
node simulator.js --deviceId DEMO-003 --scenario restricted_zone
```

6. Watch the device marker on map change color as risk score rises

---

### Step 6 — Device Management (1 min)

1. Navigate to **Device Management**
2. Show table: all 8 devices, status, battery, last seen
3. Click **"+ Register Device"** — show the form
4. Register a test device: ID `DEMO-NEW`, Name `Test Device`
5. Click any device name → show **sensor history chart** for that device

---

### Step 7 — Analytics Page (2 min)

1. Navigate to **Analytics**
2. Select device from dropdown
3. Show **time series chart** (audio, risk score, network strength)
4. Show **alarm heatmap** — frequency by hour of day
5. Show **risk score distribution** bars
6. Click **"Export CSV"** — download opens (show file)

---

### Step 8 — Movement Scenario (1 min)

```bash
node simulator.js --deviceId DEMO-004 --scenario movement
```

1. Show high acceleration values in terminal
2. After 3 consecutive readings (~6s) → **UNUSUAL_MOVEMENT alarm**
3. Navigate to Alarm List — show alarm with MEDIUM severity
4. Resolve it as operator

---

### Step 9 — API Demo (1 min)

Show the REST API directly:
```bash
# Health check
curl http://localhost:3001/api/health

# Get alarms stats
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/alarms/stats
```

Or use browser: http://localhost:3001/api/health

---

### Step 10 — Architecture Q&A (1 min)

Be ready to answer:
- **"How does real-time work?"** → Socket.io rooms; sensors route emits `sensor:update` after each POST
- **"How is anomaly detected?"** → In-memory state per device; threshold + rolling window + z-score
- **"What if two users login?"** → JWT is stateless; each client gets own socket connection
- **"Security?"** → bcrypt (saltRounds=12), JWT middleware on all routes except /auth/*, role checks
- **"Database?"** → MongoDB + Mongoose; indexed on deviceId+timestamp for query performance

---

## Cleanup After Demo

```bash
# Stop simulators: Ctrl+C in each terminal

# Optional: clear demo devices
# Login as admin, go to Device Management, delete DEMO-* devices
```

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Map doesn't load | Check internet connection (OpenStreetMap tiles) |
| Alarms not appearing in real-time | Check Socket.io connection in browser DevTools console |
| Simulator auth fails | Run `npm run seed` first to create the DB |
| Port 3001 busy | `kill -9 $(lsof -ti:3001)` or change PORT in .env |
| MongoDB connection refused | Start MongoDB: `mongod --dbpath ./data` |

---

*Good luck with the presentation! 🎓*
