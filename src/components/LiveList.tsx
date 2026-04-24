import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

const LIVE_CHANNELS = [
  {
    id: 1,
    handle: "dj_night",
    name: "DJ Night Live",
    thumb: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg",
    category: "Музыка",
    viewers: 14320,
    title: "Ночная вечеринка 🎧 Лучшие треки до утра!",
    tags: ["музыка", "дискотека", "dj"],
  },
  {
    id: 2,
    handle: "cook_vika",
    name: "Вика Готовит",
    thumb: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/b3dc2950-63dc-4b14-bd01-440d0b8e7e82.jpg",
    category: "Кулинария",
    viewers: 3840,
    title: "Готовим пасту карбонара — рецепт от бабушки 🍝",
    tags: ["еда", "кулинария", "рецепты"],
  },
  {
    id: 3,
    handle: "gamer_hex",
    name: "HEX Gaming",
    thumb: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg",
    category: "Игры",
    viewers: 28100,
    title: "Ranked до Legendary — не сплю пока не выйду 💀",
    tags: ["игры", "ranked", "стрим"],
  },
  {
    id: 4,
    handle: "travel_rus",
    name: "Travel Rus",
    thumb: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg",
    category: "Путешествия",
    viewers: 6750,
    title: "Закат на Алтае — прямо сейчас 🏔️",
    tags: ["природа", "алтай", "путешествия"],
  },
];

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

const WatchStream = ({ channel, onBack }: { channel: typeof LIVE_CHANNELS[0]; onBack: () => void }) => {
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [liked, setLiked] = useState(false);
  const [following, setFollowing] = useState(false);
  const [viewers, setViewers] = useState(channel.viewers);
  const [inputMsg, setInputMsg] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chatTimer = setInterval(() => {
      const msg = FAKE_CHAT[Math.floor(Math.random() * FAKE_CHAT.length)];
      setChat((prev) => [...prev.slice(-40), { id: Date.now(), ...msg }]);
    }, 1500);
    const viewerTimer = setInterval(() => {
      setViewers((v) => v + Math.floor(Math.random() * 6 - 2));
    }, 2000);
    return () => { clearInterval(chatTimer); clearInterval(viewerTimer); };
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chat]);

  const sendGift = (emoji: string) => {
    const g: Gift = { id: Date.now(), emoji, x: Math.random() * 60 + 20 };
    setGifts((prev) => [...prev, g]);
    setTimeout(() => setGifts((prev) => prev.filter((x) => x.id !== g.id)), 2500);
    setShowGifts(false);
  };

  const sendMessage = () => {
    if (!inputMsg.trim()) return;
    setChat((prev) => [...prev.slice(-40), { id: Date.now(), name: "Вы", text: inputMsg.trim(), color: "#ffffff" }]);
    setInputMsg("");
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      <div className="absolute inset-0">
        <img src={channel.thumb} className="w-full h-full object-cover opacity-60" alt="stream" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/50" />
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
  const [watching, setWatching] = useState<typeof LIVE_CHANNELS[0] | null>(null);

  if (watching) return <WatchStream channel={watching} onBack={() => setWatching(null)} />;

  return (
    <div className="h-full bg-black overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {/* Header */}
      <div className="px-4 pt-14 pb-4 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-xl">Прямые эфиры</h2>
            <p className="text-white/40 text-xs mt-0.5">{LIVE_CHANNELS.length} трансляции сейчас</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#fe2c55]/20 border border-[#fe2c55]/40 px-3 py-1.5 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#fe2c55] animate-pulse" />
            <span className="text-[#fe2c55] text-xs font-bold">В ЭФИРЕ</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 px-4 py-3 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        {["Все", "Игры", "Музыка", "Кулинария", "Путешествия"].map((cat) => (
          <span key={cat} className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-white/70 border border-white/10">
            {cat}
          </span>
        ))}
      </div>

      {/* Featured — big card */}
      <div className="px-4 mb-4">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Топ эфир</p>
        <button
          onClick={() => setWatching(LIVE_CHANNELS[2])}
          className="relative w-full rounded-2xl overflow-hidden aspect-video group"
        >
          <img src={LIVE_CHANNELS[2].thumb} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2 py-0.5 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-md">
              <Icon name="Eye" size={10} className="text-white/70" />
              <span className="text-white text-xs">{formatViewers(LIVE_CHANNELS[2].viewers)}</span>
            </div>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white font-bold text-sm">{LIVE_CHANNELS[2].name}</p>
            <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{LIVE_CHANNELS[2].title}</p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Icon name="Play" size={28} className="text-white ml-1" />
            </div>
          </div>
        </button>
      </div>

      {/* List */}
      <div className="px-4">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">Все трансляции</p>
        <div className="flex flex-col gap-3">
          {LIVE_CHANNELS.map((ch) => (
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
