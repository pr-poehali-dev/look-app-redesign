import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";

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

const GIFTS = ["🌹", "🎁", "💎", "🚀", "⭐", "🏆", "💰", "🎉"];

interface ChatMsg { id: number; name: string; text: string; color: string; }
interface Gift { id: number; emoji: string; x: number; }

// Шаг 1: "ask" — экран с объяснением и кнопкой разрешить
// Шаг 2: "ready" — камера работает, показываем превью
// Шаг 3: "denied" — пользователь отказал, инструкция как разрешить вручную
type CamStep = "ask" | "ready" | "denied";

const LiveStream = ({ onClose }: { onClose: () => void }) => {
  const [camStep, setCamStep] = useState<CamStep>("ask");
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

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (chatTimerRef.current) clearInterval(chatTimerRef.current);
    };
  }, []);

  // Вызывается по нажатию кнопки — это пользовательский жест, браузер покажет диалог
  const requestCamera = async (facingMode: "user" | "environment" = "user") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      }).catch(() =>
        // Если с audio отклонили — пробуем только video
        navigator.mediaDevices.getUserMedia({ video: { facingMode } })
      );
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCamStep("ready");
      return true;
    } catch {
      setCamStep("denied");
      return false;
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const startLive = () => {
    setIsLive(true);
    setViewers(Math.floor(Math.random() * 50) + 10);
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds(s => s + 1);
      setViewers(v => Math.max(0, v + Math.floor(Math.random() * 3 - 1)));
      setLikes(l => l + Math.floor(Math.random() * 5));
    }, 1000);
    chatTimerRef.current = setInterval(() => {
      const msg = FAKE_VIEWERS[Math.floor(Math.random() * FAKE_VIEWERS.length)];
      setChat(prev => [...prev.slice(-30), { id: Date.now(), name: msg.name, text: msg.text, color: msg.color }]);
    }, 1800);
  };

  const stopLive = () => {
    setIsLive(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (chatTimerRef.current) clearInterval(chatTimerRef.current);
  };

  const flipCamera = async () => {
    if (flipping) return;
    setFlipping(true);
    const next = facing === "user" ? "environment" : "user";
    await requestCamera(next);
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
    if (!inputMsg.trim()) return;
    setChat(prev => [...prev.slice(-30), { id: Date.now(), name: "Вы", text: inputMsg.trim(), color: "#ffffff" }]);
    setInputMsg("");
  };

  // ── Экран 1: объяснение перед запросом камеры ──
  if (camStep === "ask") {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center px-8">
        <button onClick={onClose} className="absolute top-12 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="X" size={18} className="text-white" />
        </button>

        <div className="text-6xl mb-6">📸</div>
        <h2 className="text-white font-bold text-2xl mb-3 text-center">Разреши камеру</h2>
        <p className="text-white/50 text-sm text-center mb-8 leading-relaxed">
          Для прямого эфира нужен доступ к камере и микрофону. После нажатия кнопки браузер спросит разрешение — нажми <span className="text-white font-semibold">«Разрешить»</span>.
        </p>

        <div className="w-full bg-white/5 rounded-2xl p-4 mb-8 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#fe2c55]/20 flex items-center justify-center shrink-0">
              <Icon name="Camera" size={18} className="text-[#fe2c55]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Камера</p>
              <p className="text-white/40 text-xs">Для видео в эфире</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#61d4f0]/20 flex items-center justify-center shrink-0">
              <Icon name="Mic" size={18} className="text-[#61d4f0]" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Микрофон</p>
              <p className="text-white/40 text-xs">Для звука в эфире</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => requestCamera("user")}
          className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Icon name="Camera" size={22} />
          Разрешить и продолжить
        </button>
        <button onClick={onClose} className="mt-4 text-white/30 text-sm">
          Отмена
        </button>
      </div>
    );
  }

  // ── Экран 2: отказ — инструкция как разрешить вручную ──
  if (camStep === "denied") {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center px-8">
        <button onClick={onClose} className="absolute top-12 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="X" size={18} className="text-white" />
        </button>

        <div className="text-6xl mb-6">🔒</div>
        <h2 className="text-white font-bold text-xl mb-3 text-center">Доступ к камере закрыт</h2>
        <p className="text-white/50 text-sm text-center mb-6 leading-relaxed">
          Ты нажал «Запретить». Чтобы разрешить вручную:
        </p>

        <div className="w-full bg-white/5 rounded-2xl p-4 mb-6 space-y-4 text-sm">
          <div className="flex gap-3">
            <span className="text-[#fe2c55] font-bold shrink-0">1.</span>
            <span className="text-white/70">Нажми на значок <span className="text-white">🔒</span> слева в адресной строке браузера</span>
          </div>
          <div className="flex gap-3">
            <span className="text-[#fe2c55] font-bold shrink-0">2.</span>
            <span className="text-white/70">Найди пункт <span className="text-white">«Камера»</span> и выбери <span className="text-white">«Разрешить»</span></span>
          </div>
          <div className="flex gap-3">
            <span className="text-[#fe2c55] font-bold shrink-0">3.</span>
            <span className="text-white/70">Обнови страницу и открой эфир снова</span>
          </div>
        </div>

        <button
          onClick={() => requestCamera("user")}
          className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-base active:scale-95 transition-all"
        >
          Попробовать снова
        </button>
        <button onClick={onClose} className="mt-4 text-white/30 text-sm">
          Закрыть
        </button>
      </div>
    );
  }

  // ── Экран 3: камера работает — превью + эфир ──
  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">

      <div className="absolute inset-0 bg-zinc-950">
        <video
          ref={videoRef}
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

      <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-3">
        <div className="flex items-center gap-2">
          {isLive && (
            <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded-md">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
            </div>
          )}
          {isLive && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">
              <Icon name="Eye" size={12} className="text-white/70" />
              <span className="text-white text-xs font-semibold">{viewers.toLocaleString()}</span>
            </div>
          )}
          {isLive && (
            <div className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">
              <span className="text-white/80 text-xs font-mono">{formatTime(seconds)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={flipCamera} disabled={flipping}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
            <Icon name="RefreshCw" size={16} className={`text-white ${flipping ? "animate-spin" : ""}`} />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>
      </div>

      {!isLive && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <div className="w-24 h-24 rounded-full bg-[#fe2c55]/20 border-2 border-[#fe2c55] flex items-center justify-center animate-pulse">
            <Icon name="Radio" size={40} className="text-[#fe2c55]" />
          </div>
          <div className="text-center">
            <h2 className="text-white font-bold text-2xl mb-2">Прямой эфир</h2>
            <p className="text-white/50 text-sm">Начни трансляцию — зрители уже ждут</p>
          </div>
          <button onClick={startLive}
            className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-3">
            <Icon name="Radio" size={22} />
            Начать трансляцию
          </button>
        </div>
      )}

      {isLive && (
        <>
          <div className="absolute right-4 top-1/3 z-20 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
              <Icon name="Heart" size={20} className="text-[#fe2c55] fill-[#fe2c55]" />
            </div>
            <span className="text-white text-xs font-bold">{likes.toLocaleString()}</span>
          </div>

          <div ref={chatRef}
            className="relative z-20 flex-1 overflow-y-scroll px-3 flex flex-col justify-end gap-1 pb-2"
            style={{ scrollbarWidth: "none" }}>
            {chat.map(msg => (
              <div key={msg.id} className="flex items-start gap-1.5">
                <span className="text-xs font-bold shrink-0" style={{ color: msg.color }}>{msg.name}</span>
                <span className="text-white/80 text-xs leading-tight">{msg.text}</span>
              </div>
            ))}
          </div>

          <div className="relative z-20 px-3 pb-8 flex flex-col gap-3">
            {showGifts && (
              <div className="bg-black/70 backdrop-blur-md rounded-2xl p-3 grid grid-cols-4 gap-3">
                {GIFTS.map(g => (
                  <button key={g} onClick={() => sendGift(g)}
                    className="aspect-square rounded-xl bg-white/10 flex items-center justify-center text-2xl active:scale-90 transition-all">
                    {g}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5">
                <input type="text" value={inputMsg} onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30" />
                {inputMsg && (
                  <button onClick={sendMessage}>
                    <Icon name="Send" size={16} className="text-[#61d4f0]" />
                  </button>
                )}
              </div>
              <button onClick={() => setShowGifts(v => !v)}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-lg">🎁</span>
              </button>
              <button onClick={stopLive}
                className="px-4 h-10 rounded-full bg-[#fe2c55]/90 flex items-center justify-center">
                <span className="text-white text-xs font-bold">Стоп</span>
              </button>
            </div>
          </div>
        </>
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
