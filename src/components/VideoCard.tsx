import { useState, useRef, useEffect, useCallback } from "react";
import { promptAuth } from "@/lib/promptAuth";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import LinkifiedText from "@/components/ui/linkified-text";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { useSavedItem } from "@/hooks/useSaved";
import { useFollowing } from "@/hooks/useFollowing";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import ReportButton from "@/components/ReportButton";
import { toast } from "sonner";
import { trackVideoView } from "@/hooks/useFeedSignals";
import { useProductsByVideos, trackProductClick } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import AddToBoardSheet from "@/components/products/AddToBoardSheet";
import VideoMoreSheet from "./video-card/VideoMoreSheet";
import VideoShareSheet from "./video-card/VideoShareSheet";
import VideoProductsSheet from "./video-card/VideoProductsSheet";
import VideoCommentsSheet from "./video-card/VideoCommentsSheet";

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
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  // Товары грузим ТОЛЬКО если у видео реально есть привязанные товары (экономим трафик)
  const dbVideoId = video.dbId ?? video.id;
  const productVideoIds = video.hasProducts ? [dbVideoId] : [];
  const productsByVideo = useProductsByVideos(productVideoIds);
  const products = productsByVideo[String(dbVideoId)] || [];
  const { addToCart } = useCart();

  const handleUseTemplate = () => {
    // Сохраняем в sessionStorage — CameraScreen/MediaEditor монтируются позже клика,
    // поэтому одноразовое CustomEvent они могут не успеть поймать
    try { sessionStorage.setItem("pending_template_id", video.templateId || ""); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("use-template", { detail: { templateId: video.templateId } }));
    toast.success("Шаблон открыт в конструкторе");
  };

  const handleAddToCart = async (productId: number) => {
    setAddingProductId(productId);
    trackProductClick(productId, dbVideoId, user?.id);
    const ok = await addToCart(productId);
    setAddingProductId(null);
    if (ok) toast.success("Добавлено в корзину");
    else toast.error("Войди в аккаунт, чтобы добавить в корзину");
  };

  const handleBuyNow = async (productId: number) => {
    setAddingProductId(productId);
    trackProductClick(productId, dbVideoId, user?.id);
    const ok = await addToCart(productId);
    setAddingProductId(null);
    if (ok) {
      setShowProducts(false);
      window.dispatchEvent(new CustomEvent("open-cart"));
    } else {
      toast.error("Войди в аккаунт, чтобы купить");
    }
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
      {isVideo ? (
        <>
          <video
            key="main-video"
            ref={videoRef}
            src={preloadLevel === "none" ? undefined : (video.image.includes("#") ? video.image : `${video.image}#t=0.001`)}
            poster={video.thumbnail || undefined}
            className="absolute inset-0 w-full h-full object-cover md:rounded-2xl"
            loop
            muted={muted}
            autoPlay={isActive}
            playsInline
            preload={preloadLevel === "none" ? "none" : preloadLevel === "full" ? "auto" : "metadata"}
            onClick={handleVideoClick}
            x-webkit-airplay="allow"
            style={{
              touchAction: "manipulation",
              backgroundColor: "#000",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
              ...(video.thumbnail ? { backgroundImage: `url(${video.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
            }}
          />
          <div
            key="play-hint"
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ display: preloadLevel === "none" ? "flex" : "none" }}
          >
            <div className="bg-black/40 rounded-full p-4">
              <Icon name="Play" size={44} className="text-white ml-1" />
            </div>
          </div>

          {showPauseIcon && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-black/40 rounded-full p-5 backdrop-blur-sm">
                <Icon name={paused ? "Play" : "Pause"} size={40} className="text-white" />
              </div>
            </div>
          )}
          {video.hasProducts && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowProducts(true); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowProducts(true); }}
              className="absolute top-4 right-4 z-30 -translate-y-3 md:translate-y-0 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full pl-2 pr-3 py-1.5 active:scale-95 transition-transform"
              style={{ touchAction: "manipulation" }}
              title="Товары в кадре"
            >
              <Icon name="ShoppingBag" size={14} className="text-white" />
              <span className="text-white text-[11px] font-semibold">Товары в кадре</span>
            </button>
          )}
          <div
            className="absolute top-4 left-4 z-30 flex items-center gap-2 -translate-y-3 md:translate-y-0"
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
        <img loading="lazy" decoding="async"
          src={video.image}
          alt={video.description}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none md:rounded-2xl"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Bottom left info — внутри видео */}
      <div className={`absolute bottom-28 md:bottom-20 left-4 z-10 transition-opacity duration-200 hover:opacity-100 active:opacity-100 ${expanded ? "opacity-100" : "opacity-60"}`} style={{ right: '80px' }}>
        {video.repostedBy && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: video.repostedBy } }))}
            className="flex items-center gap-1.5 mb-1.5 text-left"
          >
            <Icon name="Repeat2" fallback="Repeat" size={13} className="text-white/60" />
            <span className="text-white/60 text-xs">
              Репост от <span className="text-white/90 font-medium">@{video.repostedBy}</span>
            </span>
          </button>
        )}
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: video.handle } }))}
            className="flex items-center gap-1 font-bold text-white text-base active:opacity-70"
          >
            @{video.handle}
            {video.isVerified && <Icon name="BadgeCheck" size={14} className="text-[#61d4f0]" />}
          </button>
          {video.isAd && (
            <span className="px-1.5 py-0.5 rounded bg-white/15 text-white/70 text-[10px] font-semibold uppercase tracking-wide">
              {video.adLabel || "Реклама"}
            </span>
          )}
          {video.ageRating && (
            <span className="px-1.5 py-0.5 rounded border border-white/30 text-white/70 text-[10px] font-semibold">
              {video.ageRating}
            </span>
          )}
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
                    : <LinkifiedText key={i} text={part} />
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
        {video.place && (
          <p className="flex items-center gap-1 text-white/70 text-xs mb-2">
            <Icon name="MapPin" size={12} />
            <span className="truncate">{video.place}</span>
          </p>
        )}
        {video.isAd && video.adErid && (
          <p className="text-white/50 text-[11px] mb-2 break-all">
            Реклама{video.adAdvertiser ? ` · ${video.adAdvertiser}` : ""} · erid: {video.adErid}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
            <Icon name="Music" size={10} className="text-white" />
          </div>
          <span className="text-white/80 text-xs truncate max-w-[180px]">{video.song}</span>
          {typeof video.views === "number" && video.views > 0 && (
            <span className="text-white/50 text-xs">· {formatCount(video.views)} просмотров</span>
          )}
          {video.templateId && (
            <button
              onClick={(e) => { e.stopPropagation(); handleUseTemplate(); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleUseTemplate(); }}
              className="flex items-center gap-1 bg-white/15 backdrop-blur-sm rounded-full px-2.5 py-1 active:scale-95 transition-transform"
              style={{ touchAction: "manipulation" }}
            >
              <Icon name="Wand2" size={11} className="text-white" />
              <span className="text-white text-[11px] font-semibold">Использовать шаблон</span>
            </button>
          )}
        </div>
      </div>
      </div>

      {/* Right side actions — мобайл (внутри видео) */}
      <div className="absolute right-2.5 bottom-32 flex flex-col items-center gap-5 z-30 md:hidden">
        {/* Like */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleLike(); }}
          onClick={() => toggleLike()}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Нравится"
        >
          <div className="action-icon-mobile-bg w-10 h-10 rounded-full flex items-center justify-center">
            <Icon
              name="Heart"
              size={26}
              className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "action-icon-glyph"}
            />
          </div>
          <span className="action-count-text action-count-mobile-bg px-1.5 py-0.5 rounded-full text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowComments(true); }}
          onClick={() => { setShowComments(true); }}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Комментарии"
        >
          <div className="action-icon-mobile-bg w-10 h-10 rounded-full flex items-center justify-center">
            <Icon name="MessageDots" size={26} className="action-icon-glyph" />
          </div>
          <span className="action-count-text action-count-mobile-bg px-1.5 py-0.5 rounded-full text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Send / Share */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); if (guest) return needAuth(); setShowShare(true); }}
          onClick={() => { if (guest) return needAuth(); setShowShare(true); }}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
          title="Поделиться"
        >
          <div className="action-icon-mobile-bg w-10 h-10 rounded-full flex items-center justify-center">
            <Icon name="ShareForward" size={26} className="action-icon-glyph" />
          </div>
          <span className="action-count-text action-count-mobile-bg px-1.5 py-0.5 rounded-full text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Ещё (в т.ч. сохранение в коллекцию) */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); if (guest) return needAuth(); setShowMore(true); }}
          onClick={() => { if (guest) return needAuth(); setShowMore(true); }}
          className="flex flex-col items-center justify-center"
          style={{ touchAction: "manipulation" }}
          title="Ещё действия"
        >
          <div className="action-icon-mobile-bg w-10 h-10 rounded-full flex items-center justify-center">
            <span className="action-count-text text-white text-xs font-bold leading-none">Ещё</span>
          </div>
        </button>
      </div>

      {/* Desktop right actions — вне видео, все 7 кнопок */}
      <div className="desktop-actions-col hidden md:flex flex-col items-center gap-3 z-30 flex-shrink-0 justify-end pb-6 pl-2 pt-6" style={{ background: "var(--look-bg)" }}>
        {/* Like */}
        <button onClick={() => toggleLike()} className="flex flex-col items-center gap-1">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon
              name="Heart"
              size={24}
              className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "action-icon-glyph"}
            />
          </div>
          <span className="action-count-text text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={() => { setShowComments(true); }} className="flex flex-col items-center gap-1">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon name="MessageDots" size={24} className="action-icon-glyph" />
          </div>
          <span className="action-count-text text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Share */}
        <button onClick={() => { if (guest) return needAuth(); setShowShare(true); }} className="flex flex-col items-center gap-1">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon name="ShareForward" size={22} className="action-icon-glyph" />
          </div>
          <span className="action-count-text text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Bookmark */}
        <button onClick={toggleSaved} className="flex flex-col items-center gap-1" title="Сохранить в коллекцию">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon
              name="Bookmark"
              size={22}
              className={saved ? "text-[#fe2c55] fill-[#fe2c55]" : "action-icon-glyph"}
            />
          </div>
          {!!video.saves && (
            <span className="action-count-text text-white text-xs font-semibold">{formatCount(video.saves)}</span>
          )}
        </button>

        {/* Ещё */}
        <button onClick={() => { if (guest) return needAuth(); setShowMore(true); }} className="flex flex-col items-center gap-1" title="Ещё действия">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <span className="action-count-text text-white text-xs font-semibold">Ещё</span>
          </div>
        </button>
      </div>

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
          addingProductId={addingProductId}
          setShowProducts={setShowProducts}
          handleBuyNow={handleBuyNow}
          handleAddToCart={handleAddToCart}
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