import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { copyText } from "@/lib/copyText";
import type { VideoData } from "../VideoCard";

interface Props {
  video: VideoData;
  shareUrl: string;
  setShowShare: (v: boolean) => void;
  handleRepost: () => void;
  reposting: boolean;
  alreadyReposted: boolean;
  repostResult: "added" | "removed" | null;
  copied: boolean;
  setCopied: (v: boolean) => void;
  handleDownload: () => void;
  downloading: boolean;
  downloadDone: boolean;
}

const VideoShareSheet = ({ video, shareUrl, setShowShare, handleRepost, reposting, alreadyReposted, repostResult, copied, setCopied, handleDownload, downloading, downloadDone }: Props) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40"
      onClick={() => setShowShare(false)}
    >
      <div
        className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[360px] md:shadow-2xl max-h-[85vh] overflow-y-auto"
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
            { icon: "MessageCircle", label: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`@${video.handle}: ${video.description}`)}` },
            { icon: "Send", label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(`@${video.handle}: ${video.description}\n${shareUrl}`)}` },
            { icon: "Share2", label: "VK", color: "#0077FF", href: `https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}` },
            { icon: "MessageSquare", label: "МАКС", color: "#7C66FC", href: `https://max.ru/share?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`@${video.handle}: ${video.description}`)}` },
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
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alreadyReposted && !repostResult ? "bg-white/10" : "bg-[#FF5A3C]/20"}`}>
            <Icon
              name={repostResult ? "Check" : "Repeat2"}
              fallback="Repeat"
              size={20}
              className={repostResult === "added" ? "text-green-400" : repostResult === "removed" ? "text-white/60" : alreadyReposted ? "text-white/60" : "text-[#FF5A3C]"}
            />
          </div>
          <div className="text-left">
            <p className="text-white text-sm font-medium">
              {repostResult === "added" ? "Готово!" : repostResult === "removed" ? "Убрано!" : reposting ? (alreadyReposted ? "Убираем…" : "Репостим…") : alreadyReposted ? "Убрать репост" : "Репост к себе"}
            </p>
            <p className="text-white/40 text-xs">{alreadyReposted && !repostResult ? "Уже в твоём профиле" : "Видео появится в твоём профиле"}</p>
          </div>
        </button>

        {/* Copy link */}
        <button
          onClick={() => {
            copyText(shareUrl);
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

        {/* Скачать */}
        <button
          onClick={() => { handleDownload(); }}
          disabled={downloading}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mt-3 disabled:opacity-60"
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
      </div>
    </div>,
    document.body
  );
};

export default VideoShareSheet;
