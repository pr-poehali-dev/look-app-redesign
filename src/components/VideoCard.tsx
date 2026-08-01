import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { useSavedItem } from "@/hooks/useSaved";
import { useFollowing } from "@/hooks/useFollowing";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import ReportButton from "@/components/ReportButton";
import { toast } from "sonner";

export interface VideoData {
  id: number;
  dbId?: number; // оригинальный ID в БД (до смещения +10000)
  image: string;
  thumbnail?: string;
  author: string;
  handle: string;
  description: string;
  song: string;
  likes: string;
  comments: string;
  shares: string;
  avatar: string;
  isVideo?: boolean;
}

interface VideoCardProps {
  video: VideoData;
  isActive: boolean;
  /** Уровень предзагрузки видео: full — играем, meta — только метадата, none — не грузим */
  preloadLevel?: "full" | "meta" | "none";
}

const VideoCard = ({ video, isActive, preloadLevel = isActive ? "full" : "meta" }: VideoCardProps) => {
  const { saved, toggle: toggleSaved } = useSavedItem("video", video.id, {
    image: video.image,
    title: video.description,
    handle: video.handle,
  });
  const { following, toggle: toggleFollow, isSelf } = useFollowing(video.handle);
  const { repostMedia } = useUserMedia();
  const { user } = useAuth();
  const [reposting, setReposting] = useState(false);
  const [reposted, setReposted] = useState(false);

  const handleRepost = async () => {
    if (reposting) return;
    if (!user) { alert("Войди в аккаунт, чтобы делать репосты"); return; }
    const targetId = video.dbId ?? video.id;
    setReposting(true);
    const ok = await repostMedia(targetId);
    setReposting(false);
    setReposted(ok);
    setTimeout(() => { setReposted(false); setShowShare(false); }, 1200);
  };
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(1);
  const [showVolume, setShowVolume] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [likedComments, setLikedComments] = useState<(string | number)[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const toggleCommentLike = (id: string | number) => {
    setLikedComments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSeek = (value: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = (value / 100) * duration;
    setCurrentTime(v.currentTime);
  };

  // Thumbnail генерируется глобально через ThumbnailWorker (src/components/ThumbnailWorker.tsx)

  const handleDownload = async () => {
    if (downloading) return;
    const url = video.image;
    if (!url) return;
    setDownloading(true);
    const ext = ((url.split("?")[0].split(".").pop()) || (video.isVideo ? "mp4" : "jpg")).slice(0, 5);
    const safeName = (video.author || video.handle || "look").replace(/[^a-z0-9_-]/gi, "_");
    const fileName = `${safeName}-${video.id}.${ext}`;

    const triggerSave = (blob: Blob) => {
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 1500);
      toast.success("Файл сохранён в «Загрузки»", {
        description: "Открой загрузки телефона, чтобы посмотреть. Вернуться в Лоок — кнопкой «Назад».",
      });
    };

    // Шаг 1: качаем напрямую как файл (blob) — НЕ уводит со страницы, работает для любого размера
    try {
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        triggerSave(blob);
        setDownloading(false);
        return;
      }
    } catch { /* идём в прокси */ }

    // Шаг 2: через бэкенд-прокси (обходит CORS)
    const proxyUrl = `https://functions.poehali.dev/b5faf1bc-6976-47c6-984e-e21c66d4c879?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;
    try {
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const blob = await res.blob();
        triggerSave(blob);
        setDownloading(false);
        return;
      }
    } catch { /* идём в финальный вариант */ }

    // Шаг 3: blob не получился (большой файл) — открываем прокси прямой ссылкой,
    // он отдаёт Content-Disposition: attachment, браузер сохранит файл сам.
    try {
      const a = document.createElement("a");
      a.href = proxyUrl;
      a.download = fileName;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 1500);
      toast.success("Скачивание началось", {
        description: "Файл сохранится в «Загрузки». Если не началось — проверь блокировку всплывающих окон.",
      });
    } catch {
      setPlayerUrl(url);
    }
    setDownloading(false);
  };

  const parseShortNum = (raw: string | number) => {
    const s = String(raw || "0").trim().toUpperCase();
    if (s.endsWith("K")) return Math.round(parseFloat(s) * 1000) || 0;
    if (s.endsWith("M")) return Math.round(parseFloat(s) * 1_000_000) || 0;
    return parseInt(s, 10) || 0;
  };
  const initialCommentCount = parseShortNum(video.comments);
  const initialLikeCount = parseShortNum(video.likes);
  const { comments: allComments, count: commentCount, send } = useComments("video", video.id, showComments, initialCommentCount);
  const { liked, count: likeCount, toggle: toggleLike } = useLikes("video", video.id, initialLikeCount);
  const formatCount = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);

  // Системный жест/кнопка «Назад» закрывает наш плеер вместо ухода с сайта
  useEffect(() => {
    if (!playerUrl) return;
    window.history.pushState({ lookPlayer: true }, "");
    const onPop = () => setPlayerUrl(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [playerUrl]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && !paused) {
      // Android WebView иногда требует повторной попытки после небольшой задержки
      const tryPlay = () => {
        const p = v.play();
        if (p !== undefined) {
          p.catch(() => {
            setTimeout(() => v.play().catch(() => {}), 300);
          });
        }
      };
      if (v.readyState >= 2) {
        tryPlay();
      } else {
        v.addEventListener("canplay", tryPlay, { once: true });
      }
    } else {
      v.pause();
    }
  }, [isActive, paused]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const updateBuffered = () => {
      try {
        if (v.buffered.length && v.duration) {
          setBuffered(v.buffered.end(v.buffered.length - 1) / v.duration * 100);
        }
      } catch { /* ignore */ }
    };
    let fixedInfinity = false;
    const onTime = () => { if (!seeking) setCurrentTime(v.currentTime); updateBuffered(); };
    const onMeta = () => {
      const d = v.duration;
      if (d === Infinity && !fixedInfinity) {
        fixedInfinity = true;
        const onSeeked = () => {
          v.currentTime = 0;
          setDuration(isFinite(v.duration) ? v.duration : 0);
          v.removeEventListener("seeked", onSeeked);
        };
        v.addEventListener("seeked", onSeeked);
        try { v.currentTime = 1e7; } catch { /* ignore */ }
        return;
      }
      setDuration(isFinite(d) ? d : 0);
      updateBuffered();
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("progress", updateBuffered);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("durationchange", onMeta);
    if (isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("progress", updateBuffered);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("durationchange", onMeta);
    };
  }, [seeking, video.image, preloadLevel]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted || volume === 0;
  }, [volume, muted]);

  const handleVideoClick = () => {
    if (showComments) return;
    if (!videoRef.current) return;
    const next = !paused;
    setPaused(next);
    setShowPauseIcon(true);
    setTimeout(() => setShowPauseIcon(false), 800);
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    send(commentText);
    setCommentText("");
  };

  const isVideo = video.isVideo ?? (video.image.includes('.mp4') || video.image.includes('.mov') || video.image.includes('.webm'));

  return (
    <div className="media-overlay-text look-card-root relative w-full h-full flex-shrink-0 snap-start overflow-hidden bg-black md:bg-transparent md:overflow-visible md:flex md:items-stretch md:justify-center">
      {/* Video + info column */}
      <div className="video-media-frame relative w-full h-full md:flex-none md:self-center md:w-auto md:aspect-[9/16] md:overflow-hidden md:rounded-2xl">
      {isVideo ? (
        <>
          {preloadLevel === "none" ? (
            <div
              className="absolute inset-0 w-full h-full bg-black flex items-center justify-center md:rounded-2xl md:overflow-hidden"
              style={video.thumbnail ? { backgroundImage: `url(${video.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              onClick={handleVideoClick}
            >
              <div className="bg-black/40 rounded-full p-4">
                <Icon name="Play" size={44} className="text-white ml-1" />
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.image}
              poster={video.thumbnail || undefined}
              className="absolute inset-0 w-full h-full object-cover md:rounded-2xl"
              loop
              muted={muted}
              autoPlay={isActive}
              playsInline
              preload={preloadLevel === "full" ? "auto" : "metadata"}
              onClick={handleVideoClick}
              x-webkit-airplay="allow"
              style={{ touchAction: "manipulation" }}
            />
          )}

          {showPauseIcon && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-black/40 rounded-full p-5 backdrop-blur-sm">
                <Icon name={paused ? "Play" : "Pause"} size={40} className="text-white" />
              </div>
            </div>
          )}
          <div
            className="absolute top-4 left-4 z-30 flex items-center gap-2"
            onMouseEnter={() => setShowVolume(true)}
            onMouseLeave={() => setShowVolume(false)}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="bg-black/40 rounded-full p-2 backdrop-blur-sm hover:bg-black/60 transition-colors cursor-pointer"
              onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
              title={muted ? "Включить звук" : "Выключить звук"}
            >
              <Icon name={muted || volume === 0 ? "VolumeX" : "Volume2"} size={20} className="text-white" />
            </button>
            {showVolume && (
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={e => {
                  const val = Number(e.target.value);
                  setVolume(val);
                  setMuted(val === 0);
                }}
                className="volume-slider w-24 h-1 cursor-pointer accent-[#fe2c55]"
                title="Громкость"
              />
            )}
          </div>

          {/* Полоса времени */}
          <div
            className="absolute left-0 right-0 z-30 px-3 flex items-center gap-2 bottom-[70px] md:bottom-3"
            onClick={e => e.stopPropagation()}
          >
            <span className="text-white/80 text-[11px] tabular-nums w-9 text-right">{fmtTime(currentTime)}</span>
            <div className="relative flex-1 flex items-center h-4">
              {/* фон дорожки */}
              <div className="absolute left-0 right-0 h-1 rounded-full bg-white/25" />
              {/* буферизация (сколько загрузилось) */}
              <div className="absolute left-0 h-1 rounded-full bg-white/50" style={{ width: `${Math.min(100, buffered)}%` }} />
              {/* воспроизведено */}
              <div className="absolute left-0 h-1 rounded-full bg-[#fe2c55]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={duration ? (currentTime / duration) * 100 : 0}
                onPointerDown={() => setSeeking(true)}
                onPointerUp={() => setSeeking(false)}
                onChange={e => handleSeek(Number(e.target.value))}
                className="video-progress relative w-full h-4 cursor-pointer bg-transparent"
              />
            </div>
            <span className="text-white/80 text-[11px] tabular-nums w-9">{fmtTime(duration)}</span>
          </div>
        </>
      ) : (
        <img
          src={video.image}
          alt={video.description}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none md:rounded-2xl"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none md:rounded-2xl" />
      <div className="hidden md:block absolute inset-0 pointer-events-none rounded-2xl z-[5]" style={{ boxShadow: "inset 0 0 0 8px var(--look-bg)" }} />

      {/* Bottom left info — внутри видео */}
      <div className="absolute bottom-28 md:bottom-20 left-4 z-10" style={{ right: '80px' }}>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: video.handle } }))}
            className="font-bold text-white text-base active:opacity-70"
          >
            @{video.handle}
          </button>
          {isSelf ? null : !following ? (
            <button
              onClick={toggleFollow}
              className="px-3 py-0.5 rounded-full border border-white text-white text-xs font-semibold hover:bg-white hover:text-black transition-all"
            >
              Подписаться
            </button>
          ) : (
            <button
              onClick={toggleFollow}
              className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold"
            >
              Вы подписаны
            </button>
          )}
        </div>
        {video.description && (() => {
          const parts = video.description.split(/(#\S+)/g);
          const isLong = video.description.length > 80;
          return (
            <div className="mb-3">
              <p className={`text-white text-sm leading-snug ${expanded ? "" : "line-clamp-2"}`}>
                {parts.map((part, i) =>
                  part.startsWith('#')
                    ? <span key={i} className="text-[#61d4f0] font-medium">{part}</span>
                    : part
                )}
              </p>
              {isLong && (
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
                  className="text-white/60 text-sm font-semibold mt-0.5 active:opacity-70"
                >
                  {expanded ? "свернуть" : "ещё"}
                </button>
              )}
            </div>
          );
        })()}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
            <Icon name="Music" size={10} className="text-white" />
          </div>
          <span className="text-white/80 text-xs truncate max-w-[180px]">{video.song}</span>
        </div>
      </div>
      </div>

      {/* Right side actions — мобайл (внутри видео) */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-30 md:hidden">
        {/* Avatar */}
        <button
          className="relative mb-2"
          onTouchEnd={(e) => { if (isSelf) return; e.stopPropagation(); e.preventDefault(); toggleFollow(); }}
          onClick={() => { if (!isSelf) toggleFollow(); }}
          style={{ touchAction: "manipulation" }}
        >
          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${following ? "border-[#fe2c55]" : "border-white"}`}>
            <UserAvatar src={video.avatar} name={video.author || video.handle} alt={video.author} />
          </div>
          {!isSelf && !following && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center">
              <Icon name="Plus" size={12} className="text-white" />
            </div>
          )}
          {!isSelf && following && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Icon name="Check" size={12} className="text-white" />
            </div>
          )}
        </button>

        {/* Like */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleLike(); }}
          onClick={() => toggleLike()}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Нравится"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Heart" size={28} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-[#22d3ee]"} />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowComments(true); }}
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Комментарии"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="MessageCircle" size={26} className="text-[#22d3ee]" />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Send / Share */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowShare(true); }}
          onClick={() => setShowShare(true)}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Поделиться"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Send" size={26} className="text-[#22d3ee]" />
          </div>
          <span className="text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Bookmark */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleSaved(); }}
          onClick={toggleSaved}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Сохранить в закладки"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Bookmark" size={26} className={saved ? "text-[#ffd700] fill-[#ffd700]" : "text-[#22d3ee]"} />
          </div>
          <span className="text-white text-xs font-semibold">Сохранить</span>
        </button>

        {/* Ещё */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowMore(true); }}
          onClick={() => setShowMore(true)}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Ещё действия"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Ellipsis" size={26} className="text-[#22d3ee]" />
          </div>
          <span className="text-white text-xs font-semibold">Ещё</span>
        </button>
      </div>

      {/* Desktop right actions — вне видео, все 7 кнопок */}
      <div className="hidden md:flex flex-col items-center gap-3 z-30 flex-shrink-0 justify-end pb-6 pl-2 pt-6" style={{ background: "var(--look-bg)" }}>
        {/* Avatar */}
        <button
          onClick={() => { if (!isSelf) toggleFollow(); }}
          className="relative mb-2"
        >
          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${following ? "border-[#fe2c55]" : "border-white"}`}>
            <UserAvatar src={video.avatar} name={video.author || video.handle} alt={video.author} />
          </div>
          {isSelf ? null : !following ? (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center">
              <Icon name="Plus" size={12} className="text-white" />
            </div>
          ) : (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <Icon name="Check" size={12} className="text-white" />
            </div>
          )}
        </button>

        {/* Like */}
        <button onClick={() => toggleLike()} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <Icon name="Heart" size={26} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <Icon name="MessageCircle" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Share */}
        <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <Icon name="Send" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Bookmark */}
        <button onClick={toggleSaved} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <Icon name="Bookmark" size={24} className={saved ? "text-[#ffd700] fill-[#ffd700]" : "text-white"} />
          </div>
          <span className="text-white text-xs font-semibold">Сохранить</span>
        </button>

        {/* Ещё */}
        <button onClick={() => setShowMore(true)} className="flex flex-col items-center gap-1" title="Ещё действия">
          <div className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <Icon name="Ellipsis" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">Ещё</span>
        </button>
      </div>

      {showMore && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40"
          onClick={() => setShowMore(false)}
        >
          <div
            className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[320px] md:shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-white font-bold text-base">Ещё</span>
              <button onClick={() => setShowMore(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>

            {/* Скачать */}
            <button
              onClick={() => { handleDownload(); }}
              disabled={downloading}
              className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3 disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                {downloading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : downloadDone ? (
                  <Icon name="Check" size={20} className="text-green-400" />
                ) : (
                  <Icon name="Download" size={20} className="text-white" />
                )}
              </div>
              <span className="text-white text-sm font-medium">
                {downloading ? "Скачивание…" : downloadDone ? "Готово!" : "Скачать"}
              </span>
            </button>

            {/* Жалоба */}
            <button
              onClick={() => { setShowMore(false); setShowReport(true); }}
              className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon name="Flag" size={20} className="text-[#fe2c55]" />
              </div>
              <span className="text-white text-sm font-medium">Пожаловаться</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      <ReportButton
        targetType="video"
        targetId={video.id}
        variant="controlled"
        open={showReport}
        onOpenChange={setShowReport}
      />

      {playerUrl && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
          {/* Верхняя панель с кнопкой Назад */}
          <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-gradient-to-b from-black/80 to-transparent">
            <button
              onClick={() => setPlayerUrl(null)}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Назад"
            >
              <Icon name="ChevronLeft" size={24} className="text-white" />
            </button>
            <span className="text-white font-semibold text-sm">Назад в Лоок</span>
          </div>
          {/* Сам плеер */}
          <div className="flex-1 flex items-center justify-center px-2">
            <video
              src={playerUrl}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full rounded-lg"
            />
          </div>
        </div>,
        document.body
      )}

      {showShare && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40"
          onClick={() => setShowShare(false)}
        >
          <div
            className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[360px] md:shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <span className="text-white font-bold text-base">Поделиться</span>
              <button onClick={() => setShowShare(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>

            {/* Share options */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: "MessageCircle", label: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`@${video.handle}: ${video.description}`)}` },
                { icon: "Send", label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(`@${video.handle}: ${video.description}\n${window.location.href}`)}` },
                { icon: "Share2", label: "VK", color: "#0077FF", href: `https://vk.com/share.php?url=${encodeURIComponent(window.location.href)}` },
                { icon: "MessageSquare", label: "МАКС", color: "#7C66FC", href: `https://max.ru/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`@${video.handle}: ${video.description}`)}` },
              ].map(opt => (
                <a
                  key={opt.label}
                  href={opt.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2"
                  onClick={() => setShowShare(false)}
                >
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: opt.color + "22", border: `1.5px solid ${opt.color}55` }}>
                    <Icon name={opt.icon} size={24} style={{ color: opt.color }} />
                  </div>
                  <span className="text-white/70 text-xs">{opt.label}</span>
                </a>
              ))}
            </div>

            {/* Repost */}
            <button
              onClick={handleRepost}
              disabled={reposting}
              className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3 disabled:opacity-60"
            >
              <div className="w-10 h-10 rounded-xl bg-[#fe2c55]/20 flex items-center justify-center flex-shrink-0">
                <Icon name={reposted ? "Check" : "Repeat2"} size={20} className={reposted ? "text-green-400" : "text-[#fe2c55]"} />
              </div>
              <div className="text-left">
                <p className="text-white text-sm font-medium">{reposted ? "Готово!" : reposting ? "Репостим…" : "Репост к себе"}</p>
                <p className="text-white/40 text-xs">Видео появится в твоём профиле</p>
              </div>
            </button>

            {/* Copy link */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
                setCopied(true);
                setTimeout(() => { setCopied(false); setShowShare(false); }, 1500);
              }}
              className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon name={copied ? "Check" : "Link"} size={20} className={copied ? "text-green-400" : "text-white"} />
              </div>
              <span className="text-white text-sm font-medium">{copied ? "Скопировано!" : "Скопировать ссылку"}</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {showComments && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:bg-black/40"
          onPointerDown={() => setShowComments(false)}
        >
          <div
            className="sheet-theme rounded-t-3xl flex flex-col max-h-[70%] md:rounded-t-none md:rounded-l-3xl md:max-h-none md:h-full md:w-[400px] md:ml-auto md:shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
            onPointerDown={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
              <span className="text-white font-bold text-base">{commentCount} комментариев</span>
              <button onPointerDown={() => setShowComments(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
              {allComments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 flex-shrink-0">
                    <UserAvatar name={c.name} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-semibold text-sm">{c.name}</span>
                      <span className="text-white/30 text-xs">{c.time}</span>
                    </div>
                    <p className="text-white/80 text-sm">{c.text}</p>
                  </div>
                  <div className="flex-shrink-0 mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleCommentLike(c.id); }}
                      className="p-1"
                    >
                      <Icon name="Heart" size={14} className={likedComments.includes(c.id) ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white/40"} />
                    </button>
                    <ReportButton
                      targetType="comment"
                      targetId={c.id}
                      className="p-1 text-white/40 hover:text-[#fe2c55]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10 pb-8 md:pb-3">
              <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
                  onKeyDown={e => e.key === "Enter" && handleSendComment()}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <button
                onClick={handleSendComment}
                disabled={!commentText.trim()}
                className="w-9 h-9 rounded-full bg-[#fe2c55] flex items-center justify-center disabled:opacity-40"
              >
                <Icon name="Send" size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default VideoCard;