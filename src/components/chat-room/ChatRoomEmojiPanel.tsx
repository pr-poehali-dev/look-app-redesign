import Icon from "@/components/ui/icon";
import { EMOJI_CATEGORIES, STICKERS } from "./ChatRoomConstants";

interface ChatRoomEmojiPanelProps {
  emojiTab: "emoji" | "stickers" | "gif";
  setEmojiTab: (tab: "emoji" | "stickers" | "gif") => void;
  emojiCat: string;
  setEmojiCat: (id: string) => void;
  insertEmoji: (e: string) => void;
  sendSticker: (sticker: string) => void;
  gifQuery: string;
  setGifQuery: (q: string) => void;
  gifResults: { id: string; url: string; preview: string }[];
  gifLoading: boolean;
  sendGif: (url: string) => void;
}

const ChatRoomEmojiPanel = ({
  emojiTab,
  setEmojiTab,
  emojiCat,
  setEmojiCat,
  insertEmoji,
  sendSticker,
  gifQuery,
  setGifQuery,
  gifResults,
  gifLoading,
  sendGif,
}: ChatRoomEmojiPanelProps) => {
  return (
    <div className="bg-[#111] border-t border-white/8 flex flex-col">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 pt-2.5">
        {([
          { id: "emoji", label: "Эмодзи", icon: "Smile" },
          { id: "stickers", label: "Стикеры", icon: "Sticker" },
          { id: "gif", label: "GIF", icon: "Film" },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setEmojiTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${emojiTab === t.id ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/60 hover:bg-white/15"}`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {emojiTab === "emoji" && (
        <>
          <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {EMOJI_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setEmojiCat(c.id)}
                className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${emojiCat === c.id ? "bg-white/15 text-[#fe2c55]" : "text-white/50 hover:bg-white/10"}`}
              >
                <Icon name={c.icon} size={18} />
              </button>
            ))}
          </div>
          <div className="px-3 py-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            <div className="grid grid-cols-8 gap-1">
              {(EMOJI_CATEGORIES.find((c) => c.id === emojiCat)?.emojis || []).map((e, i) => (
                <button
                  key={i}
                  onClick={() => insertEmoji(e)}
                  className="w-9 h-9 flex items-center justify-center text-2xl rounded-lg hover:bg-white/10 active:bg-white/20"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {emojiTab === "stickers" && (
        <div className="px-3 py-3 max-h-56 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div className="grid grid-cols-4 gap-2">
            {STICKERS.map((s, i) => (
              <button
                key={i}
                onClick={() => sendSticker(s)}
                className="aspect-square flex items-center justify-center text-5xl rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {emojiTab === "gif" && (
        <div className="flex flex-col">
          <div className="px-3 pt-2">
            <div className="flex items-center gap-2 bg-white/8 rounded-full px-3.5 py-2">
              <Icon name="Search" size={15} className="text-white/40" />
              <input
                value={gifQuery}
                onChange={(e) => setGifQuery(e.target.value)}
                placeholder="Поиск GIF..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 pt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {["👋 Привет","😂 Смех","❤️ Любовь","👍 Ок","🎉 Праздник","😢 Грусть","🔥 Огонь","😴 Спать","💃 Танцы","👏 Браво"].map((s) => {
              const q = s.split(" ").slice(1).join(" ");
              const active = gifQuery === q;
              return (
                <button
                  key={s}
                  onClick={() => setGifQuery(q)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/70 hover:bg-white/15"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 max-h-52 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {gifLoading && gifResults.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-white/40 text-sm">Загрузка...</div>
            ) : gifResults.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-white/40 text-sm">Ничего не найдено</div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {gifResults.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => sendGif(g.url)}
                    className="aspect-square rounded-xl overflow-hidden bg-white/5 active:scale-95 transition-transform"
                  >
                    <img src={g.preview} className="w-full h-full object-cover" alt="gif" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoomEmojiPanel;
