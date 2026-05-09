const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://localhost:5173',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('joinRoom', (room) => {
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
};

// ─── Emit helpers ──────────────────────────────────────────────────────────────
const emit = (event, data) => {
  try {
    if (io) io.emit(event, data);
  } catch (err) {
    logger.error(`Socket emit error [${event}]:`, err.message);
  }
};

const emitSyncStarted = (payload) => emit('syncStarted', payload);
const emitSyncCompleted = (payload) => emit('syncCompleted', payload);
const emitNewThreatDetected = (email) => emit('newThreatDetected', email);
const emitEmailQuarantined = (email) => emit('emailQuarantined', email);
const emitEmailBlocked = (email) => emit('emailBlocked', email);
const emitEmailAllowed = (email) => emit('emailAllowed', email);
const emitSyncProgress = (payload) => emit('syncProgress', payload);
const emitConnectionError = (payload) => emit('connectionError', payload);

module.exports = {
  initSocketIO,
  getIO,
  emitSyncStarted,
  emitSyncCompleted,
  emitNewThreatDetected,
  emitEmailQuarantined,
  emitEmailBlocked,
  emitEmailAllowed,
  emitSyncProgress,
  emitConnectionError,
};
