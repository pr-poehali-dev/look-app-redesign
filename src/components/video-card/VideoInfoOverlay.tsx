import { Dispatch, SetStateAction } from "react";
import PlaceDetails from "@/components/post-feed/PlaceDetails";
import Icon from "@/components/ui/icon";
import LinkifiedText from "@/components/ui/linkified-text";
import StoryTags from "@/components/StoryTags";
import type { VideoData } from "../VideoCard";

interface VideoInfoOverlayProps {
  video: VideoData;
  expanded: boolean;
  setExpanded: Dispatch<SetStateAction<boolean>>;
  isSelf: boolean;
  following: boolean;
  toggleFollow: () => void;
  formatCount: (n: number) => string;
  handleUseTemplate: () => void;
}

const VideoInfoOverlay = ({
  video,
  expanded,
  setExpanded,
  isSelf,
  following,
  toggleFollow,
  formatCount,
  handleUseTemplate,
}: VideoInfoOverlayProps) => {
  return (
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
      <StoryTags handle={video.handle} seriesTitle={video.seriesTitle} brand={video.brand} personalExperience={video.personalExperience} />
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
      {video.place && (video.address || video.workHours || video.tips) ? (
        <PlaceDetails place={video.place} address={video.address} workHours={video.workHours} tips={video.tips} tone="light" />
      ) : video.place && (
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
  );
};

export default VideoInfoOverlay;
