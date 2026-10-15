import { useState, useRef, useEffect, useCallback } from "react";
import { promptAuth } from "@/lib/promptAuth";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { useSavedItem } from "@/hooks/useSaved";
import { useFollowing } from "@/hooks/useFollowing";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import ReportButton from "@/components/ReportButton";
import { toast } from "sonner";
import { trackVideoView } from "@/hooks/useFeedSignals";
import { useProductsByVideos, openProductLink, type Product } from "@/hooks/useProducts";
import AddToBoardSheet from "@/components/products/AddToBoardSheet";
import VideoMoreSheet from "./video-card/VideoMoreSheet";
import VideoShareSheet from "./video-card/VideoShareSheet";
import VideoProductsSheet from "./video-card/VideoProductsSheet";
import VideoCommentsSheet from "./video-card/VideoCommentsSheet";
import VideoMediaLayer from "./video-card/VideoMediaLayer";
import VideoInfoOverlay from "./video-card/VideoInfoOverlay";
import VideoActionButtons from "./video-card/VideoActionButtons";
import VideoFullscreenPlayer from "./video-card/VideoFullscreenPlayer";

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
  saves?: number;
  avatar: string;
  isVideo?: boolean;
  templateId?: string | null;
  hasProducts?: boolean;
  views?: number;
  isVerified?: boolean;
  isAd?: boolean;
  adLabel?: string | null;
  ageRating?: string | null;
  adErid?: string | null;
  adAdvertiser?: string | null;
  place?: string | null;
  repostedBy?: string | null;
}

interface VideoCardProps {
  video: VideoData;
  isActive: boolean;
  /** Уровень предзагрузки видео: full — играем, meta — только метадата, none — не грузим */
  preloadLevel?: "full" | "meta" | "none";
}

const VideoCard = ({ video, isActive, preloadLevel = isActive ? "full" : "meta" }: VideoCardProps) => {
  const { saved, toggle: rawToggleSaved } = useSavedItem("video", video.id, {
    image: video.image,
    title: video.description,
    handle: video.handle,
  });
  const { following, toggle: rawToggleFollow, isSelf } = useFollowing(video.handle);
  const { repostMedia, isReposted } = useUserMedia();
  const { user } = useAuth();
  const [reposting, setReposting] = useState(false);
  const [repostResult, setRepostResult] = useState<"added" | "removed" | null>(null);
  const alreadyReposted = isReposted(video.dbId ?? video.id);

  const handleRepost = async () => {
    if (reposting) return;
    if (!user) { promptAuth(); return; }
    const targetId = video.dbId ?? video.id;
    setReposting(true);
    const nowReposted = await repostMedia(targetId);
    setReposting(false);
    setRepostResult(nowReposted ? "added" : "removed");
    setTimeout(() => { setRepostResult(null); setShowShare(false); }, 1200);
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
  const [showAddToBoard, setShowAddToBoard] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  // Товары грузим ТОЛЬКО если у видео реально есть привязанные товары (экономим трафик)
  const dbVideoId = video.dbId ?? video.id;
  const productVideoIds = video.hasProducts ? [dbVideoId] : [];
  const productsByVideo = useProductsByVideos(productVideoIds);
  const products = productsByVideo[String(dbVideoId)] || [];

  const handleUseTemplate = () => {
    // Сохраняем в sessionStorage — CameraScreen/MediaEditor монтируются позже клика,
    // поэтому одноразовое CustomEvent они могут не успеть поймать
    try { sessionStorage.setItem("pending_template_id", video.templateId || ""); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("use-template", { detail: { templateId: video.templateId } }));
    toast.success("Шаблон открыт в конструкторе");
  };

  const handleGoToProduct = (p: Product) => {
    openProductLink(p, dbVideoId, user?.id);
  };
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/?video=${video.dbId ?? video.id}`;
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: number | string; name: string } | null>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(0);
  const repeatCountRef = useRef(0);
  const reportedRef = useRef(false);

  // Отслеживаем глубину просмотра (сколько секунд реально посмотрели) и повторы,
  // чтобы отправить сигнал вовлечённости, когда карточка перестаёт быть активной
  const flushWatch = useCallback(() => {
    if (reportedRef.current) return;
    const watched = maxWatchedRef.current;
    if (watched < 0.5) return;
    reportedRef.current = true;
    trackVideoView({
      videoId: video.dbId ?? video.id,
      watchSeconds: watched,
      duration,
      completed: duration > 0 && watched >= duration * 0.85,
      repeatCount: repeatCountRef.current,
    });
  }, [video.dbId, video.id, duration]);

  useEffect(() => {
    if (isActive) {
      maxWatchedRef.current = 0;
      repeatCountRef.current = 0;
      reportedRef.current = false;
    } else {
      flushWatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    return () => { flushWatch(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
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
    if (!user) { promptAuth(); return; }
    const url = video.image;
    if (!url) return;
    setDownloading(true);
    fetch("https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec?action=download", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user?.id ? String(user.id) : "" },
      body: JSON.stringify({ target_type: "video", target_id: String(video.id) }),
    }).catch(() => {});
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
  const { comments: allComments, count: commentCount, send: rawSend, toggleLike: rawToggleCommentLike } = useComments("video", video.id, showComments, initialCommentCount);
  const { liked, count: likeCount, toggle: rawToggleLike } = useLikes("video", video.id, initialLikeCount);
  const guest = !user;
  const needAuth = () => { promptAuth(); };
  const toggleLike = () => { if (guest) return needAuth(); rawToggleLike(); };
  const toggleSaved = () => { if (guest) return needAuth(); rawToggleSaved(); };
  const toggleFollow = () => { if (guest) return needAuth(); rawToggleFollow(); };
  const send: typeof rawSend = (...args) => { if (guest) { needAuth(); return Promise.resolve() as ReturnType<typeof rawSend>; } return rawSend(...args); };
  const toggleCommentLike: typeof rawToggleCommentLike = (...args) => { if (guest) { needAuth(); return Promise.resolve(); } return rawToggleCommentLike(...args); };
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
          const nb = Math.round(v.buffered.end(v.buffered.length - 1) / v.duration * 20) * 5;
          setBuffered(prev => (prev === nb ? prev : nb));
        }
      } catch { /* ignore */ }
    };
    let fixedInfinity = false;
    let lastUiTime = -1;
    const onTime = () => {
      if (!seeking && Math.abs(v.currentTime - lastUiTime) >= 0.5) {
        lastUiTime = v.currentTime;
        setCurrentTime(v.currentTime);
      }
      if (v.currentTime > maxWatchedRef.current) maxWatchedRef.current = v.currentTime;
      updateBuffered();
    };
    const onLoop = () => { repeatCountRef.current += 1; };
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
    v.addEventListener("ended", onLoop);
    if (isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("progress", updateBuffered);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("ended", onLoop);
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
    send(commentText, undefined, replyingTo?.id ?? null);
    setCommentText("");
    setReplyingTo(null);
  };

  const startReply = (id: number | string, name: string) => {
    if (!user) { promptAuth(); return; }
    setReplyingTo({ id, name });
    setCommentText(`@${name} `);
    commentInputRef.current?.focus();
  };

  const isVideo = video.isVideo ?? (video.image.includes('.mp4') || video.image.includes('.mov') || video.image.includes('.webm'));

  return (
    <div className="media-overlay-text look-card-root relative w-full h-full flex-shrink-0 snap-start overflow-hidden bg-black md:bg-transparent md:overflow-visible md:flex md:items-stretch md:justify-center">
      {/* Video + info column */}
      <div className="video-round-frame relative w-full h-full md:flex-none md:h-full md:w-auto md:aspect-[9/16] md:overflow-hidden md:rounded-2xl">
      <VideoMediaLayer
        video={video}
        isVideo={isVideo}
        isActive={isActive}
        preloadLevel={preloadLevel}
        videoRef={videoRef}
        muted={muted}
        setMuted={setMuted}
        volume={volume}
        setVolume={setVolume}
        showVolume={showVolume}
        setShowVolume={setShowVolume}
        paused={paused}
        showPauseIcon={showPauseIcon}
        handleVideoClick={handleVideoClick}
        setShowProducts={setShowProducts}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        fmtTime={fmtTime}
        setSeeking={setSeeking}
        handleSeek={handleSeek}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Bottom left info — внутри видео */}
      <VideoInfoOverlay
        video={video}
        expanded={expanded}
        setExpanded={setExpanded}
        isSelf={isSelf}
        following={following}
        toggleFollow={toggleFollow}
        formatCount={formatCount}
        handleUseTemplate={handleUseTemplate}
      />
      </div>

      <VideoActionButtons
        video={video}
        liked={liked}
        likeCount={likeCount}
        commentCount={commentCount}
        saved={saved}
        guest={guest}
        needAuth={needAuth}
        toggleLike={toggleLike}
        toggleSaved={toggleSaved}
        formatCount={formatCount}
        setShowComments={setShowComments}
        setShowShare={setShowShare}
        setShowMore={setShowMore}
      />

      {showMore && (
        <VideoMoreSheet
          video={video}
          user={user}
          saved={saved}
          isSelf={isSelf}
          toggleSaved={toggleSaved}
          setShowMore={setShowMore}
          setShowAddToBoard={setShowAddToBoard}
          setShowReport={setShowReport}
        />
      )}

      <ReportButton
        targetType="video"
        targetId={video.id}
        variant="controlled"
        open={showReport}
        onOpenChange={setShowReport}
      />

      {playerUrl && (
        <VideoFullscreenPlayer playerUrl={playerUrl} onClose={() => setPlayerUrl(null)} />
      )}

      {showShare && (
        <VideoShareSheet
          video={video}
          shareUrl={shareUrl}
          setShowShare={setShowShare}
          handleRepost={handleRepost}
          reposting={reposting}
          alreadyReposted={alreadyReposted}
          repostResult={repostResult}
          copied={copied}
          setCopied={setCopied}
          handleDownload={handleDownload}
          downloading={downloading}
          downloadDone={downloadDone}
        />
      )}

      {showProducts && (
        <VideoProductsSheet
          products={products}
          setShowProducts={setShowProducts}
          handleGoToProduct={handleGoToProduct}
        />
      )}

      {showComments && (
        <VideoCommentsSheet
          user={user}
          commentCount={commentCount}
          allComments={allComments}
          setShowComments={setShowComments}
          startReply={startReply}
          toggleCommentLike={toggleCommentLike}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          commentText={commentText}
          setCommentText={setCommentText}
          commentInputRef={commentInputRef}
          handleSendComment={handleSendComment}
        />
      )}

      {showAddToBoard && (
        <AddToBoardSheet
          itemType="video"
          itemId={video.dbId ?? video.id}
          image={video.image}
          title={video.description}
          onClose={() => setShowAddToBoard(false)}
        />
      )}
    </div>
  );
};

export default VideoCard;
