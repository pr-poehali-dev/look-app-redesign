import { useEffect } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { SavedItem, useSavedItem } from "@/hooks/useSaved";

interface Props {
  item: SavedItem;
  onClose: () => void;
}

const SavedItemViewer = ({ item, onClose }: Props) => {
  const { saved, toggle } = useSavedItem(item.type, item.id, {
    image: item.image,
    title: item.title,
    handle: item.handle,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isVideo = item.type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(item.image);

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" onClick={onClose}>
      <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2">
          <Icon name="ArrowLeft" size={24} className="text-white" />
        </button>
        <span className="text-white font-semibold text-sm">
          {item.type === "video" ? "Видео" : "Пост"}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); toggle(); }}
          className="p-2 -mr-2"
        >
          <Icon
            name="Bookmark"
            size={22}
            className={saved ? "text-[#ffd700] fill-[#ffd700]" : "text-white"}
          />
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={item.image}
            className="max-h-full max-w-full object-contain"
            controls
            autoPlay
            playsInline
            loop
          />
        ) : (
          <img
            src={item.image}
            alt={item.title || ""}
            className="max-h-full max-w-full object-contain"
          />
        )}
      </div>

      <div className="px-4 py-4 bg-black flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {item.handle && (
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full overflow-hidden">
              <UserAvatar name={item.handle} alt={item.handle} />
            </div>
            <span className="text-white font-semibold text-sm">@{item.handle}</span>
          </div>
        )}
        {item.title && (
          <p className="text-white/90 text-sm leading-snug">{item.title}</p>
        )}
        <p className="text-white/40 text-xs mt-2">
          Сохранено {new Date(item.savedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
        </p>
      </div>
    </div>,
    document.body
  );
};

export default SavedItemViewer;
