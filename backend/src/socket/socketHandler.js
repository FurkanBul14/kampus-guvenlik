const logger = require('../utils/logger');

function socketHandler(io) {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join:dashboard', () => {
      socket.join('dashboard');
      logger.info(`Socket ${socket.id} joined dashboard room`);
    });

    socket.on('join:device', (deviceId) => {
      if (deviceId) {
        socket.join(`device:${deviceId}`);
        logger.info(`Socket ${socket.id} joined device:${deviceId} room`);
      }
    });

    socket.on('leave:device', (deviceId) => {
      if (deviceId) socket.leave(`device:${deviceId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      logger.error(`Socket error on ${socket.id}:`, err);
    });
  });
}

module.exports = socketHandler;
