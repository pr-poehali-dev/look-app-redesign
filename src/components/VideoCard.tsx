import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useComments } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { useSavedItem } from "@/hooks/useSaved";
import { useFollowing } from "@/hooks/useFollowing";
import ReportButton from "@/components/ReportButton";

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
  const { following, toggle: toggleFollow } = useFollowing(video.handle);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    };

    // Шаг 1: пробуем напрямую (если CDN отдаёт CORS)
    try {
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) {
        const blob = await res.blob();
        triggerSave(blob);
        setDownloading(false);
        return;
      }
    } catch { /* идём в прокси */ }

    // Шаг 2: через бэкенд-прокси (обходит CORS, добавляет Content-Disposition)
    try {
      const proxyUrl = `https://functions.poehali.dev/b5faf1bc-6976-47c6-984e-e21c66d4c879?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(fileName)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) throw new Error("proxy failed");
      const blob = await res.blob();
      triggerSave(blob);
    } catch {
      // Шаг 3: финальный fallback — открыть в новой вкладке
      window.open(url, "_blank", "noopener");
    } finally {
      setDownloading(false);
    }
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
    <div className="media-overlay-text relative w-full h-full flex-shrink-0 snap-start overflow-hidden bg-black md:bg-transparent md:overflow-visible md:flex md:gap-4 md:items-stretch">
      {/* Video + info column */}
      <div className="relative w-full h-full md:flex-1 md:max-w-[470px] md:rounded-xl md:overflow-hidden md:bg-black">
      {isVideo ? (
        <>
          {preloadLevel === "none" ? (
            <div
              className="absolute inset-0 w-full h-full bg-black flex items-center justify-center"
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
              className="absolute inset-0 w-full h-full object-cover"
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
          <button
            className="absolute top-4 left-4 z-30 bg-black/40 rounded-full p-2 backdrop-blur-sm"
            onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          >
            <Icon name={muted ? "VolumeX" : "Volume2"} size={20} className="text-white" />
          </button>
        </>
      ) : (
        <img
          src={video.image}
          alt={video.description}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Bottom left info — внутри видео */}
      <div className="absolute bottom-20 left-4 z-10" style={{ right: '80px' }}>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: video.handle } }))}
            className="font-bold text-white text-base active:opacity-70"
          >
            @{video.handle}
          </button>
          {!following ? (
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
          return (
            <p className="text-white text-sm leading-snug mb-3 line-clamp-2">
              {parts.map((part, i) =>
                part.startsWith('#')
                  ? <span key={i} className="text-[#61d4f0] font-medium">{part}</span>
                  : part
              )}
            </p>
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
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-30 md:hidden">
        {/* Avatar */}
        <button
          className="relative mb-2"
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleFollow(); }}
          onClick={toggleFollow}
          style={{ touchAction: "manipulation" }}
        >
          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${following ? "border-[#fe2c55]" : "border-white"}`}>
            <UserAvatar src={video.avatar} name={video.author || video.handle} alt={video.author} />
          </div>
          {!following && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center">
              <Icon name="Plus" size={12} className="text-white" />
            </div>
          )}
          {following && (
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
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Heart" size={28} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowComments(true); }}
          onClick={() => setShowComments(true)}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="MessageCircle" size={26} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Send / Share */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowShare(true); }}
          onClick={() => setShowShare(true)}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Send" size={26} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Bookmark */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleSaved(); }}
          onClick={toggleSaved}
          className="flex flex-col items-center gap-1"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Bookmark" size={26} className={saved ? "text-[#ffd700] fill-[#ffd700]" : "text-white"} />
          </div>
          <span className="text-white text-xs font-semibold">Сохранить</span>
        </button>

        {/* Download */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleDownload(); }}
          onClick={handleDownload}
          disabled={downloading}
          className="flex flex-col items-center gap-1 disabled:opacity-70"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            {downloading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : downloadDone ? (
              <Icon name="Check" size={24} className="text-green-400" />
            ) : (
              <Icon name="Download" size={24} className="text-white" />
            )}
          </div>
          <span className="text-white text-xs font-semibold">{downloading ? "..." : downloadDone ? "Готово" : "Скачать"}</span>
        </button>

        {/* Report */}
        <div className="flex flex-col items-center gap-1">
          <ReportButton
            targetType="video"
            targetId={video.id}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white"
          />
          <span className="text-white text-xs font-semibold">Жалоба</span>
        </div>

        {/* Spinning disc */}
        <div className="w-10 h-10 rounded-full border-4 border-white/30 overflow-hidden animate-spin" style={{ animationDuration: "3s" }}>
          <UserAvatar src={video.avatar} name={video.author || video.handle} alt="disc" />
        </div>
      </div>

      {/* Desktop right actions — вне видео, все 7 кнопок */}
      <div className="hidden md:flex flex-col items-center gap-3 z-30 flex-shrink-0 justify-end pb-6">
        {/* Avatar */}
        <button
          onClick={toggleFollow}
          className="relative mb-2"
        >
          <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${following ? "border-[#fe2c55]" : "border-white"}`}>
            <UserAvatar src={video.avatar} name={video.author || video.handle} alt={video.author} />
          </div>
          {!following ? (
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
          <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <Icon name="Heart" size={26} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"} />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <Icon name="MessageCircle" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Share */}
        <button onClick={() => setShowShare(true)} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <Icon name="Send" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Bookmark */}
        <button onClick={toggleSaved} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            <Icon name="Bookmark" size={24} className={saved ? "text-[#ffd700] fill-[#ffd700]" : "text-white"} />
          </div>
          <span className="text-white text-xs font-semibold">Сохранить</span>
        </button>

        {/* Download */}
        <button onClick={handleDownload} disabled={downloading} className="flex flex-col items-center gap-1 disabled:opacity-70">
          <div className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors">
            {downloading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : downloadDone ? (
              <Icon name="Check" size={22} className="text-green-400" />
            ) : (
              <Icon name="Download" size={22} className="text-white" />
            )}
          </div>
          <span className="text-white text-xs font-semibold">{downloading ? "..." : downloadDone ? "Готово" : "Скачать"}</span>
        </button>

        {/* Report */}
        <div className="flex flex-col items-center gap-1">
          <ReportButton
            targetType="video"
            targetId={video.id}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors text-white"
          />
          <span className="text-white text-xs font-semibold">Жалоба</span>
        </div>

        {/* Spinning disc */}
        <div className="w-10 h-10 rounded-full border-4 border-white/30 overflow-hidden animate-spin" style={{ animationDuration: "3s" }}>
          <UserAvatar src={video.avatar} name={video.author || video.handle} alt="disc" />
        </div>
      </div>

      {showShare && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex flex-col justify-end"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-zinc-900 rounded-t-3xl px-4 pt-5 pb-10"
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
                { icon: "Mail", label: "Email", color: "#fe2c55", href: `mailto:?subject=${encodeURIComponent(`@${video.handle}`)}&body=${encodeURIComponent(`${video.description}\n${window.location.href}`)}` },
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
          className="fixed inset-0 z-[9999] flex flex-col justify-end"
          onPointerDown={() => setShowComments(false)}
        >
          <div
            className="bg-zinc-900 rounded-t-3xl flex flex-col max-h-[70%]"
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
                    <button>
                      <Icon name="Heart" size={14} className="text-white/40" />
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
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10 pb-8">
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