const { SOCKET_EVENTS } = require('../constants');

let io = null;

function init(socketIo) {
  io = socketIo;
}

function sendSensorUpdate(data) {
  if (!io) return;
  io.to('dashboard').emit(SOCKET_EVENTS.SENSOR_UPDATE, data);
  io.to(`device:${data.deviceId}`).emit(SOCKET_EVENTS.SENSOR_UPDATE, data);
}

function sendAlarmNotification(alarm) {
  if (!io) return;
  io.to('dashboard').emit(SOCKET_EVENTS.ALARM_NEW, alarm);
}

function sendDeviceStatusChange(deviceId, status) {
  if (!io) return;
  io.to('dashboard').emit(SOCKET_EVENTS.DEVICE_STATUS, { deviceId, status });
}

module.exports = { init, sendSensorUpdate, sendAlarmNotification, sendDeviceStatusChange };
