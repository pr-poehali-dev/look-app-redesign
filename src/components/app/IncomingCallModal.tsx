import Icon from "@/components/ui/icon";
import type { IncomingCall } from "./useIncomingCall";

interface IncomingCallModalProps {
  incomingCall: IncomingCall;
  onDecline: () => void;
  onAccept: () => void;
}

const IncomingCallModal = ({ incomingCall, onDecline, onAccept }: IncomingCallModalProps) => (
  <div
    className="fixed inset-0 z-[9999] flex items-end justify-center px-4"
    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 64px)" }}
  >
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
    <div className="relative w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF5A3C]/50 to-[#8b5cf6]/50 border-2 border-white/10 flex items-center justify-center">
          <span className="text-white font-bold text-3xl">
            {incomingCall.callerName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">{incomingCall.callerName}</p>
          <p className="text-white/50 text-sm mt-0.5 flex items-center justify-center gap-1.5">
            <Icon name={incomingCall.mode === "video" ? "Video" : "Phone"} size={14} />
            Входящий {incomingCall.mode === "video" ? "видео" : "аудио"}звонок
          </p>
        </div>
        <div className="flex items-center gap-6 mt-2">
          <button
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Icon name="PhoneOff" size={26} className="text-white" />
          </button>
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <Icon name={incomingCall.mode === "video" ? "Video" : "Phone"} size={26} className="text-white" />
          </button>
        </div>
        <div className="flex gap-12 -mt-2">
          <span className="text-white/30 text-xs">Отклонить</span>
          <span className="text-white/30 text-xs">Принять</span>
        </div>
      </div>
    </div>
  </div>
);

export default IncomingCallModal;
