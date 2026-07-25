require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const axios = require('axios');

const PORT = process.env.PORT || 4000;
const AUTH_VERIFY_URL = process.env.AUTH_VERIFY_URL || '';
const SFU_URL = process.env.SFU_URL || 'https://sfu.look.com.ru';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), users: users.size, rooms: rooms.size });
});

app.get('/config', (req, res) => {
  res.json({ sfuUrl: SFU_URL });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 25000,
  pingTimeout: 60000,
});

const users = new Map();
const rooms = new Map();

async function verifyToken(token, userId) {
  if (!AUTH_VERIFY_URL) return { id: userId, name: 'guest' };
  try {
    const r = await axios.get(AUTH_VERIFY_URL, {
      headers: { 'X-Auth-Token': token, 'X-User-Id': userId },
      timeout: 5000,
    });
    if (r.data && r.data.id) return r.data;
    return null;
  } catch (e) {
    return null;
  }
}

io.use(async (socket, next) => {
  const { token, userId } = socket.handshake.auth || {};
  if (!userId) return next(new Error('no userId'));
  const user = await verifyToken(token, userId);
  if (!user) return next(new Error('auth failed'));
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  users.set(user.id, { socketId: socket.id, user, roomId: null });
  console.log(`[+] ${user.id} (${user.name}) connected`);

  socket.emit('ready', { userId: user.id });

  socket.on('call:invite', ({ toUserId, callId, type, isGroup, roomId, members }) => {
    const target = users.get(String(toUserId));
    if (!target) {
      socket.emit('call:unavailable', { toUserId, callId });
      return;
    }
    io.to(target.socketId).emit('call:incoming', {
      from: { id: user.id, name: user.name, avatar: user.avatar },
      callId,
      type,
      isGroup,
      roomId,
      members,
    });
  });

  socket.on('call:accept', ({ callId, toUserId, roomId }) => {
    const target = users.get(String(toUserId));
    if (target) {
      io.to(target.socketId).emit('call:accepted', { callId, by: user.id, roomId });
    }
  });

  socket.on('call:decline', ({ callId, toUserId }) => {
    const target = users.get(String(toUserId));
    if (target) {
      io.to(target.socketId).emit('call:declined', { callId, by: user.id });
    }
  });

  socket.on('call:cancel', ({ callId, toUserId }) => {
    const target = users.get(String(toUserId));
    if (target) {
      io.to(target.socketId).emit('call:cancelled', { callId, by: user.id });
    }
  });

  socket.on('call:end', ({ callId, roomId }) => {
    if (roomId) {
      io.to(`room:${roomId}`).emit('call:ended', { callId, by: user.id });
    }
  });

  socket.on('room:join', ({ roomId }) => {
    if (!roomId) return;
    const me = users.get(user.id);
    if (me) me.roomId = roomId;
    socket.join(`room:${roomId}`);
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(user.id);
    socket.to(`room:${roomId}`).emit('room:peer-joined', {
      peerId: user.id,
      name: user.name,
      avatar: user.avatar,
    });
    const peers = Array.from(rooms.get(roomId))
      .filter((id) => id !== user.id)
      .map((id) => {
        const u = users.get(id);
        return u ? { peerId: id, name: u.user.name, avatar: u.user.avatar } : null;
      })
      .filter(Boolean);
    socket.emit('room:peers', { roomId, peers });
  });

  socket.on('room:leave', ({ roomId }) => {
    if (!roomId) return;
    socket.leave(`room:${roomId}`);
    if (rooms.has(roomId)) {
      rooms.get(roomId).delete(user.id);
      if (rooms.get(roomId).size === 0) rooms.delete(roomId);
    }
    socket.to(`room:${roomId}`).emit('room:peer-left', { peerId: user.id });
    const me = users.get(user.id);
    if (me) me.roomId = null;
  });

  socket.on('rtc:offer', ({ toPeerId, sdp, callId }) => {
    const target = users.get(String(toPeerId));
    if (target) {
      io.to(target.socketId).emit('rtc:offer', { fromPeerId: user.id, sdp, callId });
    }
  });

  socket.on('rtc:answer', ({ toPeerId, sdp, callId }) => {
    const target = users.get(String(toPeerId));
    if (target) {
      io.to(target.socketId).emit('rtc:answer', { fromPeerId: user.id, sdp, callId });
    }
  });

  socket.on('rtc:ice', ({ toPeerId, candidate, callId }) => {
    const target = users.get(String(toPeerId));
    if (target) {
      io.to(target.socketId).emit('rtc:ice', { fromPeerId: user.id, candidate, callId });
    }
  });

  socket.on('media:state', ({ roomId, audio, video }) => {
    if (!roomId) return;
    socket.to(`room:${roomId}`).emit('media:state', { peerId: user.id, audio, video });
  });

  socket.on('disconnect', () => {
    const me = users.get(user.id);
    if (me && me.roomId) {
      const rid = me.roomId;
      socket.to(`room:${rid}`).emit('room:peer-left', { peerId: user.id });
      if (rooms.has(rid)) {
        rooms.get(rid).delete(user.id);
        if (rooms.get(rid).size === 0) rooms.delete(rid);
      }
    }
    users.delete(user.id);
    console.log(`[-] ${user.id} disconnected`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server on :${PORT}`);
});
