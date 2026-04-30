import Icon from "@/components/ui/icon";
import { CallStatus, CallQuality } from "./useCallConnection";

interface CallHeaderProps {
  name: string;
  avatar: string;
  mode: "audio" | "video";
  status: CallStatus;
  quality: CallQuality;
  connectionWarning: boolean;
  seconds: number;
}

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const CallHeader = ({ name, avatar, mode, status, quality, connectionWarning, seconds }: CallHeaderProps) => {
  const statusLabel = {
    connecting: "Подключение...",
    ringing: "Вызов...",
    connected: formatTime(seconds),
    ended: "Завершено",
  }[status];

  return (
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
      {connectionWarning && status !== "connected" && (
        <div className="mt-3 mx-4 px-3 py-2 rounded-xl bg-yellow-500/15 border border-yellow-500/30 flex items-start gap-2 max-w-xs">
          <Icon name="TriangleAlert" size={14} className="text-yellow-300 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-100/90 text-[11px] leading-tight">
            Не удаётся установить соединение. Возможно, у одного из вас плохая сеть или провайдер блокирует звонки. Попробуй переключиться на Wi-Fi.
          </p>
        </div>
      )}
      {status === "connected" && quality !== "unknown" && (
        <div className={`mt-2 flex items-center gap-1.5 text-xs ${
          quality === "good" ? "text-green-400" : quality === "fair" ? "text-yellow-400" : "text-red-400"
        }`}>
          <div className="flex items-end gap-0.5 h-3">
            <div className={`w-1 h-1 rounded-sm ${quality !== "unknown" ? "bg-current" : "bg-current/30"}`} />
            <div className={`w-1 h-2 rounded-sm ${quality === "fair" || quality === "good" ? "bg-current" : "bg-current/30"}`} />
            <div className={`w-1 h-3 rounded-sm ${quality === "good" ? "bg-current" : "bg-current/30"}`} />
          </div>
          <span>
            {quality === "good" ? "Хорошее соединение" : quality === "fair" ? "Среднее соединение" : "Слабое соединение"}
          </span>
        </div>
      )}
    </div>
  );
};

export default CallHeader;
