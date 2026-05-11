import { RefObject } from "react";
import Icon from "@/components/ui/icon";

interface ChatMsg { id: number; name: string; text: string; color: string; }

const GIFTS = ["🌹", "🎁", "💎", "🚀", "⭐", "🏆", "💰", "🎉"];

interface Props {
  likes: number;
  chat: ChatMsg[];
  chatRef: RefObject<HTMLDivElement>;
  showGifts: boolean;
  inputMsg: string;
  onInputChange: (v: string) => void;
  onSendMessage: () => void;
  onToggleGifts: () => void;
  onSendGift: (emoji: string) => void;
  onStopLive: () => void;
}

const LiveStreamOverlay = ({
  likes,
  chat,
  chatRef,
  showGifts,
  inputMsg,
  onInputChange,
  onSendMessage,
  onToggleGifts,
  onSendGift,
  onStopLive,
}: Props) => {
  return (
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
              <button key={g} onClick={() => onSendGift(g)}
                className="aspect-square rounded-xl bg-white/10 flex items-center justify-center text-2xl active:scale-90 transition-all">
                {g}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2.5">
            <input type="text" value={inputMsg} onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onSendMessage()}
              placeholder="Написать комментарий..."
              className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30" />
            {inputMsg && (
              <button onClick={onSendMessage}>
                <Icon name="Send" size={16} className="text-[#61d4f0]" />
              </button>
            )}
          </div>
          <button onClick={onToggleGifts}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <span className="text-lg">🎁</span>
          </button>
          <button onClick={onStopLive}
            className="px-4 h-10 rounded-full bg-[#fe2c55]/90 flex items-center justify-center">
            <span className="text-white text-xs font-bold">Стоп</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default LiveStreamOverlay;
