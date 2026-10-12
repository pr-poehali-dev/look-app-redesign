import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import VideoCard, { VideoData } from "@/components/VideoCard";
import { GET_PHOTOS_URL } from "./PostFeedTypes";
import { toVideo } from "@/components/MediaDeepLink";

interface Props {
  id: number;
  onClose: () => void;
}

const SearchVideoViewer = ({ id, onClose }: Props) => {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch(`${GET_PHOTOS_URL}?id=${id}`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (!data.video) { setFailed(true); return; }
        setVideo(toVideo(data.video));
      })
      .catch(() => setFailed(true));
  }, [id]);

  return createPortal(
    <div className="fixed inset-0 z-[9998] bg-black flex justify-center">
      <div className="relative w-full h-full max-w-[520px]">
        {video && <VideoCard video={video} isActive preloadLevel="full" />}
        {!video && !failed && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        )}
        {failed && <p className="text-white/70 text-sm text-center pt-40">Видео недоступно</p>}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-[60] w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
          aria-label="Закрыть"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>
      </div>
    </div>,
    document.body
  );
};

export default SearchVideoViewer;
