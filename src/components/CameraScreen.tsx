import { useState, useRef, useEffect } from "react";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import CameraPreview from "@/components/camera/CameraPreview";
import CameraTopBar from "@/components/camera/CameraTopBar";
import CameraMusicPanel from "@/components/camera/CameraMusicPanel";
import CameraBottomControls from "@/components/camera/CameraBottomControls";

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
  const { addMedia } = useUserMedia();
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
  const [selectedCategory, setSelectedCategory] = useState("humor");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [destination, setDestination] = useState<"home" | "feed">("home");
  const [hashtags, setHashtags] = useState("");
  const [description, setDescription] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    mediaFileRef.current = file;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    setUploadedMedia({ url, type });
    setPublished(false);
    addMedia(file);
  };

  const handlePublish = async () => {
    const file = mediaFileRef.current;
    if (!file) return;
    setPublishing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const ext = file.name.split(".").pop() || "mp4";
        const res = await fetch("https://functions.poehali.dev/78967386-1bfb-4070-9bb3-549cc5c00de6", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file: base64, type: file.type, ext, category: destination === "home" ? selectedCategory : "feed", description, hashtags, author: user?.name || "Пользователь", handle: user?.handle || user?.name || "user", user_id: user?.id || "anonymous" }),
        });
        const data = await res.json();
        if (data.url) {
          setPublished(true);
          setTimeout(() => {
            setUploadedMedia(null);
            setPublished(false);
            onClose();
          }, 1500);
        }
        setPublishing(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setPublishing(false);
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
        onStopRecording={() => { setRecording(false); setRecordSeconds(0); }}
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

      <CameraBottomControls
        filter={filter}
        recording={recording}
        flipping={flipping}
        uploadedMedia={uploadedMedia}
        mediaInputRef={mediaInputRef}
        onFilterChange={setFilter}
        onShutter={handleShutter}
        onFlipCamera={flipCamera}
      />
    </div>
  );
};

export default CameraScreen;