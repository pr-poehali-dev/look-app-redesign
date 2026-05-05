import { io, Socket } from 'socket.io-client';
import { SIGNALING_URL } from './config';

let socket: Socket | null = null;

export function getSignalingSocket(): Socket | null {
  return socket;
}

export function connectSignaling(userId: string, token: string): Socket {
  if (socket && socket.connected) return socket;
  if (socket) socket.disconnect();

  socket = io(SIGNALING_URL, {
    transports: ['websocket'],
    auth: { userId, token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[signaling] connected');
  });
  socket.on('disconnect', (reason) => {
    console.log('[signaling] disconnected', reason);
  });
  socket.on('connect_error', (err) => {
    console.warn('[signaling] connect_error', err.message);
  });

  return socket;
}

export function disconnectSignaling(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
