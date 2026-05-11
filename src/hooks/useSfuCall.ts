import { useCallback, useEffect, useRef, useState } from 'react';
import { SfuClient, RemoteStream } from '@/lib/webrtc';
import { HQ_AUDIO_CONSTRAINTS, applyAudioTrackTuning } from '@/lib/audioConstraints';

type Options = {
  userId: string;
  token: string;
  roomId: string;
  mode: 'audio' | 'video';
  enabled: boolean;
};

export type RemotePeer = {
  peerId: string;
  audioStream?: MediaStream;
  videoStream?: MediaStream;
};

export function useSfuCall({ userId, token, roomId, mode, enabled }: Options) {
  const clientRef = useRef<SfuClient | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RemotePeer>>({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    if (!enabled || !userId || !roomId) return;
    let cancelled = false;

    const start = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          audio: HQ_AUDIO_CONSTRAINTS,
          video: mode === 'video' ? { width: 1280, height: 720 } : false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        applyAudioTrackTuning(stream);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const client = new SfuClient({
          userId,
          token,
          roomId,
          onPeerJoined: (peerId) => {
            setPeers((p) => ({ ...p, [peerId]: { peerId, ...(p[peerId] || {}) } }));
          },
          onPeerLeft: (peerId) => {
            setPeers((p) => {
              const next = { ...p };
              delete next[peerId];
              return next;
            });
          },
          onRemoteStream: ({ peerId, stream: rs, kind }) => {
            setPeers((p) => {
              const prev = p[peerId] || { peerId };
              return {
                ...p,
                [peerId]: {
                  ...prev,
                  ...(kind === 'audio' ? { audioStream: rs } : { videoStream: rs }),
                },
              };
            });
          },
        });
        clientRef.current = client;
        await client.connect();
        await client.publish(stream);
        if (!cancelled) setConnected(true);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setLocalStream(null);
      setPeers({});
      setConnected(false);
    };
  }, [enabled, userId, token, roomId, mode]);

  const toggleMute = useCallback(async () => {
    const next = !muted;
    setMuted(next);
    if (clientRef.current) {
      if (next) await clientRef.current.pauseProducer('audio');
      else await clientRef.current.resumeProducer('audio');
    }
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !next));
    }
  }, [muted]);

  const toggleCamera = useCallback(async () => {
    const next = !cameraOff;
    setCameraOff(next);
    if (clientRef.current) {
      if (next) await clientRef.current.pauseProducer('video');
      else await clientRef.current.resumeProducer('video');
    }
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !next));
    }
  }, [cameraOff]);

  const leave = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setPeers({});
    setConnected(false);
  }, []);

  return {
    localStream,
    peers,
    connected,
    error,
    muted,
    cameraOff,
    toggleMute,
    toggleCamera,
    leave,
  };
}