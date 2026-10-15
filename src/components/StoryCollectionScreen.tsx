import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { GET_PHOTOS_URL } from "@/components/post-feed/PostFeedTypes";
import SearchVideoViewer from "@/components/post-feed/SearchVideoViewer";

export interface StoryCollection {
  brand?: string;
  series?: string;
  owner?: string;
}

interface Item {
  id: number;
  url: string;
  thumbnail: string | null;
  type: string;
  handle: string;
  description: string;
  personal_experience?: boolean;
}

interface Props {
  collection: StoryCollection;
  onClose: () => void;
}

const StoryCollectionScreen = ({ collection, onClose }: Props) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<number | null>(null);
  const isSeries = !!collection.series;

  useEffect(() => {
    const qs = new URLSearchParams();
    if (collection.brand) qs.set("brand", collection.brand);
    if (collection.series) qs.set("series", collection.series);
    if (collection.owner) qs.set("series_owner", collection.owner);
    setLoading(true);
    fetch(`${GET_PHOTOS_URL}?${qs.toString()}`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setItems(data.videos || []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [collection.brand, collection.series, collection.owner]);

  const title = isSeries ? collection.series : `#${collection.brand}`;
  const subtitle = isSeries
    ? `Серия${collection.owner ? ` · @${collection.owner}` : ""}`
    : "Все посты с этим брендом";

  return createPortal(
    <div className="fixed inset-0 z-[9997] bg-black flex justify-center">
      <div className="relative w-full h-full max-w-[520px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 pt-10 pb-3 bg-black/90 backdrop-blur">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
            aria-label="Назад"
          >
            <Icon name="ChevronLeft" size={22} className="text-white" />
          </button>
          <div className="min-w-0">
            <p className="text-white font-bold text-base truncate">{title}</p>
            <p className="text-white/50 text-xs">{subtitle}{!loading && items.length > 0 ? ` · ${items.length}` : ""}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-white/50 text-sm text-center py-16">Пока нет постов</p>
        ) : (
          <div className="grid grid-cols-3 gap-1 px-1 pb-8">
            {items.map((it, i) => {
              const preview = it.thumbnail || (it.type === "image" ? it.url : null);
              return (
                <button
                  key={it.id}
                  onClick={() => setOpenId(it.id)}
                  className="relative aspect-[3/4] bg-white/10 overflow-hidden active:opacity-80"
                >
                  {preview ? (
                    <img loading="lazy" decoding="async" src={preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <Icon name={it.type === "video" ? "Play" : "FileText"} size={24} className="text-white/50" />
                    </div>
                  )}
                  {isSeries && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold">
                      Часть {i + 1} из {items.length}
                    </span>
                  )}
                  {!isSeries && it.handle && (
                    <span className="absolute bottom-1 left-1 right-1 truncate text-left text-white text-[10px] font-semibold drop-shadow">
                      @{it.handle}
                    </span>
                  )}
                  {it.type === "video" && (
                    <Icon name="Play" size={14} className="absolute top-1 right-1 text-white drop-shadow" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {openId !== null && <SearchVideoViewer id={openId} onClose={() => setOpenId(null)} />}
    </div>,
    document.body
  );
};

export default StoryCollectionScreen;
