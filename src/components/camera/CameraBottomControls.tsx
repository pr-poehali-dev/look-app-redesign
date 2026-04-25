import { RefObject } from "react";
import Icon from "@/components/ui/icon";

const FILTERS = [
  { id: "none", label: "Обычный" },
  { id: "warm", label: "Тепло" },
  { id: "cold", label: "Холод" },
  { id: "bw", label: "Ч/Б" },
  { id: "vivid", label: "Яркий" },
];

const FILTER_STYLES: Record<string, string> = {
  none: "none",
  warm: "sepia(0.4) saturate(1.4) brightness(1.05)",
  cold: "hue-rotate(30deg) saturate(1.2) brightness(1.05)",
  bw: "grayscale(1) contrast(1.1)",
  vivid: "saturate(2) contrast(1.1)",
};

interface CameraBottomControlsProps {
  filter: string;
  recording: boolean;
  flipping: boolean;
  uploadedMedia: { url: string; type: "image" | "video" } | null;
  mediaInputRef: RefObject<HTMLInputElement>;
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
  onFilterChange,
  onShutter,
  onFlipCamera,
}: CameraBottomControlsProps) => {
  return (
    <>
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

        {/* Gallery */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); mediaInputRef.current?.click(); }}
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
    </>
  );
};

export default CameraBottomControls;
