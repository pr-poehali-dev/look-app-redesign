import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface CallScreenProps {
  name: string;
  avatar: string;
  mode: "audio" | "video";
  myId: string;
  peerId: string;
  onEnd: () => void;
}

const CallScreen = ({ name, avatar, mode, myId, peerId, onEnd }: CallScreenProps) => {
  const roomId = `call_${[myId, peerId].sort().join("_")}`;

  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(mode === "video");
  const [cameraOff, setCameraOff] = useState(false);
  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigIdRef = useRef(0);
  const isCaller = useRef(myId > peerId);

  const sendSignal = async (type: string, payload: unknown) => {
    try {
      await fetch(`${API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({ room_id: roomId, to_user: peerId, type, payload }),
      });
    } catch (e) { void e; }
  };

  const handleSignal = async (pc: RTCPeerConnection, sig: { id: number; type: string; payload: unknown }) => {
    lastSigIdRef.current = sig.id;
    if (sig.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal("answer", answer);
      setStatus("connected");
    } else if (sig.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
      setStatus("connected");
    } else if (sig.type === "ice") {
      try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit)); } catch (e) { void e; }
    } else if (sig.type === "end") {
      hangup();
    }
  };

  const startPoll = (pc: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}?module=signal&room_id=${roomId}&since_id=${lastSigIdRef.current}`,
          { headers: { "X-User-Id": myId } }
        );
        const data = await res.json();
        for (const sig of data.signals || []) {
          await handleSignal(pc, sig);
        }
      } catch (e) { void e; }
    }, 1000);
  };

  useEffect(() => {
    let pc: RTCPeerConnection;

    const start = async () => {
      setStatus("connecting");
      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (e) { void e; }

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
        setStatus("connected");
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal("ice", e.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") setStatus("ended");
      };

      startPoll(pc);

      if (isCaller.current) {
        setStatus("ringing");
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
      }
    };

    start();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  const hangup = () => {
    sendSignal("end", {});
    if (pollRef.current) clearInterval(pollRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    onEnd();
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted((v) => !v);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = cameraOff; });
    setCameraOff((v) => !v);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusLabel = {
    connecting: "Подключение...",
    ringing: "Вызов...",
    connected: formatTime(seconds),
    ended: "Завершено",
  }[status];

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Background */}
      <div className="absolute inset-0">
        {mode === "video" ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={avatar} className="w-full h-full object-cover" alt="" />
        )}
        <div className={`absolute inset-0 ${mode === "video" ? "bg-black/40" : "bg-black/75 backdrop-blur-xl"}`} />
      </div>

      {/* Local video (picture-in-picture) */}
      {mode === "video" && !cameraOff && (
        <div className="absolute bottom-36 right-4 w-24 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-white text-[10px] bg-black/40 rounded px-1">Вы</span>
          </div>
        </div>
      )}

      {/* Top info */}
      <div className="relative z-20 flex flex-col items-center pt-20 pb-6">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl mb-4">
          <img src={avatar} className="w-full h-full object-cover" alt={name} />
        </div>
        <h2 className="text-white font-bold text-2xl mb-1">{name}</h2>
        <p className="text-white/60 text-sm">
          {status === "connecting" || status === "ringing" ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
              <span className="ml-1">{statusLabel}</span>
            </span>
          ) : statusLabel}
        </p>
        <div className="mt-2 flex items-center gap-1 text-white/40 text-xs">
          <Icon name={mode === "video" ? "Video" : "Phone"} size={12} />
          <span>{mode === "video" ? "Видеозвонок" : "Аудиозвонок"}</span>
        </div>
      </div>

      <div className="flex-1" />

      {/* Controls */}
      <div className="relative z-20 pb-16 px-8">
        <div className="flex items-center justify-around mb-8">
          <button onClick={toggleMute} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white" : "bg-white/20"}`}>
              <Icon name={muted ? "MicOff" : "Mic"} size={22} className={muted ? "text-black" : "text-white"} />
            </div>
            <span className="text-white/60 text-xs">{muted ? "Включить" : "Выключить"}</span>
          </button>

          {mode === "video" && (
            <button onClick={toggleCamera} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cameraOff ? "bg-white" : "bg-white/20"}`}>
                <Icon name={cameraOff ? "VideoOff" : "Video"} size={22} className={cameraOff ? "text-black" : "text-white"} />
              </div>
              <span className="text-white/60 text-xs">Камера</span>
            </button>
          )}

          <button onClick={() => setSpeakerOn((v) => !v)} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${speakerOn ? "bg-white" : "bg-white/20"}`}>
              <Icon name={speakerOn ? "Volume2" : "VolumeX"} size={22} className={speakerOn ? "text-black" : "text-white"} />
            </div>
            <span className="text-white/60 text-xs">Динамик</span>
          </button>

          <button className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name="MoreHorizontal" size={22} className="text-white" />
            </div>
            <span className="text-white/60 text-xs">Ещё</span>
          </button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={hangup}
            className="w-16 h-16 rounded-full bg-[#fe2c55] flex items-center justify-center shadow-[0_0_30px_rgba(254,44,85,0.5)] hover:scale-110 active:scale-95 transition-all"
          >
            <Icon name="PhoneOff" size={26} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
