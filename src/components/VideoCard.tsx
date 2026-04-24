import { useState, useRef, useEffect } from "react";
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
}

interface VideoCardProps {
  video: VideoData;
  isActive: boolean;
}

const VideoCard = ({ video, isActive }: VideoCardProps) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isActive]);

  const isVideo = video.image.includes('.mp4');

  return (
    <div className="relative w-full h-full flex-shrink-0 snap-start overflow-hidden bg-black">
      {isVideo ? (
        <video
          ref={videoRef}
          src={video.image}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted
          playsInline
        />
      ) : (
        <img
          src={video.image}
          alt={video.description}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

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
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
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
        <button className="flex flex-col items-center gap-1">
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
        <button className="flex flex-col items-center gap-1">
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
    </div>
  );
};

export default VideoCard;