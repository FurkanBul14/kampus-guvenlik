require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/database');
const socketHandler = require('./socket/socketHandler');
const notification = require('./services/notificationService');
const { checkOfflineDevices } = require('./services/anomalyDetector');
const logger = require('./utils/logger');
const runSeed = require('./scripts/seedData');

const PORT = process.env.PORT || 3001;
const IS_DEV = process.env.NODE_ENV !== 'production';

async function getMongoUri() {
  // If a real URI is set and reachable, use it
  if (process.env.MONGODB_URI && process.env.MONGODB_URI !== 'mongodb://localhost:27017/campus_safety') {
    return process.env.MONGODB_URI;
  }

  // Try connecting to local MongoDB first
  const mongoose = require('mongoose');
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_safety', {
      serverSelectionTimeoutMS: 2000
    });
    await mongoose.disconnect();
    logger.info('Local MongoDB found — using mongodb://localhost:27017/campus_safety');
    return process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_safety';
  } catch (_) {
    // Fall through to in-memory
  }

  // No local MongoDB — start in-memory server (dev only)
  if (IS_DEV) {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    logger.warn('Local MongoDB not found. Starting in-memory MongoDB...');
    const mongod = new MongoMemoryServer({ instance: { dbName: 'campus_safety' } });
    await mongod.start();
    const uri = mongod.getUri();
    logger.info(`In-memory MongoDB started: ${uri}`);
    logger.warn('NOTE: Data is NOT persisted between restarts in in-memory mode.');

    // Keep reference so it doesn't get GC'd
    global.__mongoMemoryServer = mongod;

    process.on('exit', () => mongod.stop());
    return uri;
  }

  throw new Error('MongoDB connection failed. Set MONGODB_URI in .env');
}

async function start() {
  const mongoUri = await getMongoUri();
  // Override env so connectDB picks it up
  process.env.MONGODB_URI = mongoUri;

  await connectDB();
  await runSeed(); // no-op if data already exists

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  socketHandler(io);
  notification.init(io);

  // Offline device check — every 60s
  setInterval(async () => {
    const offlineAlarms = await checkOfflineDevices();
    for (const alarm of offlineAlarms) {
      notification.sendAlarmNotification(alarm);
      notification.sendDeviceStatusChange(alarm.deviceId, 'inactive');
    }
  }, 60 * 1000);

  server.listen(PORT, () => {
    logger.info(`Backend  → http://localhost:${PORT}`);
    logger.info(`API Docs → http://localhost:${PORT}/api/docs`);
    logger.info(`Health   → http://localhost:${PORT}/api/health`);
  });

  process.on('SIGTERM', () => {
    logger.warn('SIGTERM received, shutting down gracefully');
    server.close(() => process.exit(0));
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
