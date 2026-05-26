import { io, Socket } from 'socket.io-client';
import { Device, types as msTypes } from 'mediasoup-client';
import { SFU_URL } from './config';

export type RemoteStream = {
  peerId: string;
  stream: MediaStream;
  kind: 'audio' | 'video';
  consumerId: string;
};

export type SfuClientOptions = {
  userId: string;
  token: string;
  roomId: string;
  onPeerJoined?: (peerId: string) => void;
  onPeerLeft?: (peerId: string) => void;
  onRemoteStream?: (s: RemoteStream) => void;
  onConsumerClosed?: (consumerId: string) => void;
};

export class SfuClient {
  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: msTypes.Transport | null = null;
  private recvTransport: msTypes.Transport | null = null;
  private producers = new Map<string, msTypes.Producer>();
  private consumers = new Map<string, msTypes.Consumer>();
  private opts: SfuClientOptions;

  constructor(opts: SfuClientOptions) {
    this.opts = opts;
  }

  async connect(): Promise<void> {
    this.socket = io(SFU_URL, {
      transports: ['websocket'],
      auth: { userId: this.opts.userId, token: this.opts.token },
    });

    await new Promise<void>((resolve, reject) => {
      this.socket!.on('connect', () => resolve());
      this.socket!.on('connect_error', (e) => reject(e));
    });

    const joinRes = await this.emit<{
      rtpCapabilities: msTypes.RtpCapabilities;
      peers: string[];
      error?: string;
    }>('join', { roomId: this.opts.roomId });
    if (joinRes.error) throw new Error(joinRes.error);

    this.device = new Device();
    await this.device.load({ routerRtpCapabilities: joinRes.rtpCapabilities });

    await this.createSendTransport();
    await this.createRecvTransport();

    this.socket.on('peer-joined', ({ peerId }: { peerId: string }) => {
      this.opts.onPeerJoined?.(peerId);
    });
    this.socket.on('peer-left', ({ peerId }: { peerId: string }) => {
      this.opts.onPeerLeft?.(peerId);
    });
    this.socket.on(
      'new-producer',
      async ({ peerId, producerId, kind }: { peerId: string; producerId: string; kind: 'audio' | 'video' }) => {
        await this.consume(peerId, producerId, kind);
      },
    );
    this.socket.on('consumer-closed', ({ consumerId }: { consumerId: string }) => {
      const c = this.consumers.get(consumerId);
      if (c) c.close();
      this.consumers.delete(consumerId);
      this.opts.onConsumerClosed?.(consumerId);
    });

    const existing = await this.emit<Array<{ peerId: string; producerId: string; kind: 'audio' | 'video' }>>(
      'getProducers',
      {},
    );
    for (const p of existing) {
      await this.consume(p.peerId, p.producerId, p.kind);
    }
  }

  private async createSendTransport(): Promise<void> {
    const { params, error } = await this.emit<{ params: msTypes.TransportOptions; error?: string }>(
      'createTransport',
      { direction: 'send' },
    );
    if (error) throw new Error(error);
    this.sendTransport = this.device!.createSendTransport(params);
    this.sendTransport.on('connect', ({ dtlsParameters }, cb, errb) => {
      this.emit('connectTransport', { transportId: this.sendTransport!.id, dtlsParameters })
        .then(() => cb())
        .catch(errb);
    });
    this.sendTransport.on('produce', async ({ kind, rtpParameters, appData }, cb, errb) => {
      try {
        const r = await this.emit<{ id: string; error?: string }>('produce', {
          transportId: this.sendTransport!.id,
          kind,
          rtpParameters,
          appData,
        });
        if (r.error) throw new Error(r.error);
        cb({ id: r.id });
      } catch (e) {
        errb(e as Error);
      }
    });
  }

  private async createRecvTransport(): Promise<void> {
    const { params, error } = await this.emit<{ params: msTypes.TransportOptions; error?: string }>(
      'createTransport',
      { direction: 'recv' },
    );
    if (error) throw new Error(error);
    this.recvTransport = this.device!.createRecvTransport(params);
    this.recvTransport.on('connect', ({ dtlsParameters }, cb, errb) => {
      this.emit('connectTransport', { transportId: this.recvTransport!.id, dtlsParameters })
        .then(() => cb())
        .catch(errb);
    });
  }

  async publish(stream: MediaStream): Promise<void> {
    if (!this.sendTransport) throw new Error('no send transport');
    for (const track of stream.getTracks()) {
      const producer = await this.sendTransport.produce({ track });
      this.producers.set(producer.id, producer);
    }
  }

  private async consume(peerId: string, producerId: string, kind: 'audio' | 'video'): Promise<void> {
    if (!this.recvTransport || !this.device) return;
    const r = await this.emit<{
      id: string;
      producerId: string;
      kind: 'audio' | 'video';
      rtpParameters: msTypes.RtpParameters;
      error?: string;
    }>('consume', {
      producerId,
      rtpCapabilities: this.device.rtpCapabilities,
      transportId: this.recvTransport.id,
    });
    if (r.error) return;
    const consumer = await this.recvTransport.consume({
      id: r.id,
      producerId: r.producerId,
      kind: r.kind,
      rtpParameters: r.rtpParameters,
    });
    this.consumers.set(consumer.id, consumer);
    const stream = new MediaStream([consumer.track]);
    this.opts.onRemoteStream?.({ peerId, stream, kind, consumerId: consumer.id });
  }

  async pauseProducer(kind: 'audio' | 'video'): Promise<void> {
    for (const [, p] of this.producers) {
      if (p.kind === kind) {
        p.pause();
        await this.emit('producer-pause', { producerId: p.id });
      }
    }
  }

  async resumeProducer(kind: 'audio' | 'video'): Promise<void> {
    for (const [, p] of this.producers) {
      if (p.kind === kind) {
        p.resume();
        await this.emit('producer-resume', { producerId: p.id });
      }
    }
  }

  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    for (const [, p] of this.producers) {
      if (p.kind === 'video') {
        await p.replaceTrack({ track });
      }
    }
  }

  close(): void {
    for (const [, c] of this.consumers) c.close();
    for (const [, p] of this.producers) p.close();
    this.consumers.clear();
    this.producers.clear();
    if (this.sendTransport) this.sendTransport.close();
    if (this.recvTransport) this.recvTransport.close();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private emit<T>(event: string, data: unknown): Promise<T> {
    return new Promise((resolve) => {
      this.socket!.emit(event, data, (response: T) => resolve(response));
    });
  }
}