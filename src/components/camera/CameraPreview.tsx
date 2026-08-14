import { RefObject, useState, useRef, KeyboardEvent } from "react";
import Icon from "@/components/ui/icon";

const FILTER_STYLES: Record<string, string> = {
  none: "none",
  clean: "contrast(1.08) saturate(1.12) brightness(1.04)",
  cinematic: "contrast(1.15) saturate(0.92) brightness(0.98) hue-rotate(-8deg)",
  vivid: "saturate(1.7) contrast(1.12) brightness(1.02)",
  neon: "saturate(1.9) contrast(1.2) hue-rotate(15deg) brightness(1.05)",
  mono: "grayscale(1) contrast(1.15) brightness(1.05)",
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
  publishProgress?: { stage: "compress" | "upload" | "save"; percent: number } | null;
  published: boolean;
  selectedCategory: string;
  showCategoryPicker: boolean;
  destination: "home" | "feed";
  hashtags: string;
  description: string;
  isAd: boolean;
  onIsAdChange: (v: boolean) => void;
  onHashtagsChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDestinationChange: (d: "home" | "feed") => void;
  onCloseMedia: () => void;
  onEditPhoto?: () => void;
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
  publishProgress,
  destination,
  onDestinationChange,
  published,
  selectedCategory,
  showCategoryPicker,
  hashtags,
  description,
  isAd,
  onIsAdChange,
  onHashtagsChange,
  onDescriptionChange,
  onCloseMedia,
  onEditPhoto,
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
      <div className="absolute inset-0 -z-10" style={{ backgroundColor: 'var(--look-bg)' }} />

      {/* Uploaded media preview */}
      {uploadedMedia && (
        <div className="absolute inset-0 z-30 bg-black flex flex-col md:flex-row md:overflow-hidden overflow-y-auto md:overflow-y-hidden">
          <div className="relative w-full h-[38vh] flex-shrink-0 md:h-auto md:flex-[1.4] md:min-h-0">
            {uploadedMedia.type === "image" ? (
              <img src={uploadedMedia.url} className="w-full h-full object-contain" alt="preview" />
            ) : (
              <video src={uploadedMedia.url} className="w-full h-full object-contain" autoPlay loop playsInline />
            )}
            <button
              onClick={onCloseMedia}
              className="absolute top-4 left-4 md:top-5 md:left-5 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
            {uploadedMedia.type === "image" && onEditPhoto && (
              <button
                onClick={onEditPhoto}
                className="absolute top-4 right-4 md:top-5 md:right-5 flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full bg-[#fe2c55] backdrop-blur-sm active:scale-95 transition-transform"
              >
                <Icon name="Wand2" size={16} className="text-white" />
                <span className="text-white text-sm font-semibold">Редактировать</span>
              </button>
            )}
          </div>

          <div className="bg-black/90 px-4 pt-4 pb-[max(28px,env(safe-area-inset-bottom))] flex flex-col gap-3 md:w-[420px] md:flex-shrink-0 md:overflow-y-auto md:py-6 md:border-l md:border-white/10">

            {/* Превью поста (только ПК) */}
            <div className="hidden md:block bg-zinc-900/60 border border-white/10 rounded-2xl p-3 mb-1">
              <p className="text-white/40 text-[10px] mb-2 font-semibold uppercase tracking-wider">Так увидят твой пост</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#fe2c55]" />
                <span className="text-white text-xs font-semibold">ты</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black aspect-square mb-2">
                {uploadedMedia.type === "image" ? (
                  <img src={uploadedMedia.url} className="w-full h-full object-cover" alt="preview" />
                ) : (
                  <video src={uploadedMedia.url} className="w-full h-full object-cover" muted playsInline autoPlay loop />
                )}
              </div>
              {description && (
                <p className="text-white/80 text-xs leading-snug whitespace-pre-wrap break-words">{description}</p>
              )}
              {chips.length > 0 && (
                <p className="text-[#0095f6] text-xs mt-1 break-words">
                  {chips.map(t => "#" + t).join(" ")}
                </p>
              )}
            </div>


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

                {/* Реклама / спонсорская публикация */}
                <button
                  onClick={() => onIsAdChange(!isAd)}
                  className="w-full flex items-center justify-between bg-white/10 border border-white/15 rounded-xl px-3 py-3"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon name="Megaphone" size={16} className="text-white/70" />
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">Это реклама</p>
                      <p className="text-white/40 text-xs">Будет помечено «Реклама» в ленте</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors flex-shrink-0 ${isAd ? "bg-[#fe2c55]" : "bg-white/15"}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isAd ? "translate-x-4" : "translate-x-0"}`} />
                  </div>
                </button>
              </>
            )}

            {published ? (
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500">
                <Icon name="Check" size={18} className="text-white" />
                <span className="text-white font-bold text-base">Опубликовано!</span>
              </div>
            ) : publishing && publishProgress ? (
              <div className="flex flex-col gap-2 py-3 px-4 rounded-xl bg-[#8b5cf6]">
                <div className="flex items-center gap-2 text-white">
                  <Icon name="Loader" size={18} className="text-white animate-spin" />
                  <span className="font-semibold text-sm">
                    {publishProgress.stage === "compress" && "Сжимаем видео..."}
                    {publishProgress.stage === "upload" && "Загружаем..."}
                    {publishProgress.stage === "save" && "Сохраняем..."}
                  </span>
                  <span className="ml-auto font-bold text-sm">{publishProgress.percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white transition-all"
                    style={{ width: `${publishProgress.percent}%` }}
                  />
                </div>
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