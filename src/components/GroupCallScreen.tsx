import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface PeerEntry {
  id: string;
  name: string;
  pc: RTCPeerConnection;
  stream: MediaStream | null;
}

interface GroupCallScreenProps {
  roomId: string;
  roomName: string;
  mode: "audio" | "video";
  myId: string;
  myName: string;
  onEnd: () => void;
}

const GroupCallScreen = ({ roomId, roomName, mode, myId, myName, onEnd }: GroupCallScreenProps) => {
  const [peers, setPeers] = useState<PeerEntry[]>([]);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<"connecting" | "connected">("connecting");

  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peersMapRef = useRef<Map<string, PeerEntry>>(new Map());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigRef = useRef(0);

  const sendSig = useCallback(async (toUser: string, type: string, payload: unknown) => {
    await fetch(`${API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": myId, "X-User-Name": myName },
      body: JSON.stringify({ room_id: roomId, to_user: toUser, type, payload }),
    }).catch(() => {});
  }, [myId, myName, roomId]);

  const syncPeers = () => setPeers(Array.from(peersMapRef.current.values()));

  const getOrCreatePC = useCallback((peerId: string, peerName: string): RTCPeerConnection => {
    const existing = peersMapRef.current.get(peerId);
    if (existing) return existing.pc;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const entry: PeerEntry = { id: peerId, name: peerName, pc, stream: null };
    peersMapRef.current.set(peerId, entry);
    syncPeers();

    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

    pc.ontrack = (e) => {
      entry.stream = e.streams[0];
      peersMapRef.current.set(peerId, { ...entry, stream: e.streams[0] });
      syncPeers();
      setStatus("connected");
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSig(peerId, "g_ice", { c: e.candidate.toJSON(), n: myName });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        peersMapRef.current.delete(peerId);
        syncPeers();
      }
    };

    return pc;
  }, [myName, sendSig]);

  const handleSig = useCallback(async (sig: { id: number; from_user: string; type: string; payload: Record<string, unknown> }) => {
    lastSigRef.current = sig.id;
    const fid = sig.from_user;
    const fname = (sig.payload?.n as string) || fid;
    if (fid === myId) return;

    if (sig.type === "g_join") {
      const pc = getOrCreatePC(fid, fname);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
      await pc.setLocalDescription(offer);
      await sendSig(fid, "g_offer", { sdp: offer, n: myName });
      setStatus("connected");
    } else if (sig.type === "g_offer") {
      const pc = getOrCreatePC(fid, fname);
      if (pc.signalingState !== "stable") return;
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSig(fid, "g_answer", { sdp: answer, n: myName });
    } else if (sig.type === "g_answer") {
      const entry = peersMapRef.current.get(fid);
      if (entry && entry.pc.signalingState === "have-local-offer") {
        await entry.pc.setRemoteDescription(new RTCSessionDescription(sig.payload.sdp as RTCSessionDescriptionInit));
        setStatus("connected");
      }
    } else if (sig.type === "g_ice") {
      const entry = peersMapRef.current.get(fid);
      if (entry) {
        try { await entry.pc.addIceCandidate(new RTCIceCandidate(sig.payload.c as RTCIceCandidateInit)); } catch (e) { void e; }
      }
    } else if (sig.type === "g_leave") {
      const entry = peersMapRef.current.get(fid);
      if (entry) entry.pc.close();
      peersMapRef.current.delete(fid);
      syncPeers();
    }
  }, [getOrCreatePC, mode, myId, myName, sendSig]);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === "video" });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch (e) { void e; }

      await sendSig(roomId, "g_join", { n: myName });

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API}?module=signal&room_id=${roomId}&since_id=${lastSigRef.current}`,
            { headers: { "X-User-Id": myId, "X-User-Name": myName } });
          const raw = await res.json();
          const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          for (const sig of data.signals || []) await handleSig(sig);
        } catch (e) { void e; }
      }, 1000);

      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    };
    start();
    return () => {
      mounted = false;
      if (pollRef.current) clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      peersMapRef.current.forEach(p => p.pc.close());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const hangup = async () => {
    await sendSig(roomId, "g_leave", { n: myName });
    if (pollRef.current) clearInterval(pollRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    peersMapRef.current.forEach(p => p.pc.close());
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    onEnd();
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const total = peers.length + 1;
  const cols = total <= 1 ? "1fr" : total <= 2 ? "1fr 1fr" : total <= 4 ? "1fr 1fr" : "1fr 1fr 1fr";

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3 bg-black/30">
        <div>
          <p className="text-white font-bold text-lg">{roomName}</p>
          <p className="text-white/50 text-sm">
            {status === "connecting" ? "Подключение..." : `${total} участн. · ${fmt(seconds)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
          <Icon name={mode === "video" ? "Video" : "Phone"} size={13} className="text-white/60" />
          <span className="text-white/60 text-xs">{mode === "video" ? "Видео" : "Аудио"}</span>
        </div>
      </div>

      {mode === "video" ? (
        <div className="flex-1 p-1 grid gap-1 overflow-hidden" style={{ gridTemplateColumns: cols, alignContent: "start" }}>
          <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-video">
            <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${cameraOff ? "opacity-0" : ""}`} />
            {cameraOff && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{myName.charAt(0).toUpperCase()}</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded-full">
              <span className="text-white text-[11px]">Вы</span>
            </div>
          </div>
          {peers.map(peer => <RemoteVideoTile key={peer.id} peer={peer} />)}
          {peers.length === 0 && (
            <div className="col-span-2 flex items-center justify-center py-10">
              <p className="text-white/25 text-sm">Ожидание участников...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-wrap gap-5 px-6 pt-8 content-start">
          <AudioBubble name={`${myName} (Вы)`} muted={muted} />
          {peers.map(p => <AudioBubble key={p.id} name={p.name} muted={false} />)}
          {peers.length === 0 && (
            <p className="w-full text-center text-white/25 text-sm mt-6">Ожидание участников...</p>
          )}
        </div>
      )}

      <div className="px-6 pb-12 pt-4 flex items-center justify-center gap-5">
        <button
          onClick={() => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = muted; }); setMuted(!muted); }}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${muted ? "bg-red-500/20 border border-red-500/40" : "bg-white/10"}`}
        >
          <Icon name={muted ? "MicOff" : "Mic"} size={22} className={muted ? "text-red-400" : "text-white"} />
        </button>
        {mode === "video" && (
          <button
            onClick={() => { localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = cameraOff; }); setCameraOff(!cameraOff); }}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${cameraOff ? "bg-red-500/20 border border-red-500/40" : "bg-white/10"}`}
          >
            <Icon name={cameraOff ? "VideoOff" : "Video"} size={22} className={cameraOff ? "text-red-400" : "text-white"} />
          </button>
        )}
        <button onClick={hangup} className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
          <Icon name="PhoneOff" size={26} className="text-white" />
        </button>
      </div>
    </div>
  );
};

const RemoteVideoTile = ({ peer }: { peer: PeerEntry }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && peer.stream) ref.current.srcObject = peer.stream; }, [peer.stream]);
  return (
    <div className="relative rounded-2xl overflow-hidden bg-zinc-900 aspect-video">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      {!peer.stream && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-white font-bold text-xl">{peer.name.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-2 bg-black/60 px-2 py-0.5 rounded-full">
        <span className="text-white text-[11px]">{peer.name}</span>
      </div>
    </div>
  );
};

const AudioBubble = ({ name, muted }: { name: string; muted: boolean }) => (
  <div className="flex flex-col items-center gap-2 w-20">
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

export default GroupCallScreen;
