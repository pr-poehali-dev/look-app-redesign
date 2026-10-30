import { Dispatch, RefObject, SetStateAction } from "react";
import Icon from "@/components/ui/icon";
import type { VideoData } from "../VideoCard";

interface VideoMediaLayerProps {
  video: VideoData;
  isVideo: boolean;
  isActive: boolean;
  preloadLevel: "full" | "meta" | "none";
  videoRef: RefObject<HTMLVideoElement | null>;
  muted: boolean;
  setMuted: Dispatch<SetStateAction<boolean>>;
  volume: number;
  setVolume: Dispatch<SetStateAction<number>>;
  showVolume: boolean;
  setShowVolume: Dispatch<SetStateAction<boolean>>;
  paused: boolean;
  showPauseIcon: boolean;
  handleVideoClick: () => void;
  setShowProducts: Dispatch<SetStateAction<boolean>>;
  currentTime: number;
  duration: number;
  buffered: number;
  fmtTime: (s: number) => string;
  setSeeking: Dispatch<SetStateAction<boolean>>;
  handleSeek: (value: number) => void;
}

const VideoMediaLayer = ({
  video,
  isVideo,
  isActive,
  preloadLevel,
  videoRef,
  muted,
  setMuted,
  volume,
  setVolume,
  showVolume,
  setShowVolume,
  paused,
  showPauseIcon,
  handleVideoClick,
  setShowProducts,
  currentTime,
  duration,
  buffered,
  fmtTime,
  setSeeking,
  handleSeek,
}: VideoMediaLayerProps) => {
  return (
    <>
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
                className="volume-slider w-24 h-1 cursor-pointer accent-[#FF5A3C]"
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
              <div className="absolute left-0 h-1 rounded-full bg-[#FF5A3C]" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
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
    </>
  );
};

export default VideoMediaLayer;