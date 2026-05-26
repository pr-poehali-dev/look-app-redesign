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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const videoDevicesRef = useRef<MediaDeviceInfo[]>([]);
  const currentDeviceIdRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || !userId || !roomId) return;
    let cancelled = false;

    const start = async () => {
      try {
        const videoConstraints = mode === 'video'
          ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
          : false;
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: HQ_AUDIO_CONSTRAINTS,
            video: videoConstraints,
          });
        } catch (mediaErr) {
          // Fallback: упрощённые ограничения (некоторые камеры не поддерживают 1280×720)
          console.warn('[useSfuCall] strict constraints failed, fallback', mediaErr);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === 'video' ? { facingMode: 'user' } : false,
          });
        }
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        applyAudioTrackTuning(stream);
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Запоминаем какое устройство сейчас используется
        const curTrack = stream.getVideoTracks()[0];
        if (curTrack) {
          const settings = curTrack.getSettings();
          currentDeviceIdRef.current = settings.deviceId || '';
        }

        // Список всех видео-устройств для кнопки «Сменить камеру»
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const cams = devices.filter((d) => d.kind === 'videoinput');
          videoDevicesRef.current = cams;
          if (!cancelled) setHasMultipleCameras(cams.length > 1);
        } catch { /* ignore */ }

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

  const switchCamera = useCallback(async () => {
    if (mode !== 'video' || switchingCamera) return;
    setSwitchingCamera(true);
    try {
      // Перечитываем устройства — после разрешения уже есть labels и реальный список
      let cams = videoDevicesRef.current;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        cams = devices.filter((d) => d.kind === 'videoinput');
        videoDevicesRef.current = cams;
        setHasMultipleCameras(cams.length > 1);
      } catch { /* ignore */ }

      // Перед сменой обязательно останавливаем старый трек,
      // иначе на Windows/macOS вторая камера занята и getUserMedia упадёт.
      const oldTrack = localStreamRef.current?.getVideoTracks()[0];
      const oldDeviceId = oldTrack?.getSettings().deviceId || currentDeviceIdRef.current;

      let newStream: MediaStream | null = null;

      if (cams.length > 1) {
        const idx = Math.max(0, cams.findIndex((c) => c.deviceId === oldDeviceId));
        const nextDev = cams[(idx + 1) % cams.length];
        if (oldTrack) oldTrack.stop();
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: nextDev.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          });
          currentDeviceIdRef.current = nextDev.deviceId;
        } catch (e) {
          console.warn('[useSfuCall] switch by deviceId failed', e);
        }
      }

      // Фолбэк через facingMode (для мобильных и если deviceId не сработал)
      if (!newStream) {
        const nextFacing = facingMode === 'user' ? 'environment' : 'user';
        if (oldTrack && oldTrack.readyState !== 'ended') oldTrack.stop();
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: nextFacing } },
          });
          setFacingMode(nextFacing);
        } catch (e) {
          console.warn('[useSfuCall] switch by facingMode failed', e);
        }
      }

      if (!newStream) {
        // Совсем ничего не получилось — пытаемся восстановить прежнюю камеру
        try {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: oldDeviceId ? { deviceId: { ideal: oldDeviceId } } : true,
          });
        } catch (e) {
          console.error('[useSfuCall] restore camera failed', e);
          return;
        }
      }

      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      // Меняем трек у SFU-продьюсера
      if (clientRef.current) {
        try {
          await clientRef.current.replaceVideoTrack(newTrack);
        } catch (e) {
          console.warn('[useSfuCall] replaceVideoTrack failed', e);
        }
      }

      // Меняем трек в локальном стриме (для превью «Вы»)
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          if (t !== newTrack) {
            localStreamRef.current!.removeTrack(t);
            if (t.readyState !== 'ended') t.stop();
          }
        });
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }
    } catch (e) {
      console.warn('[useSfuCall] switchCamera failed', e);
    } finally {
      setSwitchingCamera(false);
    }
  }, [mode, facingMode, switchingCamera]);

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
    facingMode,
    hasMultipleCameras,
    switchingCamera,
    toggleMute,
    toggleCamera,
    switchCamera,
    leave,
  };
}