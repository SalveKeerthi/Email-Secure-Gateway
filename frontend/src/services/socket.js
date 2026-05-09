import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
    socket.on('disconnect', (reason) => console.warn('[Socket] Disconnected:', reason));
    socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Event name constants — keep in sync with backend
export const SOCKET_EVENTS = {
  SYNC_STARTED:      'syncStarted',
  SYNC_COMPLETED:    'syncCompleted',
  SYNC_PROGRESS:     'syncProgress',
  NEW_THREAT:        'newThreatDetected',
  EMAIL_QUARANTINED: 'emailQuarantined',
  EMAIL_BLOCKED:     'emailBlocked',
  EMAIL_ALLOWED:     'emailAllowed',
  CONNECTION_ERROR:  'connectionError',
};
