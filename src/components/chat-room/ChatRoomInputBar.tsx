import { RefObject } from "react";
import Icon from "@/components/ui/icon";

interface ChatRoomInputBarProps {
  showAttach: boolean;
  setShowAttach: (v: boolean | ((v: boolean) => boolean)) => void;
  isGroup: boolean;
  communityIsAdmin: boolean;
  fileRef: RefObject<HTMLInputElement>;
  docRef: RefObject<HTMLInputElement>;
  sendLocation: () => void;
  openContactPicker: () => void;
  setShowPolls: (v: boolean) => void;
  recording: boolean;
  recSecs: number;
  stopVoice: () => void;
  startVoice: () => void;
  input: string;
  setInput: (v: string) => void;
  sendTyping: () => void;
  handleSend: () => void;
  showEmoji: boolean;
  setShowEmoji: (v: boolean | ((v: boolean) => boolean)) => void;
  sending: boolean;
}

const ChatRoomInputBar = ({
  showAttach,
  setShowAttach,
  isGroup,
  communityIsAdmin,
  fileRef,
  docRef,
  sendLocation,
  openContactPicker,
  setShowPolls,
  recording,
  recSecs,
  stopVoice,
  startVoice,
  input,
  setInput,
  sendTyping,
  handleSend,
  showEmoji,
  setShowEmoji,
  sending,
}: ChatRoomInputBarProps) => {
  return (
    <>
      {/* Attach panel */}
      {showAttach && (
        <div className="bg-[#111] border-t border-white/8 px-4 py-4 grid grid-cols-4 gap-4">
          {[
            { icon: "Image", label: "Фото", action: () => fileRef.current?.click(), show: true },
            { icon: "FileText", label: "Файл", action: () => docRef.current?.click(), show: true },
            { icon: "MapPin", label: "Геолокация", action: sendLocation, show: true },
            { icon: "Contact", label: "Контакт", action: openContactPicker, show: true },
            { icon: "BarChart3", label: "Опрос", action: () => { setShowAttach(false); setShowPolls(true); }, show: isGroup && communityIsAdmin },
            { icon: "ListChecks", label: "Опросы", action: () => { setShowAttach(false); setShowPolls(true); }, show: isGroup && !communityIsAdmin },
          ].filter(item => item.show).map((item) => (
            <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Icon name={item.icon as "Image"} size={22} className="text-white" />
              </div>
              <span className="text-white/50 text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 pb-24 pt-3 bg-black border-t border-white/8 relative z-40">
        <button
          onClick={() => setShowAttach((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 mb-0.5"
        >
          <Icon name="Plus" size={18} className="text-white/60" />
        </button>

        {recording ? (
          <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-3xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse" />
            <span className="text-white/60 text-sm flex-1">
              {String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}
            </span>
            <button onPointerUp={stopVoice} className="text-[#fe2c55]">
              <Icon name="Send" size={20} />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-end gap-2 bg-[#1a1a1a] rounded-3xl px-4 py-2.5 min-h-[44px]">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); if (e.target.value.trim()) sendTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent text-white text-base outline-none resize-none placeholder-white/30 max-h-32 leading-snug"
              style={{ scrollbarWidth: "none" }}
            />
            <button onClick={() => setShowEmoji((v) => !v)} className={`flex-shrink-0 mb-0.5 transition-colors ${showEmoji ? "text-[#fe2c55]" : "text-white/40"}`}>
              <Icon name="Smile" size={20} />
            </button>
          </div>
        )}

        {input.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-10 h-10 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(254,44,85,0.4)] disabled:opacity-50"
          >
            <Icon name="Send" size={17} className="text-white" />
          </button>
        ) : (
          <button
            onPointerDown={startVoice}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
          >
            <Icon name="Mic" size={19} className="text-white/70" />
          </button>
        )}
      </div>
    </>
  );
};

export default ChatRoomInputBar;
