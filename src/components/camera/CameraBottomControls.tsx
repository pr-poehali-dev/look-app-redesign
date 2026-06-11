import { RefObject, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const FILTERS = [
  { id: "none", label: "Обычный" },
  { id: "clean", label: "Clean" },
  { id: "cinematic", label: "Cinematic" },
  { id: "vivid", label: "Vivid" },
  { id: "neon", label: "Neon" },
  { id: "mono", label: "Mono" },
];

const FILTER_STYLES: Record<string, string> = {
  none: "none",
  clean: "contrast(1.08) saturate(1.12) brightness(1.04)",
  cinematic: "contrast(1.15) saturate(0.92) brightness(0.98) hue-rotate(-8deg)",
  vivid: "saturate(1.7) contrast(1.12) brightness(1.02)",
  neon: "saturate(1.9) contrast(1.2) hue-rotate(15deg) brightness(1.05)",
  mono: "grayscale(1) contrast(1.15) brightness(1.05)",
};

interface CameraBottomControlsProps {
  filter: string;
  recording: boolean;
  flipping: boolean;
  uploadedMedia: { url: string; type: "image" | "video" } | null;
  mediaInputRef: RefObject<HTMLInputElement>;
  mode?: string;
  onMediaFile?: (file: File) => void;
  onFilterChange: (id: string) => void;
  onShutter: () => void;
  onFlipCamera: () => void;
}

const CameraBottomControls = ({
  filter,
  recording,
  flipping,
  uploadedMedia,
  mediaInputRef,
  mode = "Видео",
  onMediaFile,
  onFilterChange,
  onShutter,
  onFlipCamera,
}: CameraBottomControlsProps) => {
  const [showSheet, setShowSheet] = useState(false);

  // input БЕЗ capture — Android открывает только галерею
  const galleryInputRef = useRef<HTMLInputElement>(null);
  // input С capture — Android открывает только камеру
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isVideo = mode === "Видео";
  const isPhoto = mode === "Фото";
  const accept = isVideo ? "video/*" : isPhoto ? "image/*" : "image/*,video/*";

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (onMediaFile) {
      onMediaFile(file);
    } else if (mediaInputRef.current) {
      try {
        const dt = new DataTransfer();
        dt.items.add(file);
        Object.defineProperty(mediaInputRef.current, "files", { value: dt.files, configurable: true });
        mediaInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      } catch { /* noop */ }
    }
  };

  const openGallery = () => {
    setShowSheet(false);
    setTimeout(() => {
      if (galleryInputRef.current) {
        galleryInputRef.current.value = "";
        galleryInputRef.current.click();
      }
    }, 80);
  };

  const openCamera = () => {
    setShowSheet(false);
    setTimeout(() => {
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
        cameraInputRef.current.click();
      }
    }, 80);
  };

  return (
    <>
      {/* Галерея — без capture: Android открывает только галерею */}
      <input
        ref={galleryInputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />
      {/* Камера — с capture: Android открывает только камеру */}
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        className="hidden"
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />

      {/* Filters */}
      <div
        className="relative z-20 flex gap-3 px-4 pb-5 overflow-x-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => onFilterChange(f.id)} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div
              className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                filter === f.id ? "border-white scale-105" : "border-white/20"
              }`}
            >
              <img
                src="https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg"
                className="w-full h-full object-cover"
                alt={f.label}
                style={{ filter: FILTER_STYLES[f.id] }}
              />
            </div>
            <span className={`text-xs ${filter === f.id ? "text-white" : "text-white/40"}`}>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="relative z-20 flex items-center justify-between px-8 pb-14">

        {/* Gallery button — открывает bottom sheet */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowSheet(true); }}
          className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/30 active:scale-95 transition-transform relative"
        >
          {uploadedMedia ? (
            uploadedMedia.type === "image"
              ? <img src={uploadedMedia.url} className="w-full h-full object-cover pointer-events-none" alt="gallery" />
              : <video src={uploadedMedia.url} className="w-full h-full object-cover pointer-events-none" muted playsInline />
          ) : (
            <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-0.5 pointer-events-none">
              <Icon name="Image" size={20} className="text-white/60" />
              <span className="text-white/40 text-[9px]">Галерея</span>
            </div>
          )}
        </button>

        {/* Shutter button */}
        <button onClick={onShutter} className="relative flex items-center justify-center">
          <div
            className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 ${
              recording ? "border-[#fe2c55]" : "border-white"
            }`}
          >
            <div
              className={`transition-all duration-200 bg-white ${
                recording ? "w-8 h-8 rounded-lg bg-[#fe2c55]" : "w-16 h-16 rounded-full"
              }`}
            />
          </div>
        </button>

        {/* Flip camera button */}
        <button
          onClick={onFlipCamera}
          className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border border-white/25 flex items-center justify-center active:scale-90 transition-all duration-200"
        >
          <Icon
            name="RefreshCw"
            size={24}
            className="text-white"
            style={{ transform: flipping ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
          />
        </button>
      </div>

      {/* Bottom sheet — выбор источника */}
      {showSheet && (
        <div className="fixed inset-0 z-[200] flex items-end" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="relative w-full rounded-t-3xl overflow-hidden pb-8"
            style={{ background: "#1a1a1a" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <p className="text-white/40 text-xs text-center mb-3">
              {isVideo ? "Выбрать видео" : isPhoto ? "Выбрать фото" : "Выбрать медиафайл"}
            </p>
            <div className="flex flex-col gap-1 px-4">
              {/* Галерея */}
              <button
                onClick={openGallery}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl active:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name={isVideo ? "Film" : "Image"} size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">
                    {isVideo ? "Видео из галереи" : isPhoto ? "Фото из галереи" : "Файл из галереи"}
                  </p>
                  <p className="text-white/40 text-xs">Выбрать из сохранённых</p>
                </div>
              </button>
              {/* Камера */}
              <button
                onClick={openCamera}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl active:bg-white/10 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon name={isVideo ? "Video" : "Camera"} size={20} className="text-white" />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium text-sm">
                    {isVideo ? "Снять видео" : "Сфотографировать"}
                  </p>
                  <p className="text-white/40 text-xs">Открыть камеру</p>
                </div>
              </button>
            </div>
            <div className="px-4 mt-2">
              <button
                onClick={() => setShowSheet(false)}
                className="w-full py-3.5 rounded-2xl bg-white/8 text-white/60 text-sm font-medium active:bg-white/12 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CameraBottomControls;