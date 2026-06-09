import { io } from 'socket.io-client';

// Production'da Railway backend URL'i, dev'de aynı origin (proxy)
const URL = import.meta.env.VITE_API_URL || window.location.origin;

export const socket = io(URL, {
  autoConnect: false,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ['websocket', 'polling']
});

export function connectSocket() {
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

socket.on('connect', () => {
  console.info('[Socket] Connected:', socket.id);
  socket.emit('join:dashboard');
});

socket.on('connect_error', (err) => {
  console.warn('[Socket] Connection error:', err.message);
});

socket.on('disconnect', (reason) => {
  console.info('[Socket] Disconnected:', reason);
});
