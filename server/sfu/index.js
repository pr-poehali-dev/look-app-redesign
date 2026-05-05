require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
const axios = require('axios');
const config = require('./config');

const AUTH_VERIFY_URL = process.env.AUTH_VERIFY_URL || '';

let worker;
const rooms = new Map();

async function createWorker() {
  worker = await mediasoup.createWorker({
    logLevel: config.workerLogLevel,
    rtcMinPort: config.rtcMinPort,
    rtcMaxPort: config.rtcMaxPort,
  });
  worker.on('died', () => {
    console.error('mediasoup worker died, exiting');
    setTimeout(() => process.exit(1), 2000);
  });
  console.log('mediasoup worker created');
}

async function getOrCreateRoom(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);
  const router = await worker.createRouter({ mediaCodecs: config.mediaCodecs });
  const room = { id: roomId, router, peers: new Map() };
  rooms.set(roomId, room);
  return room;
}

async function createWebRtcTransport(router) {
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: config.announcedIp }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  });
  return {
    transport,
    params: {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    },
  };
}

async function verifyToken(token, userId) {
  if (!AUTH_VERIFY_URL) return { id: userId };
  try {
    const r = await axios.get(AUTH_VERIFY_URL, {
      headers: { 'X-Auth-Token': token, 'X-User-Id': userId },
      timeout: 5000,
    });
    return r.data && r.data.id ? r.data : null;
  } catch (e) {
    return null;
  }
}

const app = express();
app.use(cors());
app.get('/health', (req, res) => {
  res.json({ ok: true, rooms: rooms.size, uptime: process.uptime() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  pingInterval: 25000,
  pingTimeout: 60000,
});

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
  console.log(`[sfu+] ${user.id}`);

  socket.on('join', async ({ roomId }, cb) => {
    try {
      const room = await getOrCreateRoom(roomId);
      const peer = {
        id: user.id,
        socket,
        transports: new Map(),
        producers: new Map(),
        consumers: new Map(),
      };
      room.peers.set(user.id, peer);
      socket.data.roomId = roomId;
      socket.join(`room:${roomId}`);
      cb({
        rtpCapabilities: room.router.rtpCapabilities,
        peers: Array.from(room.peers.keys()).filter((id) => id !== user.id),
      });
      socket.to(`room:${roomId}`).emit('peer-joined', { peerId: user.id });
    } catch (e) {
      console.error('join error', e);
      cb({ error: e.message });
    }
  });

  socket.on('createTransport', async ({ direction }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      if (!room) return cb({ error: 'no room' });
      const peer = room.peers.get(user.id);
      const { transport, params } = await createWebRtcTransport(room.router);
      peer.transports.set(transport.id, { transport, direction });
      transport.on('dtlsstatechange', (s) => {
        if (s === 'closed') transport.close();
      });
      cb({ params });
    } catch (e) {
      cb({ error: e.message });
    }
  });

  socket.on('connectTransport', async ({ transportId, dtlsParameters }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      const peer = room.peers.get(user.id);
      const t = peer.transports.get(transportId);
      await t.transport.connect({ dtlsParameters });
      cb({ ok: true });
    } catch (e) {
      cb({ error: e.message });
    }
  });

  socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      const peer = room.peers.get(user.id);
      const t = peer.transports.get(transportId);
      const producer = await t.transport.produce({ kind, rtpParameters, appData });
      peer.producers.set(producer.id, producer);
      producer.on('transportclose', () => {
        producer.close();
        peer.producers.delete(producer.id);
      });
      socket.to(`room:${socket.data.roomId}`).emit('new-producer', {
        peerId: user.id,
        producerId: producer.id,
        kind,
        appData,
      });
      cb({ id: producer.id });
    } catch (e) {
      cb({ error: e.message });
    }
  });

  socket.on('consume', async ({ producerId, rtpCapabilities, transportId }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      if (!room.router.canConsume({ producerId, rtpCapabilities })) {
        return cb({ error: 'cannot consume' });
      }
      const peer = room.peers.get(user.id);
      const t = peer.transports.get(transportId);
      const consumer = await t.transport.consume({
        producerId,
        rtpCapabilities,
        paused: false,
      });
      peer.consumers.set(consumer.id, consumer);
      consumer.on('transportclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
      });
      consumer.on('producerclose', () => {
        consumer.close();
        peer.consumers.delete(consumer.id);
        socket.emit('consumer-closed', { consumerId: consumer.id });
      });
      cb({
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (e) {
      cb({ error: e.message });
    }
  });

  socket.on('getProducers', (cb) => {
    const room = rooms.get(socket.data.roomId);
    if (!room) return cb([]);
    const list = [];
    for (const [pid, peer] of room.peers) {
      if (pid === user.id) continue;
      for (const [, producer] of peer.producers) {
        list.push({
          peerId: pid,
          producerId: producer.id,
          kind: producer.kind,
          appData: producer.appData,
        });
      }
    }
    cb(list);
  });

  socket.on('producer-pause', async ({ producerId }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      const peer = room.peers.get(user.id);
      const p = peer.producers.get(producerId);
      if (p) await p.pause();
      cb({ ok: true });
    } catch (e) {
      cb({ error: e.message });
    }
  });

  socket.on('producer-resume', async ({ producerId }, cb) => {
    try {
      const room = rooms.get(socket.data.roomId);
      const peer = room.peers.get(user.id);
      const p = peer.producers.get(producerId);
      if (p) await p.resume();
      cb({ ok: true });
    } catch (e) {
      cb({ error: e.message });
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const peer = room.peers.get(user.id);
    if (peer) {
      for (const [, t] of peer.transports) t.transport.close();
      room.peers.delete(user.id);
    }
    socket.to(`room:${roomId}`).emit('peer-left', { peerId: user.id });
    if (room.peers.size === 0) {
      room.router.close();
      rooms.delete(roomId);
    }
    console.log(`[sfu-] ${user.id}`);
  });
});

(async () => {
  await createWorker();
  server.listen(config.listenPort, '0.0.0.0', () => {
    console.log(`SFU on :${config.listenPort}, announcedIp ${config.announcedIp}`);
  });
})();
