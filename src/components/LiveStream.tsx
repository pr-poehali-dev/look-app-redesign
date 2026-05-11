import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchIceServers, RTC_CONFIG } from "@/lib/webrtc-config";
import LiveStreamCameraPrompt from "./live-stream/LiveStreamCameraPrompt";
import LiveStreamStartForm from "./live-stream/LiveStreamStartForm";
import LiveStreamHeader from "./live-stream/LiveStreamHeader";
import LiveStreamOverlay from "./live-stream/LiveStreamOverlay";

const STREAMS_API = "https://functions.poehali.dev/54ce632b-903a-4de7-8f5f-e81fa2f42053";
const SIGNAL_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const FAKE_VIEWERS = [
  { id: 1, name: "max_pro", text: "🔥🔥🔥 огонь!", color: "#fe2c55" },
  { id: 2, name: "anya_smile", text: "Привет из Москвы!", color: "#61d4f0" },
  { id: 3, name: "user_777", text: "давно ждал этот стрим", color: "#a78bfa" },
  { id: 4, name: "kofe_lav", text: "❤️❤️❤️", color: "#fb923c" },
  { id: 5, name: "travel_boy", text: "Подписался!", color: "#34d399" },
  { id: 6, name: "night_owl", text: "красота 😍", color: "#f472b6" },
  { id: 7, name: "denis_k", text: "сколько уже идёт?", color: "#fbbf24" },
  { id: 8, name: "masha99", text: "не могу оторваться", color: "#61d4f0" },
  { id: 9, name: "pro_gamer_x", text: "лайк поставил 👍", color: "#fe2c55" },
  { id: 10, name: "sun_rise", text: "топ контент!", color: "#a78bfa" },
];
void FAKE_VIEWERS;

interface ChatMsg { id: number; name: string; text: string; color: string; }
interface Gift { id: number; emoji: string; x: number; }

const LiveStream = ({ onClose }: { onClose: () => void }) => {
  const { user } = useAuth();
  const [camState, setCamState] = useState<"idle" | "granted" | "denied">("idle");
  const streamIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamTitle, setStreamTitle] = useState("");
  const [streamCategory, setStreamCategory] = useState("Общее");
  const [showStartForm, setShowStartForm] = useState(false);
  const viewerPCsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigIdRef = useRef(0);
  const rtcConfigRef = useRef<RTCConfiguration>(RTC_CONFIG);
  const [camErrorMsg, setCamErrorMsg] = useState("");
  const [isLive, setIsLive] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [likes, setLikes] = useState(0);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [inputMsg, setInputMsg] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [flipping, setFlipping] = useState(false);

  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async (facingMode: "user" | "environment" = "user") => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode }, audio: true });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      }
      streamRef.current = stream;
      setCamState("granted");
      setCamErrorMsg("");
    } catch (e: unknown) {
      const err = e as Error;
      setCamErrorMsg(`${err.name}: ${err.message}`);
      setCamState("denied");
    }
  };

  // Привязываем стрим к <video> после каждого рендера
  useEffect(() => {
    const v = videoRef.current;
    const s = streamRef.current;
    if (v && s && v.srcObject !== s) {
      v.srcObject = s;
      v.play().catch(() => {});
    }
  });

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (chatTimerRef.current) clearInterval(chatTimerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (signalPollRef.current) clearInterval(signalPollRef.current);
      viewerPCsRef.current.forEach(pc => { try { pc.close(); } catch { /* ignore */ } });
      viewerPCsRef.current.clear();
      const sid = streamIdRef.current;
      if (sid && user) {
        fetch(STREAMS_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": user.id,
            "X-User-Name": encodeURIComponent(user.name),
          },
          body: JSON.stringify({ action: "stop", stream_id: sid }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const sendSignal = async (toUser: string, type: string, payload: unknown) => {
    if (!user) return;
    const sid = streamIdRef.current;
    if (!sid) return;
    try {
      await fetch(`${SIGNAL_API}?module=signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({
          room_id: `live_${sid}`,
          to_user: toUser,
          type,
          payload,
        }),
      });
    } catch (e) { void e; }
  };

  const handleViewerJoin = async (viewerId: string) => {
    if (!streamRef.current) return;
    if (viewerPCsRef.current.has(viewerId)) return;

    const pc = new RTCPeerConnection(rtcConfigRef.current);
    viewerPCsRef.current.set(viewerId, pc);

    streamRef.current.getTracks().forEach(t => pc.addTrack(t, streamRef.current!));

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(viewerId, "live_ice", e.candidate.toJSON());
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        viewerPCsRef.current.delete(viewerId);
        setViewers(viewerPCsRef.current.size);
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(viewerId, "live_offer", offer);
      setViewers(viewerPCsRef.current.size);
    } catch (e) {
      console.error("[LiveStream] offer failed", e);
    }
  };

  const broadcastToViewers = async (type: string, payload: unknown, exceptUser?: string) => {
    const tasks: Promise<void>[] = [];
    viewerPCsRef.current.forEach((_pc, viewerId) => {
      if (exceptUser && viewerId === exceptUser) return;
      tasks.push(sendSignal(viewerId, type, payload));
    });
    await Promise.all(tasks);
  };

  const handleSignal = async (sig: { id: number; from_user: string; type: string; payload: unknown }) => {
    lastSigIdRef.current = sig.id;
    console.log("[Stream] sig:", sig.type, "from", sig.from_user);
    if (sig.type === "viewer_join") {
      console.log("[Stream] new viewer joining:", sig.from_user);
      await handleViewerJoin(sig.from_user);
    } else if (sig.type === "live_answer") {
      const pc = viewerPCsRef.current.get(sig.from_user);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
        } catch (e) { console.warn("[LiveStream] setRemote answer failed", e); }
      }
    } else if (sig.type === "viewer_ice") {
      const pc = viewerPCsRef.current.get(sig.from_user);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit));
        } catch (e) { console.warn("[LiveStream] addIce failed", e); }
      }
    } else if (sig.type === "viewer_leave") {
      const pc = viewerPCsRef.current.get(sig.from_user);
      if (pc) {
        try { pc.close(); } catch { /* ignore */ }
        viewerPCsRef.current.delete(sig.from_user);
        setViewers(viewerPCsRef.current.size);
      }
    } else if (sig.type === "live_chat" && sig.payload) {
      const p = sig.payload as { name?: string; text?: string; color?: string; author?: boolean };
      if (p.text) {
        const relayMsg = {
          name: p.name || "Зритель",
          text: p.text,
          color: p.color || "#61d4f0",
          author: !!p.author,
        };
        setChat(prev => [...prev.slice(-30), {
          id: Date.now() + Math.random(),
          name: relayMsg.name,
          text: relayMsg.text,
          color: relayMsg.color,
        }]);
        broadcastToViewers("live_chat", relayMsg, sig.from_user).catch(() => {});
      }
    } else if (sig.type === "live_like") {
      setLikes(l => l + 1);
    }
  };

  const startBroadcastSignaling = () => {
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    lastSigIdRef.current = 0;
    signalPollRef.current = setInterval(async () => {
      if (!user || !streamIdRef.current) return;
      try {
        const res = await fetch(
          `${SIGNAL_API}?module=signal&room_id=live_${streamIdRef.current}&since_id=${lastSigIdRef.current}`,
          { headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) } }
        );
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        for (const sig of data.signals || []) await handleSignal(sig);
      } catch (e) { void e; }
    }, 3000);
  };

  const startLive = async () => {
    if (!user) {
      alert("Войди, чтобы запустить эфир");
      return;
    }
    const title = streamTitle.trim() || `Эфир ${user.name}`;
    try {
      const res = await fetch(STREAMS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({
          action: "start",
          title,
          category: streamCategory,
          user_avatar: user.avatar || "",
        }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.stream_id) streamIdRef.current = data.stream_id;
    } catch (e) {
      console.error("[LiveStream] start failed", e);
    }

    setShowStartForm(false);
    setIsLive(true);
    setViewers(0);
    setSeconds(0);

    try {
      const ice = await fetchIceServers();
      rtcConfigRef.current = {
        iceServers: ice,
        iceCandidatePoolSize: 10,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
      };
    } catch { /* fallback */ }

    startBroadcastSignaling();
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);

    heartbeatRef.current = setInterval(() => {
      const sid = streamIdRef.current;
      if (!sid || !user) return;
      fetch(STREAMS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({
          action: "heartbeat",
          stream_id: sid,
          viewers,
          likes,
        }),
      }).catch(() => {});
    }, 15000);
  };

  const stopLive = () => {
    setIsLive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (signalPollRef.current) clearInterval(signalPollRef.current);
    viewerPCsRef.current.forEach(pc => { try { pc.close(); } catch { /* ignore */ } });
    viewerPCsRef.current.clear();
    setViewers(0);
    const sid = streamIdRef.current;
    if (sid && user) {
      fetch(STREAMS_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": user.id,
          "X-User-Name": encodeURIComponent(user.name),
        },
        body: JSON.stringify({ action: "stop", stream_id: sid }),
      }).catch(() => {});
    }
    streamIdRef.current = null;
  };

  const flipCamera = async () => {
    if (flipping) return;
    setFlipping(true);
    const next = facing === "user" ? "environment" : "user";
    await startCamera(next);
    setFacing(next);
    setFlipping(false);
  };

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  const sendGift = (emoji: string) => {
    const g: Gift = { id: Date.now(), emoji, x: Math.random() * 60 + 20 };
    setGifts(prev => [...prev, g]);
    setTimeout(() => setGifts(prev => prev.filter(x => x.id !== g.id)), 2500);
    setShowGifts(false);
  };

  const sendMessage = () => {
    const text = inputMsg.trim();
    if (!text) return;
    setChat(prev => [...prev.slice(-30), { id: Date.now(), name: "Вы", text, color: "#ffffff" }]);
    if (user) {
      broadcastToViewers("live_chat", {
        name: user.name,
        text,
        color: "#fe2c55",
        author: true,
      }).catch(() => {});
    }
    setInputMsg("");
  };

  // ── Экран 1: запрос камеры через кнопку (работает в любом браузере) ──
  if (camState === "idle") {
    return (
      <LiveStreamCameraPrompt
        camState="idle"
        camErrorMsg={camErrorMsg}
        onClose={onClose}
        onStart={() => startCamera("user")}
      />
    );
  }

  // ── Экран 2: камера заблокирована ──
  if (camState === "denied") {
    return (
      <LiveStreamCameraPrompt
        camState="denied"
        camErrorMsg={camErrorMsg}
        onClose={onClose}
        onStart={() => startCamera("user")}
      />
    );
  }

  // ── Основной экран: видео + UI ──
  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">

      <div className="absolute inset-0 bg-zinc-950">
        <video
          ref={videoRef}
          id="live-video"
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{
            transform: facing === "user" ? "scaleX(-1)" : "none",
            opacity: flipping ? 0 : 1,
            transition: "opacity 0.2s",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/30" />
      </div>

      {gifts.map(g => (
        <div key={g.id} className="absolute z-30 text-4xl pointer-events-none"
          style={{ left: `${g.x}%`, bottom: "30%", animation: "gift-float 2.5s ease-out forwards" }}>
          {g.emoji}
        </div>
      ))}

      <LiveStreamHeader
        isLive={isLive}
        viewers={viewers}
        seconds={seconds}
        flipping={flipping}
        formatTime={formatTime}
        onFlip={flipCamera}
        onClose={onClose}
      />

      {!isLive && (
        <LiveStreamStartForm
          showStartForm={showStartForm}
          streamTitle={streamTitle}
          streamCategory={streamCategory}
          onTitleChange={setStreamTitle}
          onCategoryChange={setStreamCategory}
          onOpenForm={() => setShowStartForm(true)}
          onCancelForm={() => setShowStartForm(false)}
          onStartLive={startLive}
        />
      )}

      {isLive && (
        <LiveStreamOverlay
          likes={likes}
          chat={chat}
          chatRef={chatRef}
          showGifts={showGifts}
          inputMsg={inputMsg}
          onInputChange={setInputMsg}
          onSendMessage={sendMessage}
          onToggleGifts={() => setShowGifts(v => !v)}
          onSendGift={sendGift}
          onStopLive={stopLive}
        />
      )}

      <style>{`
        @keyframes gift-float {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LiveStream;
