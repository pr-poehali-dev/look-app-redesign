import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const TRACKS = [
  { id: 1, title: "Roses Remix", artist: "Imanbek", duration: "2:34", color: "#fe2c55" },
  { id: 2, title: "Bangarang", artist: "Skrillex", duration: "3:12", color: "#8b5cf6" },
  { id: 3, title: "Blinding Lights", artist: "The Weeknd", duration: "3:20", color: "#f59e0b" },
  { id: 4, title: "Mood", artist: "24kGoldn", duration: "2:20", color: "#34d399" },
  { id: 5, title: "Stay", artist: "Kid LAROI", duration: "2:21", color: "#61d4f0" },
  { id: 6, title: "Levitating", artist: "Dua Lipa", duration: "3:23", color: "#ec4899" },
  { id: 7, title: "Heat Waves", artist: "Glass Animals", duration: "3:59", color: "#fb923c" },
  { id: 8, title: "Good 4 U", artist: "Olivia Rodrigo", duration: "2:58", color: "#a78bfa" },
];

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
  const [showMusicPanel, setShowMusicPanel] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<typeof TRACKS[0] | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [uploadedAudio, setUploadedAudio] = useState<{ name: string; url: string } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    setUploadedMedia({ url, type });
  };
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedAudio({ name: file.name.replace(/\.[^.]+$/, ""), url });
    setSelectedTrack(null);
    setPlayingId(null);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    }
    setShowMusicPanel(false);
  };

  const removeUploadedAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setUploadedAudio(null);
  };

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

      {/* Hidden audio player */}
      <audio ref={audioRef} loop />
      {/* Hidden file input for audio */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />
      {/* Hidden file input for media */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaUpload}
      />

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

        {/* Uploaded media preview */}
        {uploadedMedia && (
          <div className="absolute inset-0 z-30 bg-black">
            {uploadedMedia.type === "image" ? (
              <img src={uploadedMedia.url} className="w-full h-full object-contain" alt="preview" />
            ) : (
              <video src={uploadedMedia.url} className="w-full h-full object-contain" autoPlay loop playsInline />
            )}
            <button
              onClick={() => setUploadedMedia(null)}
              className="absolute top-14 left-5 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center z-40"
            >
              <Icon name="X" size={20} className="text-white" />
            </button>
            <div className="absolute bottom-14 left-0 right-0 flex justify-center z-40">
              <button className="px-8 py-3 rounded-full bg-white text-black font-bold text-base">
                Опубликовать
              </button>
            </div>
          </div>
        )}

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
          <button
            onClick={() => setShowMusicPanel((v) => !v)}
            className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center border transition-all ${
              selectedTrack ? "bg-[#fe2c55]/80 border-[#fe2c55]" : "bg-black/40 border-transparent"
            }`}
          >
            <Icon name="Music" size={18} className="text-white" />
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

      {/* Selected track ticker */}
      {(selectedTrack || uploadedAudio) && !showMusicPanel && (
        <div className="relative z-20 mx-4 mb-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center animate-spin flex-shrink-0"
            style={{ background: selectedTrack ? selectedTrack.color : "#fe2c55", animationDuration: "3s" }}
          >
            <Icon name="Music" size={11} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium flex-1 truncate">
            {uploadedAudio ? uploadedAudio.name : `${selectedTrack!.title} — ${selectedTrack!.artist}`}
          </span>
          <button onClick={() => { setSelectedTrack(null); removeUploadedAudio(); }}>
            <Icon name="X" size={14} className="text-white/50" />
          </button>
        </div>
      )}

      {/* Music panel */}
      {showMusicPanel && (
        <div className="relative z-20 mx-2 mb-3 bg-black/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-white font-bold text-sm">Музыка для видео</span>
            <button onClick={() => setShowMusicPanel(false)}>
              <Icon name="ChevronDown" size={20} className="text-white/60" />
            </button>
          </div>

          {/* Upload from device */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mx-3 mb-2 w-[calc(100%-24px)] flex items-center gap-3 bg-white/8 border border-dashed border-white/20 rounded-2xl px-4 py-3 hover:bg-white/12 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-[#fe2c55]/20 border border-[#fe2c55]/40 flex items-center justify-center flex-shrink-0">
              <Icon name="Upload" size={17} className="text-[#fe2c55]" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Загрузить с устройства</p>
              <p className="text-white/40 text-xs">MP3, AAC, WAV, M4A</p>
            </div>
            {uploadedAudio && (
              <div className="ml-auto w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center">
                <Icon name="Check" size={11} className="text-white" />
              </div>
            )}
          </button>
          <div className="flex flex-col max-h-52 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
            {TRACKS.map((track) => {
              const isSelected = selectedTrack?.id === track.id;
              const isPlaying = playingId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(isSelected ? null : track);
                    setPlayingId(isPlaying ? null : track.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 transition-all ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPlaying ? "animate-spin" : ""}`}
                    style={{ background: `${track.color}30`, border: `1px solid ${track.color}50`, animationDuration: "3s" }}
                  >
                    <Icon name={isPlaying ? "Music" : "Play"} size={16} style={{ color: track.color }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{track.title}</p>
                    <p className="text-white/40 text-xs truncate">{track.artist}</p>
                  </div>
                  <span className="text-white/30 text-xs flex-shrink-0">{track.duration}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0">
                      <Icon name="Check" size={11} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

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
        <button
          onClick={() => mediaInputRef.current?.click()}
          className="w-14 h-14 rounded-xl overflow-hidden border-2 border-white/30 active:scale-95 transition-transform relative"
        >
          {uploadedMedia ? (
            uploadedMedia.type === "image"
              ? <img src={uploadedMedia.url} className="w-full h-full object-cover" alt="gallery" />
              : <video src={uploadedMedia.url} className="w-full h-full object-cover" muted />
          ) : (
            <div className="w-full h-full bg-white/10 flex flex-col items-center justify-center gap-0.5">
              <Icon name="Image" size={20} className="text-white/60" />
              <span className="text-white/40 text-[9px]">Галерея</span>
            </div>
          )}
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