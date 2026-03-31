// src/services/socketService.js
let io;

const init = (socketIoInstance) => {
  io = socketIoInstance;
};

const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

const emitToVehicleRoom = (vehicleId, event, data) => {
  if (io) {
    io.to(`vehicle:${vehicleId}`).emit(event, data);
  }
};

/**
 * NEW: Emit to all connected administrators.
 */
const emitToAdmin = (event, data) => {
  if (io) {
    io.to('admin:all').emit(event, data);
  }
};

const broadcastSystemUpdate = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

module.exports = {
  init,
  emitToUser,
  emitToVehicleRoom,
  emitToAdmin,
  broadcastSystemUpdate
};
