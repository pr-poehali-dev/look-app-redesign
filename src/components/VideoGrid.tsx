import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

interface GridVideo {
  id: number;
  url: string;
  thumb?: string;
  author: string;
  handle: string;
  avatar?: string;
  likes: string;
  description?: string;
  type?: string;
}

interface Props {
  onOpenVideo: (id: number) => void;
}

const VideoGrid = ({ onOpenVideo }: Props) => {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${GET_VIDEOS_URL}?type=video`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = (data.videos || []).map((v: any) => ({
          id: v.id + 10000,
          url: v.url,
          thumb: v.thumb || v.url,
          author: v.author || "Автор",
          handle: v.handle || "user",
          avatar: v.avatar || "",
          likes: v.likes || "0",
          description: v.description || "",
          type: v.type,
        }));
        setVideos(list);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return (
      <div className="w-full h-full flex items-center justify-center pt-20">
        <p className="text-white/40 text-sm">Загрузка...</p>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center pt-20">
        <p className="text-white/40 text-sm">Видео пока нет</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto pt-[72px] pb-6 px-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => onOpenVideo(v.id)}
            className="group flex flex-col gap-2 text-left"
          >
            <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-[var(--look-chip-bg)]">
              {v.type === "video" ? (
                <video
                  src={v.url}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  muted
                  preload="metadata"
                  playsInline
                />
              ) : (
                <img
                  src={v.thumb || v.url}
                  alt={v.author}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              )}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/50 backdrop-blur-sm">
                <Icon name="Heart" size={11} className="text-white" />
                <span className="text-white text-[10px] font-medium">{v.likes}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={v.avatar} name={v.author} alt={v.author} />
              </div>
              <span className="text-[var(--look-chip-fg)] text-xs truncate">
                {v.handle || v.author}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;
