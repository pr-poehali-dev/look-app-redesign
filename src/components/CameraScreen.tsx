import { useState, useRef, useEffect } from "react";
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

const MODES = ["Фото", "Видео", "Прямой эфир"];

interface CameraScreenProps {
  onClose: () => void;
}

const CameraScreen = ({ onClose }: CameraScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [filter, setFilter] = useState("none");
  const [mode, setMode] = useState("Видео");
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [flash, setFlash] = useState(false);
  const [shutterFlash, setShutterFlash] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCamera = async (facingMode: "user" | "environment") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // camera not available — demo mode
    }
  };

  useEffect(() => {
    startCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const flipCamera = () => {
    setFlipping(true);
    setTimeout(() => {
      const next = facing === "user" ? "environment" : "user";
      setFacing(next);
      startCamera(next);
      setFlipping(false);
    }, 200);
  };

  const handleShutter = () => {
    if (mode === "Фото") {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 200);
      return;
    }
    if (!recording) {
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } else {
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordSeconds(0);
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex flex-col">

      {/* Camera preview */}
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

        {/* Shutter flash */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-40 opacity-80" />
        )}

        {/* Recording border */}
        {recording && (
          <div className="absolute inset-0 border-[3px] border-[#fe2c55] pointer-events-none z-10" />
        )}
      </div>

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>

        {recording && (
          <div className="flex items-center gap-1.5 bg-[#fe2c55] px-3 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-bold font-mono">{formatTime(recordSeconds)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFlash((v) => !v)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <Icon
              name={flash ? "Zap" : "ZapOff"}
              size={18}
              className={flash ? "text-yellow-400" : "text-white"}
            />
          </button>
          <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Icon name="Settings2" size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="relative z-20 flex justify-center gap-8 pb-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setRecording(false);
              setRecordSeconds(0);
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            className={`text-sm font-semibold pb-1 transition-all ${
              mode === m ? "text-white border-b-2 border-white" : "text-white/40"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="relative z-20 flex-1" />

      {/* Filters */}
      <div
        className="relative z-20 flex gap-3 px-4 pb-5 overflow-x-scroll"
        style={{ scrollbarWidth: "none" }}
      >
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className="flex-shrink-0 flex flex-col items-center gap-1">
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
        <button className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/30 active:scale-95 transition-transform">
          <img
            src="https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg"
            className="w-full h-full object-cover"
            alt="gallery"
          />
        </button>

        {/* Shutter button */}
        <button onClick={handleShutter} className="relative flex items-center justify-center">
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
          onClick={flipCamera}
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
    </div>
  );
};

export default CameraScreen;
