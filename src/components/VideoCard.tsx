import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";

export interface VideoData {
  id: number;
  image: string;
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
}

const MOCK_COMMENTS = [
  { id: 1, name: "anya_dance", text: "🔥 Это просто огонь!", time: "1 мин" },
  { id: 2, name: "max_parkour", text: "Лучшее что я видел сегодня 😂", time: "3 мин" },
  { id: 3, name: "cozy_coffee", text: "Подписалась сразу!", time: "5 мин" },
  { id: 4, name: "travel_rus", text: "Продолжай в том же духе 👏", time: "12 мин" },
  { id: 5, name: "fit_pro", text: "Как ты это делаешь?? 🤯", time: "20 мин" },
];

const VideoCard = ({ video, isActive }: VideoCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [extraComments, setExtraComments] = useState<typeof MOCK_COMMENTS>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
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

  const handleShare = async () => {
    const url = window.location.href;
    const text = `${video.description} — @${video.handle}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${video.handle}`, text, url });
      } catch (e) { void e; }
    } else {
      try {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        alert("Ссылка скопирована!");
      } catch {
        alert("Поделиться: " + url);
      }
    }
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    setExtraComments(prev => [
      { id: Date.now(), name: "Я", text: commentText.trim(), time: "сейчас" },
      ...prev,
    ]);
    setCommentText("");
  };

  const allComments = [...extraComments, ...MOCK_COMMENTS];

  const isVideo = video.isVideo ?? (video.image.includes('.mp4') || video.image.includes('.mov') || video.image.includes('.webm'));

  return (
    <div className="relative w-full h-full flex-shrink-0 snap-start overflow-hidden bg-black">
      {isVideo ? (
        <>
          <video
            ref={videoRef}
            src={video.image}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted={muted}
            playsInline
          />
          {!showComments && (
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onClick={handleVideoClick}
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
            className="absolute top-4 right-4 z-30 bg-black/40 rounded-full p-2 backdrop-blur-sm"
            onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          >
            <Icon name={muted ? "VolumeX" : "Volume2"} size={20} className="text-white" />
          </button>
        </>
      ) : (
        <img
          src={video.image}
          alt={video.description}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

      {/* Bottom left info */}
      <div className="absolute bottom-20 left-4 right-16 z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-bold text-white text-base">@{video.handle}</span>
          {!following && (
            <button
              onClick={() => setFollowing(true)}
              className="px-3 py-0.5 rounded-full border border-white text-white text-xs font-semibold hover:bg-white hover:text-black transition-all"
            >
              Подписаться
            </button>
          )}
          {following && (
            <span className="px-3 py-0.5 rounded-full bg-white/20 text-white text-xs font-semibold">
              Вы подписаны
            </span>
          )}
        </div>
        <p className="text-white text-sm leading-snug mb-3 line-clamp-2">{video.description}</p>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
            <Icon name="Music" size={10} className="text-white" />
          </div>
          <span className="text-white/80 text-xs truncate max-w-[180px]">{video.song}</span>
        </div>
      </div>

      {/* Right side actions */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-20">
        {/* Avatar */}
        <div className="relative mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white">
            <img src={video.avatar} alt={video.author} className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center">
            <Icon name="Plus" size={12} className="text-white" />
          </div>
        </div>

        {/* Like */}
        <button
          onClick={() => setLiked(!liked)}
          className="flex flex-col items-center gap-1 group"
        >
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-200 ${liked ? "scale-110" : "group-active:scale-90"}`}>
            <Icon
              name="Heart"
              size={28}
              className={`transition-colors duration-200 ${liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"}`}
            />
          </div>
          <span className="text-white text-xs font-semibold">{liked ? parseInt(video.likes.replace("K","")) + 0.1 + "K" : video.likes}</span>
        </button>

        {/* Comment */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowComments(true); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="MessageCircle" size={26} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{video.comments}</span>
        </button>

        {/* Save */}
        <button
          onClick={() => setSaved(!saved)}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon
              name="Bookmark"
              size={26}
              className={`transition-colors duration-200 ${saved ? "text-[#ffd700] fill-[#ffd700]" : "text-white"}`}
            />
          </div>
          <span className="text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Share */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowShare(true); }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Share2" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">Поделиться</span>
        </button>

        {/* Download */}
        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = video.image;
            a.download = `look_${video.id}.jpg`;
            a.target = "_blank";
            a.click();
          }}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-11 h-11 rounded-full flex items-center justify-center">
            <Icon name="Download" size={24} className="text-white" />
          </div>
          <span className="text-white text-xs font-semibold">Скачать</span>
        </button>

        {/* Spinning disc */}
        <div className="w-10 h-10 rounded-full border-4 border-white/30 overflow-hidden animate-spin" style={{ animationDuration: "3s" }}>
          <img src={video.avatar} alt="disc" className="w-full h-full object-cover" />
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
              <span className="text-white font-bold text-base">{allComments.length} комментариев</span>
              <button onPointerDown={() => setShowComments(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
              {allComments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{c.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-semibold text-sm">{c.name}</span>
                      <span className="text-white/30 text-xs">{c.time}</span>
                    </div>
                    <p className="text-white/80 text-sm">{c.text}</p>
                  </div>
                  <button className="flex-shrink-0 mt-1">
                    <Icon name="Heart" size={14} className="text-white/40" />
                  </button>
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