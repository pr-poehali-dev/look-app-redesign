import { RefObject, useState, useRef, KeyboardEvent } from "react";
import Icon from "@/components/ui/icon";

const FILTER_STYLES: Record<string, string> = {
  none: "none",
  warm: "sepia(0.4) saturate(1.4) brightness(1.05)",
  cold: "hue-rotate(30deg) saturate(1.2) brightness(1.05)",
  bw: "grayscale(1) contrast(1.1)",
  vivid: "saturate(2) contrast(1.1)",
};

const SUGGESTED_TAGS: Record<string, string[]> = {
  music: ["музыка", "трек", "исполнитель", "песня", "cover"],
  dance: ["танцы", "choreography", "движение", "dancevideo"],
  sport: ["спорт", "тренировка", "фитнес", "gym", "мотивация"],
  humor: ["юмор", "смешно", "мем", "приколы", "лол"],
  travel: ["путешествия", "природа", "поездка", "мир", "adventure"],
  food: ["еда", "рецепт", "вкусно", "кухня", "foodporn"],
  style: ["стиль", "мода", "outfit", "fashion", "образ"],
  gaming: ["игры", "gaming", "стрим", "геймер", "play"],
  nature: ["природа", "пейзаж", "закат", "лес", "красота"],
  animals: ["животные", "питомцы", "кот", "собака", "cute"],
  beauty: ["красота", "макияж", "уход", "beauty", "skincare"],
  diy: ["сделайсам", "творчество", "handmade", "дизайн", "проект"],
  science: ["наука", "технологии", "факты", "эксперимент", "познавательно"],
  auto: ["авто", "машина", "тюнинг", "drive", "car"],
  feed: ["фото", "момент", "жизнь", "настроение", "daily"],
};

const VIDEO_CATEGORIES = [
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
  { id: "nature", label: "Природа" },
  { id: "animals", label: "Животные" },
  { id: "beauty", label: "Красота" },
  { id: "diy", label: "Сделай сам" },
  { id: "science", label: "Наука" },
  { id: "auto", label: "Авто" },
];

interface CameraPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  facing: "user" | "environment";
  flipping: boolean;
  filter: string;
  shutterFlash: boolean;
  recording: boolean;
  uploadedMedia: { url: string; type: "image" | "video" } | null;
  publishing: boolean;
  published: boolean;
  selectedCategory: string;
  showCategoryPicker: boolean;
  destination: "home" | "feed";
  hashtags: string;
  description: string;
  onHashtagsChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDestinationChange: (d: "home" | "feed") => void;
  onCloseMedia: () => void;
  onPublish: () => void;
  onCategoryChange: (id: string) => void;
  onToggleCategoryPicker: () => void;
}

const CameraPreview = ({
  videoRef,
  facing,
  flipping,
  filter,
  shutterFlash,
  recording,
  uploadedMedia,
  publishing,
  destination,
  onDestinationChange,
  published,
  selectedCategory,
  showCategoryPicker,
  hashtags,
  description,
  onHashtagsChange,
  onDescriptionChange,
  onCloseMedia,
  onPublish,
  onCategoryChange,
  onToggleCategoryPicker,
}: CameraPreviewProps) => {
  const [showMore, setShowMore] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tagInputRef = useRef<HTMLInputElement>(null);

  const chips = hashtags
    ? hashtags.split(" ").map(t => t.replace(/^#+/, "")).filter(Boolean)
    : [];

  const addTag = (raw: string) => {
    const tag = raw.replace(/^#+/, "").trim();
    if (!tag) return;
    if (!chips.includes(tag)) {
      onHashtagsChange([...chips, tag].map(t => "#" + t).join(" "));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    onHashtagsChange(chips.filter(t => t !== tag).map(t => "#" + t).join(" "));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && chips.length > 0) {
      removeTag(chips[chips.length - 1]);
    }
  };

  return (
    <div className="absolute inset-0">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
          filter: FILTER_STYLES[filter],
          transform: `scaleX(${facing === "user" ? -1 : 1}) scaleX(${flipping ? 0 : 1})`,
          transition: "transform 0.2s ease, filter 0.3s ease",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 -z-10" />

      {/* Uploaded media preview */}
      {uploadedMedia && (
        <div className="absolute inset-0 z-30 bg-black flex flex-col">
          <div className="relative flex-1">
            {uploadedMedia.type === "image" ? (
              <img src={uploadedMedia.url} className="w-full h-full object-contain" alt="preview" />
            ) : (
              <video src={uploadedMedia.url} className="w-full h-full object-contain" autoPlay loop playsInline />
            )}
            <button
              onClick={onCloseMedia}
              className="absolute top-14 left-5 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
          </div>

          <div className="bg-black/90 px-4 pt-4 pb-10 flex flex-col gap-3">

            {/* Описание */}
            <div>
              <p className="text-white/60 text-xs mb-2 font-medium">Описание</p>
              <textarea
                value={description}
                onChange={e => onDescriptionChange(e.target.value)}
                placeholder="Расскажи о публикации..."
                rows={2}
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white text-sm placeholder:text-white/30 outline-none resize-none"
              />
            </div>

            {/* Кнопка «Ещё» */}
            <button
              onClick={() => setShowMore(v => !v)}
              className="flex items-center gap-1.5 text-white/50 text-xs font-medium self-start"
            >
              <Icon name={showMore ? "ChevronUp" : "ChevronDown"} size={14} />
              {showMore ? "Скрыть" : "Ещё"}
            </button>

            {showMore && (
              <>
                {/* Хэштеги */}
                <div>
                  <p className="text-white/60 text-xs mb-2 font-medium">Хэштеги</p>
                  <div
                    className="flex flex-wrap gap-1.5 px-3 py-2.5 rounded-xl bg-white/10 border border-white/15 cursor-text min-h-[44px]"
                    onClick={() => tagInputRef.current?.focus()}
                  >
                    {chips.map(tag => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00a2ff]/20 border border-[#00a2ff]/40 text-[#00a2ff] text-xs font-medium"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); removeTag(tag); }}
                          className="text-[#00a2ff]/60 hover:text-[#00a2ff] leading-none"
                        >×</button>
                      </span>
                    ))}
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value.replace(/^#+/, ""))}
                      onKeyDown={handleTagKeyDown}
                      onBlur={() => addTag(tagInput)}
                      placeholder={chips.length === 0 ? "природа фото жизнь..." : ""}
                      className="flex-1 min-w-[80px] bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
                    />
                  </div>
                  {/* Подсказки */}
                  {(() => {
                    const key = destination === "feed" ? "feed" : selectedCategory;
                    const suggestions = (SUGGESTED_TAGS[key] || SUGGESTED_TAGS["feed"]).filter(t => !chips.includes(t));
                    if (!suggestions.length) return null;
                    return (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {suggestions.slice(0, 6).map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (!chips.includes(tag)) {
                                onHashtagsChange([...chips, tag].map(t => "#" + t).join(" "));
                              }
                            }}
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/10 hover:text-white/70 transition-colors"
                          >
                            <span className="text-white/25">+</span> #{tag}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Destination picker */}
                <div>
                  <p className="text-white/60 text-xs mb-2 font-medium">Куда публиковать?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDestinationChange("home")}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${destination === "home" ? "bg-[#fe2c55]/20 border-[#fe2c55]" : "bg-white/5 border-white/10"}`}
                    >
                      <Icon name="Play" size={20} className={destination === "home" ? "text-[#fe2c55]" : "text-white/50"} />
                      <span className={`text-xs font-semibold ${destination === "home" ? "text-[#fe2c55]" : "text-white/50"}`}>Главная</span>
                      <span className="text-white/30 text-[10px]">Видеолента</span>
                    </button>
                    <button
                      onClick={() => onDestinationChange("feed")}
                      className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${destination === "feed" ? "bg-[#0095f6]/20 border-[#0095f6]" : "bg-white/5 border-white/10"}`}
                    >
                      <Icon name="LayoutList" size={20} className={destination === "feed" ? "text-[#0095f6]" : "text-white/50"} />
                      <span className={`text-xs font-semibold ${destination === "feed" ? "text-[#0095f6]" : "text-white/50"}`}>Лента</span>
                      <span className="text-white/30 text-[10px]">Фото и посты</span>
                    </button>
                  </div>
                </div>

                {uploadedMedia.type === "video" && destination === "home" && (
                  <div>
                    <p className="text-white/60 text-xs mb-2 font-medium">Категория</p>
                    <button
                      onClick={onToggleCategoryPicker}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 border border-white/15"
                    >
                      <span className="text-white text-sm font-medium">
                        {VIDEO_CATEGORIES.find(c => c.id === selectedCategory)?.label}
                      </span>
                      <Icon name="ChevronDown" size={16} className="text-white/50" />
                    </button>
                    {showCategoryPicker && (
                      <div className="mt-1 bg-zinc-900 rounded-xl border border-white/10 overflow-hidden max-h-40 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
                        {VIDEO_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => onCategoryChange(cat.id)}
                            className={`w-full text-left px-4 py-2.5 text-sm border-b border-white/5 last:border-0 ${selectedCategory === cat.id ? "text-[#8b5cf6] font-semibold" : "text-white/80"}`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {published ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500">
                <Icon name="Check" size={18} className="text-white" />
                <span className="text-white font-bold text-base">Опубликовано!</span>
              </div>
            ) : (
              <button
                onClick={onPublish}
                disabled={publishing}
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#8b5cf6] text-white font-bold text-base disabled:opacity-60"
              >
                {publishing && <Icon name="Loader" size={18} className="text-white animate-spin" />}
                {publishing ? "Загрузка..." : "Опубликовать"}
              </button>
            )}
          </div>
        </div>
      )}

      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-40 opacity-80" />
      )}

      {recording && (
        <div className="absolute inset-0 border-[3px] border-[#fe2c55] pointer-events-none z-10" />
      )}
    </div>
  );
};

export default CameraPreview;