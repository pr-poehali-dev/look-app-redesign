import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { fetchIceServers, RTC_CONFIG } from "@/lib/webrtc-config";

const STREAMS_API = "https://functions.poehali.dev/54ce632b-903a-4de7-8f5f-e81fa2f42053";
const SIGNAL_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface LiveChannel {
  id: number;
  user_id: string;
  handle: string;
  name: string;
  thumb: string;
  category: string;
  viewers: number;
  title: string;
  tags: string[];
}

const FAKE_CHAT = [
  { name: "alex99", text: "просто невероятно!", color: "#fe2c55" },
  { name: "lisa_m", text: "❤️❤️❤️", color: "#f472b6" },
  { name: "go_live", text: "уже час тут сижу", color: "#61d4f0" },
  { name: "fire_boy", text: "🔥🔥🔥", color: "#fb923c" },
  { name: "quiet_one", text: "топчик!", color: "#34d399" },
  { name: "neon_cat", text: "лайк поставил", color: "#a78bfa" },
  { name: "super_fan", text: "давай ещё!", color: "#fbbf24" },
  { name: "just_here", text: "смотрю с работы 😅", color: "#61d4f0" },
];

const formatViewers = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "K" : String(n);

interface ChatMsg { id: number; name: string; text: string; color: string; }
interface Gift { id: number; emoji: string; x: number; }

const GIFTS = ["🌹", "🎁", "💎", "🚀", "⭐", "🏆", "💰", "🎉"];

const WatchStream = ({ channel, onBack }: { channel: LiveChannel; onBack: () => void }) => {
  const { user } = useAuth();
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [viewers, setViewers] = useState(channel.viewers);
  const [inputMsg, setInputMsg] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const chatRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const lastSigIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);

  const myIdRef = useRef<string>("");
  if (!myIdRef.current) {
    myIdRef.current = user?.id || `guest_${Math.random().toString(36).slice(2, 10)}`;
  }
  const myId = myIdRef.current;
  const myName = user?.name || "Гость";

  const sendSignal = async (type: string, payload: unknown) => {
    try {
      await fetch(`${SIGNAL_API}?module=signal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": myId,
          "X-User-Name": encodeURIComponent(myName),
        },
        body: JSON.stringify({
          room_id: `live_${channel.id}`,
          to_user: channel.user_id,
          type,
          payload,
        }),
      });
    } catch (e) { void e; }
  };

  useEffect(() => {
    let stopped = false;
    const start = async () => {
      let cfg: RTCConfiguration = RTC_CONFIG;
      try {
        const ice = await fetchIceServers();
        cfg = { ...RTC_CONFIG, iceServers: ice };
      } catch { /* fallback */ }

      const pc = new RTCPeerConnection(cfg);
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (videoRef.current && e.streams[0]) {
          videoRef.current.srcObject = e.streams[0];
          videoRef.current.play().catch(() => {});
          setConnecting(false);
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal("viewer_ice", e.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setConnecting(false);
      };

      pollRef.current = setInterval(async () => {
        if (stopped) return;
        try {
          const res = await fetch(
            `${SIGNAL_API}?module=signal&room_id=live_${channel.id}&since_id=${lastSigIdRef.current}`,
            { headers: { "X-User-Id": myId, "X-User-Name": encodeURIComponent(myName) } }
          );
          const raw = await res.json();
          const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          for (const sig of data.signals || []) {
            lastSigIdRef.current = sig.id;
            console.log("[Watch] sig:", sig.type, "from", sig.from_user);
            if (sig.type === "live_offer") {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
                remoteSetRef.current = true;
                for (const c of pendingIceRef.current) {
                  try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch { /* ignore */ }
                }
                pendingIceRef.current = [];
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal("live_answer", answer);
              } catch (e) { console.warn("[Watch] offer handle failed", e); }
            } else if (sig.type === "live_ice") {
              const cand = sig.payload as RTCIceCandidateInit;
              if (!remoteSetRef.current) {
                pendingIceRef.current.push(cand);
              } else {
                try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch { /* ignore */ }
              }
            } else if (sig.type === "live_chat" && sig.payload) {
              const p = sig.payload as { name?: string; text?: string; color?: string; author?: boolean };
              if (p.text) {
                setChat(prev => [...prev.slice(-40), {
                  id: Date.now() + Math.random(),
                  name: (p.author ? "★ " : "") + (p.name || "Зритель"),
                  text: p.text,
                  color: p.author ? "#fe2c55" : (p.color || "#61d4f0"),
                }]);
              }
            }
          }
        } catch (e) { void e; }
      }, 3000);

      console.log("[Watch] viewer_join → streamer", { streamId: channel.id, streamer: channel.user_id, myId });
      await sendSignal("viewer_join", {});
      // Повторяем join несколько раз на случай, если стример ещё не успел запустить poll
      setTimeout(() => { if (!stopped && !remoteSetRef.current) sendSignal("viewer_join", {}); }, 2000);
      setTimeout(() => { if (!stopped && !remoteSetRef.current) sendSignal("viewer_join", {}); }, 5000);
    };

    start();

    return () => {
      stopped = true;
      if (pollRef.current) clearInterval(pollRef.current);
      sendSignal("viewer_leave", {}).catch(() => {});
      if (pcRef.current) {
        try { pcRef.current.close(); } catch { /* ignore */ }
        pcRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, channel.user_id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  const sendGift = (emoji: string) => {
    const g: Gift = { id: Date.now(), emoji, x: Math.random() * 60 + 20 };
    setGifts((prev) => [...prev, g]);
    setTimeout(() => setGifts((prev) => prev.filter((x) => x.id !== g.id)), 2500);
    setShowGifts(false);
    sendSignal("live_like", {}).catch(() => {});
  };

  const sendMessage = () => {
    const text = inputMsg.trim();
    if (!text) return;
    const color = "#61d4f0";
    setChat((prev) => [...prev.slice(-40), { id: Date.now(), name: "Вы", text, color: "#ffffff" }]);
    sendSignal("live_chat", { name: myName, text, color }).catch(() => {});
    setInputMsg("");
  };

  void FAKE_CHAT;
  void viewers;
  void setViewers;

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/30 pointer-events-none" />
        {connecting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-[#fe2c55] animate-spin" />
            <p className="text-white/70 text-sm">Подключение к эфиру...</p>
          </div>
        )}
      </div>

      {/* Floating gifts */}
      {gifts.map((g) => (
        <div key={g.id} className="absolute z-30 text-4xl pointer-events-none"
          style={{ left: `${g.x}%`, bottom: "30%", animation: "gift-float 2.5s ease-out forwards" }}>
          {g.emoji}
        </div>
      ))}

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded-md">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold">LIVE</span>
          </div>
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <Icon name="Eye" size={11} className="text-white/70" />
            <span className="text-white text-xs font-semibold">{formatViewers(viewers)}</span>
          </div>
        </div>
        <button onClick={onBack} className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Icon name="X" size={18} className="text-white" />
        </button>
      </div>

      {/* Author info */}
      <div className="relative z-20 px-4 pb-2 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#fe2c55]">
          <img src={channel.thumb} alt={channel.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white font-bold text-sm">{channel.handle}</span>
            <Icon name="BadgeCheck" size={13} className="text-[#61d4f0]" />
          </div>
          <p className="text-white/60 text-xs truncate">{channel.title}</p>
        </div>
        <button
          onClick={() => setFollowing((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${following ? "bg-white/20 text-white" : "bg-[#fe2c55] text-white"}`}
        >
          {following ? "Подписан" : "Подписаться"}
        </button>
      </div>

      {/* Chat */}
      <div ref={chatRef} className="relative z-20 flex-1 overflow-y-scroll px-3 flex flex-col justify-end gap-1 pb-2" style={{ scrollbarWidth: "none" }}>
        {chat.map((msg) => (
          <div key={msg.id} className="flex items-start gap-1.5 animate-slide-up">
            <span className="text-xs font-bold shrink-0" style={{ color: msg.color }}>{msg.name}</span>
            <span className="text-white/80 text-xs leading-tight">{msg.text}</span>
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 px-3 pb-8 flex flex-col gap-3">
        {showGifts && (
          <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 grid grid-cols-4 gap-3">
            {GIFTS.map((g) => (
              <button key={g} onClick={() => sendGift(g)}
                className="aspect-square rounded-xl bg-white/10 flex items-center justify-center text-2xl hover:bg-white/20 active:scale-90 transition-all">
                {g}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5">
            <input
              type="text" value={inputMsg} onChange={(e) => setInputMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Написать комментарий..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
            />
            {inputMsg && <button onClick={sendMessage}><Icon name="Send" size={16} className="text-[#61d4f0]" /></button>}
          </div>
          <button onClick={() => setShowGifts((v) => !v)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <span className="text-lg">🎁</span>
          </button>
          <button onClick={() => setLiked((v) => !v)}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <Icon name="Heart" size={20} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes gift-float {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const LiveList = () => {
  const [watching, setWatching] = useState<LiveChannel | null>(null);
  const [activeCategory, setActiveCategory] = useState("Все");
  const [channels, setChannels] = useState<LiveChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const CATS = ["Все", "Игры", "Музыка", "Кулинария", "Путешествия", "Спорт", "Юмор", "Образование", "Общее"];

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${STREAMS_API}?action=list`);
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const list: LiveChannel[] = (data.streams || []).map((s: {
          id: number; user_id: string; user_name: string; user_avatar: string;
          title: string; category: string; thumb: string; tags: string[];
          viewers: number;
        }) => ({
          id: s.id,
          user_id: s.user_id,
          handle: s.user_name || s.user_id,
          name: s.user_name || "Эфир",
          thumb: s.thumb || s.user_avatar || "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg",
          category: s.category || "Общее",
          viewers: s.viewers || 0,
          title: s.title || "Прямой эфир",
          tags: s.tags || [],
        }));
        setChannels(list);
      } catch (e) {
        console.error("[LiveList] load failed", e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const filtered = activeCategory === "Все"
    ? channels
    : channels.filter(ch => ch.category === activeCategory);

  if (watching) return <WatchStream channel={watching} onBack={() => setWatching(null)} />;

  return (
    <div className="h-full bg-black overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Прямые эфиры</h2>
            <p className="text-white/40 text-xs mt-0.5">
              {loading ? "Загрузка..." : `${channels.length} ${channels.length === 1 ? "трансляция" : channels.length < 5 ? "трансляции" : "трансляций"} сейчас`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#fe2c55]/20 border border-[#fe2c55]/40 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#fe2c55] animate-pulse" />
            <span className="text-[#fe2c55] text-xs font-bold">В ЭФИРЕ</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 py-3 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        {CATS.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{ touchAction: "manipulation" }}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              activeCategory === cat
                ? "bg-[#fe2c55] text-white border-[#fe2c55]"
                : "bg-white/10 text-white/70 border-white/10 hover:bg-white/20"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured — big card */}
      {filtered.length > 0 && (
      <div className="px-4 mb-4">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Топ эфир</p>
        <button
          onClick={() => setWatching(filtered[0])}
          className="relative w-full rounded-2xl overflow-hidden aspect-video"
          style={{ touchAction: "manipulation" }}
        >
          <img src={filtered[0].thumb} className="w-full h-full object-cover" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2 py-0.5 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
              <Icon name="Eye" size={10} className="text-white/70" />
              <span className="text-white text-xs">{formatViewers(filtered[0].viewers)}</span>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-bold text-sm">{filtered[0].name}</p>
            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{filtered[0].title}</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon name="Play" size={28} className="text-white ml-1" />
            </div>
          </div>
        </button>
      </div>
      )}

      {/* List */}
      <div className="px-4">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Все трансляции</p>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Icon name="Radio" size={40} className="text-white/20" />
            <p className="text-white/40 text-sm">Нет эфиров в этой категории</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {filtered.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setWatching(ch)}
              className="flex items-center gap-3 bg-white/5 rounded-2xl p-3 hover:bg-white/10 active:scale-[0.98] transition-all text-left"
            >
              <div className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0">
                <img src={ch.thumb} className="w-full h-full object-cover" alt={ch.name} />
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-[#fe2c55] px-1.5 py-0.5 rounded">
                  <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-[9px] font-bold">LIVE</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-white font-semibold text-sm">{ch.handle}</span>
                  <Icon name="BadgeCheck" size={12} className="text-[#61d4f0]" />
                </div>
                <p className="text-white/60 text-xs line-clamp-2 leading-tight mb-1.5">{ch.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">{ch.category}</span>
                  <div className="flex items-center gap-1">
                    <Icon name="Eye" size={10} className="text-white/40" />
                    <span className="text-white/40 text-xs">{formatViewers(ch.viewers)}</span>
                  </div>
                </div>
              </div>
              <Icon name="ChevronRight" size={18} className="text-white/30 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      <div className="pb-28" />
    </div>
  );
};

export default LiveList;