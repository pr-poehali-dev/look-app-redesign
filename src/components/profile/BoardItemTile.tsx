import Icon from "@/components/ui/icon";
import type { BoardItem } from "@/hooks/useBoards";

interface Props {
  item: BoardItem;
  canRemove: boolean;
  canPin: boolean;
  onOpen: (item: BoardItem) => void;
  onRemove: (id: number) => void;
  onPin: (item: BoardItem) => void;
}

export const isVideoItem = (item: BoardItem) => item.item_type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(item.image || "");

const openAuthor = (e: React.MouseEvent, handle: string) => {
  e.stopPropagation();
  window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle } }));
};

const BoardItemTile = ({ item, canRemove, canPin, onOpen, onRemove, onPin }: Props) => {
  const isVideo = isVideoItem(item);
  const source = item.source_handle || "";
  return (
    <div className="relative rounded-2xl overflow-hidden bg-gray-50 group">
      <button onClick={() => item.image && onOpen(item)} className="w-full block">
        {isVideo ? (
          <video src={item.image || undefined} className="w-full h-auto object-cover block" muted playsInline preload="metadata" />
        ) : (
          item.image && <img src={item.image} alt={item.title || ""} className="w-full h-auto object-cover block" loading="lazy" />
        )}
      </button>
      {source && (
        <button
          onClick={(e) => openAuthor(e, source)}
          className="absolute top-2 left-2 h-6 px-2 rounded-full bg-black/55 backdrop-blur flex items-center gap-1 text-white text-[10px] font-semibold max-w-[70%]"
          aria-label="Источник"
        >
          <Icon name="ExternalLink" size={10} />
          <span className="truncate">@{source}</span>
        </button>
      )}
      {item.title && (
        <div className="absolute inset-x-0 bottom-0 bg-black/55 backdrop-blur-sm px-2.5 py-1.5 pointer-events-none">
          <p className="text-white text-[12px] font-semibold leading-snug line-clamp-2">{item.title}</p>
        </div>
      )}
      <div className="absolute top-2 right-2 flex gap-1.5">
        {canPin && (
          <button onClick={() => onPin(item)} className={`w-7 h-7 rounded-full backdrop-blur flex items-center justify-center ${item.pinned ? "bg-[#FF5A3C]" : "bg-black/50"}`} aria-label="Закрепить">
            <Icon name="Pin" size={13} className="text-white" />
          </button>
        )}
        {canRemove && (
          <button onClick={() => onRemove(item.id)} className="w-7 h-7 rounded-full bg-black/50 backdrop-blur flex items-center justify-center" aria-label="Убрать">
            <Icon name="X" size={14} className="text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default BoardItemTile;
