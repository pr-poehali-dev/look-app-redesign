import { RefObject } from "react";
import Icon from "@/components/ui/icon";

const FILTER_STYLES: Record<string, string> = {
  none: "none",
  warm: "sepia(0.4) saturate(1.4) brightness(1.05)",
  cold: "hue-rotate(30deg) saturate(1.2) brightness(1.05)",
  bw: "grayscale(1) contrast(1.1)",
  vivid: "saturate(2) contrast(1.1)",
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
  published,
  selectedCategory,
  showCategoryPicker,
  onCloseMedia,
  onPublish,
  onCategoryChange,
  onToggleCategoryPicker,
}: CameraPreviewProps) => {
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
            <div className="absolute top-14 right-5 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full">
              <span className="text-white text-xs font-semibold">
                {uploadedMedia.type === "video" ? "🎬 Видео → Главная" : "🖼 Фото → Лента"}
              </span>
            </div>
          </div>

          <div className="bg-black/90 px-4 pt-4 pb-10 flex flex-col gap-3">
            {uploadedMedia.type === "video" && (
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
