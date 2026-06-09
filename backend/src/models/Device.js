const mongoose = require('mongoose');
const { DEVICE_STATUS } = require('../constants');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      default: 'smartphone'
    },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },
    status: {
      type: String,
      enum: Object.values(DEVICE_STATUS),
      default: DEVICE_STATUS.ACTIVE
    },
    lastSeen: {
      type: Date,
      default: Date.now
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    }
  },
  { timestamps: true }
);

deviceSchema.index({ status: 1 });
deviceSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Device', deviceSchema);
