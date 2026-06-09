const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  sensors: {
    accelerometer: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    },
    gyroscope: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
      z: { type: Number, default: 0 }
    },
    gps: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number, default: 5 }
    },
    audioLevel: { type: Number, min: 0, max: 130, default: 40 },
    networkStrength: { type: Number, min: 0, max: 100, default: 80 }
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  }
});

sensorDataSchema.index({ deviceId: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SensorData', sensorDataSchema);
