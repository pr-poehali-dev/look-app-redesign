import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface CallRecord {
  id: number;
  caller_id: string;
  caller_name: string;
  callee_id: string;
  callee_name: string;
  mode: "audio" | "video";
  status: string;
  started_at: number;
  duration_sec: number;
  direction: "in" | "out";
}

interface Props {
  onBack: () => void;
  onCall?: (peer: { id: string; name: string }, mode: "audio" | "video") => void;
}

const formatDuration = (s: number) => {
  if (s <= 0) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m} мин ${sec} с` : `${sec} с`;
};

const formatWhen = (ts: number) => {
  const d = new Date(ts * 1000);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;
  if (isYesterday) return `вчера, ${time}`;
  return `${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" })}, ${time}`;
};

const CallHistoryScreen = ({ onBack, onCall }: Props) => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "missed">("all");

  useEffect(() => {
    if (!user) return;
    fetch(`${API}?module=calls`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setCalls(data.calls || []);
      })
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = filter === "missed" ? calls.filter((c) => c.status === "missed" && c.direction === "in") : calls;

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <button onClick={onBack} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <Icon name="ChevronLeft" size={20} className="text-white" />
        </button>
        <h2 className="text-white font-bold text-xl">Звонки</h2>
        <div className="w-9 h-9" />
      </div>

      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${filter === "all" ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter("missed")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium ${filter === "missed" ? "bg-white text-black" : "bg-white/10 text-white/70"}`}
        >
          Пропущенные
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/40 text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <Icon name="PhoneOff" size={28} className="text-white/30" />
            </div>
            <p className="text-white/50 text-sm text-center">
              {filter === "missed" ? "Нет пропущенных звонков" : "История звонков пуста"}
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const isOut = c.direction === "out";
            const peerName = isOut ? c.callee_name || "Пользователь" : c.caller_name || "Пользователь";
            const peerId = isOut ? c.callee_id : c.caller_id;
            const isMissed = c.status === "missed" && !isOut;
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 active:bg-white/5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#fe2c55]/40 to-[#8b5cf6]/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-lg">{peerName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-base truncate ${isMissed ? "text-red-400" : "text-white"}`}>
                    {peerName}
                  </p>
                  <div className="flex items-center gap-1.5 text-white/50 text-xs mt-0.5">
                    <Icon
                      name={isOut ? "ArrowUpRight" : isMissed ? "PhoneMissed" : "ArrowDownLeft"}
                      size={12}
                      className={isMissed ? "text-red-400" : isOut ? "text-white/50" : "text-green-400"}
                    />
                    <span>{formatWhen(c.started_at)}</span>
                    {c.duration_sec > 0 && <span>· {formatDuration(c.duration_sec)}</span>}
                  </div>
                </div>
                <button
                  onClick={() => onCall?.({ id: peerId, name: peerName }, c.mode)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
                >
                  <Icon name={c.mode === "video" ? "Video" : "Phone"} size={16} className="text-[#00d4ff]" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallHistoryScreen;
