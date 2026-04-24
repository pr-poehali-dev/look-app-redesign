import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const DURATIONS = [15, 30, 60];
const EFFECTS = ["Нет", "Красота", "Фильтр", "Блур", "Вспышка"];

interface CameraScreenProps {
  onClose: () => void;
}

const CameraScreen = ({ onClose }: CameraScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [maxDuration, setMaxDuration] = useState(15);
  const [flash, setFlash] = useState(false);
  const [effect, setEffect] = useState("Нет");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  const startCamera = async (facing: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError(false);
    } catch {
      setCameraError(true);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const flipCamera = async () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    await startCamera(next);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current);
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedUrl(URL.createObjectURL(blob));
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        return e + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleRecord = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const resetRecording = () => {
    setRecordedUrl(null);
    setElapsed(0);
  };

  const progress = (elapsed / maxDuration) * 100;

  const filterStyle = (): React.CSSProperties => {
    if (effect === "Красота") return { filter: "brightness(1.1) contrast(0.95) saturate(1.2)" };
    if (effect === "Фильтр") return { filter: "sepia(0.4) saturate(1.5)" };
    if (effect === "Блур") return { filter: "blur(1px) brightness(1.05)" };
    return {};
  };

  // Preview recorded video
  if (recordedUrl) {
    return (
      <div className="relative w-full h-full bg-black flex flex-col">
        <video src={recordedUrl} className="absolute inset-0 w-full h-full object-cover" autoPlay loop playsInline />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />

        <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
          <button onClick={resetRecording} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
            <Icon name="RotateCcw" size={18} className="text-white" />
          </button>
          <span className="text-white font-bold text-base">Предпросмотр</span>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
            <Icon name="X" size={18} className="text-white" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pb-12 flex flex-col gap-3">
          <button className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#e0264c] active:scale-95 transition-all">
            <Icon name="Upload" size={20} />
            Опубликовать
          </button>
          <button onClick={resetRecording} className="w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold text-base flex items-center justify-center gap-2">
            <Icon name="Trash2" size={18} />
            Снять заново
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black flex flex-col overflow-hidden">
      {/* Camera preview */}
      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 gap-4">
          <Icon name="CameraOff" size={52} className="text-white/20" />
          <p className="text-white/40 text-sm text-center px-8">Нет доступа к камере. Разреши использование камеры в браузере.</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none", ...filterStyle() }}
        />
      )}

      {/* Flash overlay */}
      {flash && <div className="absolute inset-0 bg-white z-40 opacity-80 pointer-events-none" />}

      {/* Dark overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 pointer-events-none" />

      {/* Progress bar */}
      {recording && (
        <div className="absolute top-0 left-0 right-0 h-1 z-20 bg-white/20">
          <div
            className="h-full bg-[#fe2c55] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-2">
        <button onClick={onClose} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center">
          <Icon name="X" size={20} className="text-white" />
        </button>

        <div className="flex items-center gap-2">
          {recording && (
            <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded-md">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-bold">
                {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={() => setFlash((v) => !v)}
          className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center"
        >
          <Icon name={flash ? "ZapOff" : "Zap"} size={18} className={flash ? "text-[#fbbf24]" : "text-white"} />
        </button>
      </div>

      {/* Duration selector */}
      {!recording && (
        <div className="relative z-20 flex justify-center gap-2 mt-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setMaxDuration(d)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                maxDuration === d
                  ? "bg-[#fe2c55] text-white"
                  : "bg-black/40 text-white/60 border border-white/20"
              }`}
            >
              {d}с
            </button>
          ))}
        </div>
      )}

      {/* Right side tools */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-5">
        <button
          onClick={flipCamera}
          className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-0.5"
        >
          <Icon name="RefreshCw" size={20} className="text-white" />
        </button>
        <button
          onClick={() => setShowEffects((v) => !v)}
          className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center"
        >
          <Icon name="Sparkles" size={20} className="text-white" />
        </button>
        <button className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Icon name="Music" size={20} className="text-white" />
        </button>
        <button className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Icon name="Timer" size={20} className="text-white" />
        </button>
      </div>

      {/* Effects panel */}
      {showEffects && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
          {EFFECTS.map((e) => (
            <button
              key={e}
              onClick={() => { setEffect(e); setShowEffects(false); }}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                effect === e ? "bg-white text-black" : "bg-black/50 text-white border border-white/20"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-10 flex flex-col items-center gap-6">
        {/* Gallery + Record + Flip row */}
        <div className="flex items-center justify-between w-full px-10">
          {/* Gallery placeholder */}
          <button className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 border-2 border-white/20 flex items-center justify-center">
            <Icon name="Image" size={22} className="text-white/60" />
          </button>

          {/* Record button */}
          <button
            onPointerDown={handleRecord}
            className="relative flex items-center justify-center"
          >
            <div className={`absolute rounded-full border-4 transition-all duration-200 ${
              recording ? "border-[#fe2c55] w-20 h-20" : "border-white w-20 h-20"
            }`} />
            <div className={`transition-all duration-200 rounded-full bg-[#fe2c55] ${
              recording ? "w-10 h-10 rounded-xl" : "w-14 h-14 rounded-full"
            }`} />
          </button>

          {/* Flip camera */}
          <button
            onClick={flipCamera}
            className="w-14 h-14 rounded-full bg-black/50 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center"
          >
            <Icon name="CameraOff" fallback="RefreshCw" name={"RefreshCw" as const} size={22} className="text-white" />
          </button>
        </div>

        {/* Mode tabs */}
        {!recording && (
          <div className="flex items-center gap-6">
            {["Фото", "Видео", "Текст"].map((m) => (
              <button key={m} className={`text-sm font-semibold ${m === "Видео" ? "text-white border-b border-white pb-0.5" : "text-white/50"}`}>
                {m}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraScreen;
