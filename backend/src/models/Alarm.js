const mongoose = require('mongoose');
const { ALARM_TYPES, ALARM_SEVERITY } = require('../constants');

const alarmSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(ALARM_TYPES),
    required: true
  },
  severity: {
    type: String,
    enum: Object.values(ALARM_SEVERITY),
    required: true
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
});

alarmSchema.index({ timestamp: -1 });
alarmSchema.index({ deviceId: 1, resolved: 1 });
alarmSchema.index({ severity: 1, timestamp: -1 });

module.exports = mongoose.model('Alarm', alarmSchema);
