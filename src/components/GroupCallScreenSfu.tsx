import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/icon';
import { useSfuCall, RemotePeer } from '@/hooks/useSfuCall';

interface Props {
  roomId: string;
  roomName: string;
  mode: 'audio' | 'video';
  myId: string;
  myName: string;
  token: string;
  onEnd: () => void;
}

const GroupCallScreenSfu = ({ roomId, roomName, mode, myId, myName, token, onEnd }: Props) => {
  const {
    localStream, peers, connected, error, muted, cameraOff,
    hasMultipleCameras, switchingCamera, toggleMute, toggleCamera, switchCamera, leave,
  } = useSfuCall({ userId: myId, token, roomId, mode, enabled: true });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const el = localVideoRef.current;
    if (!el || !localStream) return;
    el.srcObject = localStream;
    el.muted = true;
    el.playsInline = true;
    const tryPlay = () => el.play().catch((e) => console.warn('[SFU] local video play blocked', e));
    if (el.readyState >= 1) tryPlay();
    el.onloadedmetadata = tryPlay;
    return () => { el.onloadedmetadata = null; };
  }, [localStream]);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const hangup = () => {
    leave();
    onEnd();
  };

  const peerList = Object.values(peers);
  const total = peerList.length + 1;
  const cols = total <= 1 ? '1fr' : total <= 2 ? '1fr 1fr' : total <= 4 ? '1fr 1fr' : '1fr 1fr 1fr';
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3 bg-black/30">
        <div>
          <p className="text-white font-bold text-lg">{roomName}</p>
          <p className="text-white/50 text-sm">
            {!connected ? 'Подключение...' : `${total} участн. · ${fmt(seconds)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
          <Icon name={mode === 'video' ? 'Video' : 'Phone'} size={13} className="text-white/60" />
          <span className="text-white/60 text-xs">{mode === 'video' ? 'Видео' : 'Аудио'}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-300 text-xs px-4 py-2 text-center">{error}</div>
      )}

      {mode === 'video' ? (
        <div
          className="flex-1 p-1 grid gap-1 overflow-hidden"
          style={{ gridTemplateColumns: cols, alignContent: 'start' }}
        >
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraOff || !localStream ? 'opacity-0' : ''}`}
            />
            {(cameraOff || !localStream) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {myName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {!localStream && (
                  <p className="text-white/60 text-[11px] text-center">
                    Камера не активна. Разреши доступ в браузере.
                  </p>
                )}
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded-full">
              <span className="text-white text-[11px]">Вы</span>
            </div>
          </div>
          {peerList.map((p) => (
            <RemoteTile key={p.peerId} peer={p} />
          ))}
          {peerList.length === 0 && (
            <div className="col-span-2 flex items-center justify-center py-10">
              <p className="text-white/25 text-sm">Ожидание участников...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-wrap gap-5 px-6 pt-8 content-start">
          <AudioBubble name={`${myName} (Вы)`} muted={muted} />
          {peerList.map((p) => (
            <AudioBubble key={p.peerId} name={p.peerId} muted={false} stream={p.audioStream} />
          ))}
          {peerList.length === 0 && (
            <p className="w-full text-center text-white/25 text-sm mt-6">Ожидание участников...</p>
          )}
        </div>
      )}

      <div className="px-6 pb-12 pt-4 flex items-center justify-center gap-5">
        <button
          onClick={toggleMute}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
            muted ? 'bg-red-500/20 border border-red-500/40' : 'bg-white/10'
          }`}
        >
          <Icon
            name={muted ? 'MicOff' : 'Mic'}
            size={22}
            className={muted ? 'text-red-400' : 'text-white'}
          />
        </button>
        {mode === 'video' && (
          <button
            onClick={toggleCamera}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
              cameraOff ? 'bg-red-500/20 border border-red-500/40' : 'bg-white/10'
            }`}
          >
            <Icon
              name={cameraOff ? 'VideoOff' : 'Video'}
              size={22}
              className={cameraOff ? 'text-red-400' : 'text-white'}
            />
          </button>
        )}
        {mode === 'video' && (
          <button
            onClick={switchCamera}
            disabled={switchingCamera || cameraOff}
            title={hasMultipleCameras ? 'Сменить камеру' : 'Только одна камера'}
            className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center transition-colors disabled:opacity-40"
          >
            {switchingCamera ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Icon name="SwitchCamera" size={22} className="text-white" />
            )}
          </button>
        )}
        <button
          onClick={hangup}
          className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        >
          <Icon name="PhoneOff" size={26} className="text-white" />
        </button>
      </div>
    </div>
  );
};

const RemoteTile = ({ peer }: { peer: RemotePeer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (videoRef.current && peer.videoStream) videoRef.current.srcObject = peer.videoStream;
  }, [peer.videoStream]);
  useEffect(() => {
    if (audioRef.current && peer.audioStream) audioRef.current.srcObject = peer.audioStream;
  }, [peer.audioStream]);
  return (
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-video">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {!peer.videoStream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-white font-bold text-xl">
              {peer.peerId.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded-full">
        <span className="text-white text-[11px]">{peer.peerId}</span>
      </div>
    </div>
  );
};

const AudioBubble = ({
  name,
  muted,
  stream,
}: {
  name: string;
  muted: boolean;
  stream?: MediaStream;
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && stream) audioRef.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="flex flex-col items-center gap-2 w-20">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-[#fe2c55]/30 to-[#8b5cf6]/30 border border-white/10 flex items-center justify-center">
        <span className="text-white font-bold text-xl">{name.charAt(0).toUpperCase()}</span>
        {muted && (
          <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
            <Icon name="MicOff" size={10} className="text-white" />
          </div>
        )}
      </div>
      <span className="text-white/50 text-[10px] text-center truncate w-full">{name}</span>
    </div>
  );
};

export default GroupCallScreenSfu;