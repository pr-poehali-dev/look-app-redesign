import { Dispatch, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import type { VideoData } from "../VideoCard";

interface VideoActionButtonsProps {
  video: VideoData;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  saved: boolean;
  guest: boolean;
  needAuth: () => void;
  toggleLike: () => void;
  toggleSaved: () => void;
  formatCount: (n: number) => string;
  setShowComments: Dispatch<SetStateAction<boolean>>;
  setShowShare: Dispatch<SetStateAction<boolean>>;
  setShowMore: Dispatch<SetStateAction<boolean>>;
}

const VideoActionButtons = ({
  video,
  liked,
  likeCount,
  commentCount,
  saved,
  guest,
  needAuth,
  toggleLike,
  toggleSaved,
  formatCount,
  setShowComments,
  setShowShare,
  setShowMore,
}: VideoActionButtonsProps) => {
  return (
    <>
      {/* Right side actions — мобайл (внутри видео) */}
      <div className={`absolute right-2 ${guest ? "bottom-[58px]" : "bottom-24"} flex flex-col items-center gap-3 z-30 md:hidden`}>
        {/* Like */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); toggleLike(); }}
          onClick={() => toggleLike()}
          className="flex flex-col items-center gap-0"
          style={{ touchAction: "manipulation" }}
          title="Нравится"
        >
          <div className="action-icon-mobile-bg w-8 h-8 rounded-full flex items-center justify-center">
            <Icon
              name="Heart"
              size={22}
              className={liked ? "text-[#FF5A3C] fill-[#FF5A3C]" : "action-icon-glyph"}
            />
          </div>
          <span className="action-count-text action-count-mobile-bg px-1 text-white text-[11px] font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowComments(true); }}
          onClick={() => { setShowComments(true); }}
          className="flex flex-col items-center gap-0"
          style={{ touchAction: "manipulation" }}
          title="Комментарии"
        >
          <div className="action-icon-mobile-bg w-8 h-8 rounded-full flex items-center justify-center">
            <Icon name="MessageSquare" size={22} className="action-icon-glyph" />
          </div>
          <span className="action-count-text action-count-mobile-bg px-1 text-white text-[11px] font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Send / Share */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); if (guest) return needAuth(); setShowShare(true); }}
          onClick={() => { if (guest) return needAuth(); setShowShare(true); }}
          className="flex flex-col items-center gap-0"
          style={{ touchAction: "manipulation" }}
          title="Поделиться"
        >
          <div className="action-icon-mobile-bg w-8 h-8 rounded-full flex items-center justify-center">
            <Icon name="ShareArrow" size={22} className="action-icon-glyph" />
          </div>
          <span className="action-count-text action-count-mobile-bg px-1 text-white text-[11px] font-semibold">{video.shares}</span>
        </button>

        {/* Ещё (в т.ч. сохранение в коллекцию) */}
        <button
          onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); if (guest) return needAuth(); setShowMore(true); }}
          onClick={() => { if (guest) return needAuth(); setShowMore(true); }}
          className="flex flex-col items-center justify-center"
          style={{ touchAction: "manipulation" }}
          title="Ещё действия"
        >
          <div className="action-icon-mobile-bg w-8 h-8 rounded-full flex items-center justify-center">
            <span className="action-count-text text-white text-[11px] font-bold leading-none">Ещё</span>
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
              className={liked ? "text-[#FF5A3C] fill-[#FF5A3C]" : "action-icon-glyph"}
            />
          </div>
          <span className="action-count-text text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </button>

        {/* Comment */}
        <button onClick={() => { setShowComments(true); }} className="flex flex-col items-center gap-1">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon name="MessageSquare" size={24} className="action-icon-glyph" />
          </div>
          <span className="action-count-text text-white text-xs font-semibold">{formatCount(commentCount)}</span>
        </button>

        {/* Share */}
        <button onClick={() => { if (guest) return needAuth(); setShowShare(true); }} className="flex flex-col items-center gap-1">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon name="ShareArrow" size={22} className="action-icon-glyph" />
          </div>
          <span className="action-count-text text-white text-xs font-semibold">{video.shares}</span>
        </button>

        {/* Bookmark */}
        <button onClick={toggleSaved} className="flex flex-col items-center gap-1" title="Сохранить в коллекцию">
          <div className="action-icon-circle w-12 h-12 rounded-full flex items-center justify-center transition-colors">
            <Icon
              name="Bookmark"
              size={22}
              className={saved ? "text-[#FF5A3C] fill-[#FF5A3C]" : "action-icon-glyph"}
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
    </>
  );
};

export default VideoActionButtons;