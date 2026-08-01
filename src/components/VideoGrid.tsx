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
  category?: string;
}

const VideoGrid = ({ onOpenVideo, category = "all" }: Props) => {
  const [videos, setVideos] = useState<GridVideo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (v: GridVideo) => {
    if (downloadingId !== null) return;
    const url = v.url;
    if (!url) return;
    setDownloadingId(v.id);
    const ext = ((url.split("?")[0].split(".").pop()) || (v.type === "video" ? "mp4" : "jpg")).slice(0, 5);
    const safeName = (v.author || v.handle || "look").replace(/[^a-z0-9_-]/gi, "_");
    const fileName = `${safeName}-${v.id}.${ext}`;
    const triggerSave = (blob: Blob) => {
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objUrl), 2000);
    };
    try {
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) { triggerSave(await res.blob()); setDownloadingId(null); return; }
    } catch { /* fallback ниже */ }
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const onUpdate = () => setVersion((v) => v + 1);
    window.addEventListener("thumbnails-updated", onUpdate);
    return () => window.removeEventListener("thumbnails-updated", onUpdate);
  }, []);

  useEffect(() => {
    // «Новые» — это не реальная категория, а сортировка: грузим все видео и сортируем по новизне
    const isNew = category === "new";
    const catParam = category && category !== "all" && !isNew ? `&category=${encodeURIComponent(category)}` : "";
    fetch(`${GET_VIDEOS_URL}?type=video${catParam}`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let list = (data.videos || []).map((v: any) => ({
          id: v.id + 10000,
          url: v.url,
          thumb: v.thumbnail || v.thumb || null,
          author: v.author || "Автор",
          handle: v.handle || "user",
          avatar: v.avatar || "",
          likes: v.likes || "0",
          description: v.description || "",
          type: v.type,
        }));
        if (isNew) list = [...list].sort((a, b) => b.id - a.id);
        setVideos(list);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [version, category]);

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
          <div
            key={v.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenVideo(v.id)}
            onKeyDown={(e) => { if (e.key === "Enter") onOpenVideo(v.id); }}
            className="group flex flex-col gap-2 text-left cursor-pointer"
          >
            <div className="media-overlay-text relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-black/5">
              {v.type === "video" ? (
                v.thumb ? (
                  <img
                    src={v.thumb}
                    alt={v.author}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#0a2e1a] to-[#1a1a1a] flex items-center justify-center">
                    <Icon name="Play" size={36} className="text-white/60" />
                  </div>
                )
              ) : (
                <img
                  src={v.thumb || v.url}
                  alt={v.author}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-300"
                />
              )}
              {v.type === "video" && (
                <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                  <Icon name="Play" size={14} className="text-white ml-0.5" />
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(v); }}
                disabled={downloadingId === v.id}
                title="Скачать"
                className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
              >
                {downloadingId === v.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Icon name="Download" size={14} className="text-white" />
                )}
              </button>
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoGrid;