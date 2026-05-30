import { useState, useRef, useEffect } from "react";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import CameraPreview from "@/components/camera/CameraPreview";
import CameraTopBar from "@/components/camera/CameraTopBar";
import CameraMusicPanel from "@/components/camera/CameraMusicPanel";
import CameraBottomControls from "@/components/camera/CameraBottomControls";
import LiveStream from "@/components/LiveStream";
import MediaEditor from "@/components/camera/editor/MediaEditor";
import { compressVideo, uploadFileDirect } from "@/lib/videoCompress";

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

interface CameraScreenProps {
  onClose: () => void;
}

const CameraScreen = ({ onClose }: CameraScreenProps) => {
  const { refreshMedia } = useUserMedia();
  const { user } = useAuth();
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
  const mediaFileRef = useRef<File | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; type: "image" | "video" } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishProgress, setPublishProgress] = useState<{ stage: "compress" | "upload" | "save"; percent: number } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("humor");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [destination, setDestination] = useState<"home" | "feed">("home");
  const [hashtags, setHashtags] = useState("");
  const [description, setDescription] = useState("");
  const [showLive, setShowLive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    applyMediaFile(file);
  };

  const applyMediaFile = (file: File) => {
    mediaFileRef.current = file;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    setUploadedMedia({ url, type });
    setPublished(false);
  };

  const handlePublish = async () => {
    const original = mediaFileRef.current;
    if (!original) return;
    setPublishing(true);
    try {
      let file = original;

      // 1) Сжатие видео (если файл больше 4 МБ и это видео)
      if (file.type.startsWith("video") && file.size > 4 * 1024 * 1024) {
        setPublishProgress({ stage: "compress", percent: 0 });
        try {
          const result = await compressVideo(file, {
            maxWidth: 720,
            maxHeight: 1280,
            videoBitsPerSecond: 1_200_000,
            onProgress: (p) => setPublishProgress({ stage: "compress", percent: p }),
          });
          file = result.file;
        } catch (err) {
          console.warn("[CameraScreen] compress failed, uploading original", err);
        }
      }

      // 2) Прямая загрузка в S3 через presigned URL (любой размер)
      setPublishProgress({ stage: "upload", percent: 0 });
      const reg = await uploadFileDirect(
        file,
        {
          category: destination === "home" ? selectedCategory : "feed",
          description,
          hashtags,
          author: user?.name || "Пользователь",
          handle: user?.handle || user?.name || "user",
          user_id: user?.id || "anonymous",
        },
        (p) => setPublishProgress({ stage: "upload", percent: p }),
      );

      if (!reg || !reg.url) throw new Error("Сервер не вернул ссылку на файл");

      setPublishProgress({ stage: "save", percent: 100 });
      setPublished(true);
      await refreshMedia();
      setTimeout(() => {
        setUploadedMedia(null);
        setPublished(false);
        onClose();
      }, 1500);
    } catch (e) {
      console.error("[CameraScreen] publish error", e);
      alert("Не удалось опубликовать. Проверь интернет и попробуй ещё раз.");
    } finally {
      setPublishing(false);
      setPublishProgress(null);
    }
  };

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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const capturePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      mediaFileRef.current = file;
      const url = URL.createObjectURL(file);
      setUploadedMedia({ url, type: "image" });
      setPublished(false);
    }, "image/jpeg", 0.92);
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    recordedChunksRef.current = [];
    const types = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    let chosen = "";
    for (const t of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
        chosen = t;
        break;
      }
    }
    try {
      const rec = chosen ? new MediaRecorder(stream, { mimeType: chosen }) : new MediaRecorder(stream);
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const mime = chosen || "video/webm";
        const blob = new Blob(recordedChunksRef.current, { type: mime.split(";")[0] });
        const ext = mime.includes("mp4") ? "mp4" : "webm";
        const file = new File([blob], `video-${Date.now()}.${ext}`, { type: blob.type });
        mediaFileRef.current = file;
        const url = URL.createObjectURL(blob);
        setUploadedMedia({ url, type: "video" });
        setPublished(false);
      };
      mediaRecorderRef.current = rec;
      rec.start(250);
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (e) {
      console.error("[CameraScreen] record start failed", e);
    }
  };

  const stopRecording = () => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { /* ignore */ }
    }
    mediaRecorderRef.current = null;
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordSeconds(0);
  };

  const handleShutter = () => {
    if (mode === "Фото") {
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 200);
      capturePhoto();
      return;
    }
    if (!recording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleGoLive = () => {
    // Останавливаем камеру CameraScreen чтобы LiveStream мог её захватить
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowLive(true);
  };

  if (showLive) {
    return <LiveStream onClose={onClose} />;
  }

  if (mode === "Конструктор") {
    return <MediaEditor onClose={onClose} onPublished={onClose} />;
  }

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
      <input
        ref={mediaInputRef}
        type="file"
        accept={mode === "Видео" ? "video/*" : mode === "Фото" ? "image/*" : "image/*,video/*"}
        className="hidden"
        onChange={handleMediaUpload}
        onClick={(e) => e.stopPropagation()}
      />

      <CameraPreview
        videoRef={videoRef}
        facing={facing}
        flipping={flipping}
        filter={filter}
        shutterFlash={shutterFlash}
        recording={recording}
        uploadedMedia={uploadedMedia}
        publishing={publishing}
        publishProgress={publishProgress}
        published={published}
        selectedCategory={selectedCategory}
        showCategoryPicker={showCategoryPicker}
        destination={destination}
        onDestinationChange={setDestination}
        hashtags={hashtags}
        onHashtagsChange={setHashtags}
        description={description}
        onDescriptionChange={setDescription}
        onCloseMedia={() => { setUploadedMedia(null); setPublished(false); setHashtags(""); setDescription(""); }}
        onPublish={handlePublish}
        onCategoryChange={(id) => { setSelectedCategory(id); setShowCategoryPicker(false); }}
        onToggleCategoryPicker={() => setShowCategoryPicker(v => !v)}
      />

      <CameraTopBar
        flash={flash}
        recording={recording}
        recordSeconds={recordSeconds}
        selectedTrack={selectedTrack}
        showMusicPanel={showMusicPanel}
        mode={mode}
        timerRef={timerRef}
        onClose={onClose}
        onToggleFlash={() => setFlash(v => !v)}
        onToggleMusicPanel={() => setShowMusicPanel(v => !v)}
        onModeChange={setMode}
        onStopRecording={stopRecording}
      />

      {/* Spacer */}
      <div className="relative z-20 flex-1" />

      <CameraMusicPanel
        showMusicPanel={showMusicPanel}
        selectedTrack={selectedTrack}
        playingId={playingId}
        uploadedAudio={uploadedAudio}
        fileInputRef={fileInputRef}
        onClose={() => setShowMusicPanel(false)}
        onSelectTrack={setSelectedTrack}
        onSetPlayingId={setPlayingId}
        onRemoveTrack={() => { setSelectedTrack(null); removeUploadedAudio(); }}
      />

      {mode === "Прямой эфир" ? (
        <div className="relative z-20 flex flex-col items-center gap-4 px-8 pb-14 pt-4">
          <p className="text-white/50 text-sm text-center">Зрители увидят твой экран в реальном времени</p>
          <button
            onClick={handleGoLive}
            className="w-full py-4 rounded-2xl bg-[#fe2c55] text-white font-bold text-lg flex items-center justify-center gap-3 active:scale-95 transition-transform"
          >
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            Начать эфир
          </button>
        </div>
      ) : (
        <CameraBottomControls
          filter={filter}
          recording={recording}
          flipping={flipping}
          uploadedMedia={uploadedMedia}
          mediaInputRef={mediaInputRef}
          mode={mode}
          onMediaFile={applyMediaFile}
          onFilterChange={setFilter}
          onShutter={handleShutter}
          onFlipCamera={flipCamera}
        />
      )}
    </div>
  );
};

export default CameraScreen;