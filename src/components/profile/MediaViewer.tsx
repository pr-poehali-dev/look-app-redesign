import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

export interface Story {
  id: number;
  url: string;
  type: "image" | "video" | "text";
  label: string;
  description?: string;
  thumbnail?: string;
  thumb?: string;
}

export interface MediaCounts { likes: Record<string, number>; comments: Record<string, number>; saves: Record<string, number>; downloads: Record<string, number>; views: Record<string, number> }

const StatItem = ({ icon, value, label }: { icon: string; value: number; label: string }) => (
  <div className="flex flex-col items-center gap-1 min-w-[56px]">
    <Icon name={icon} fallback="Circle" size={22} className="text-white" />
    <span className="text-white font-bold text-sm leading-none">{value}</span>
    <span className="text-white/60 text-[10px] leading-none">{label}</span>
  </div>
);

const MediaViewer = ({ items, startIndex, onClose, onDelete, isRepostView, counts }: { items: Story[]; startIndex: number; onClose: () => void; onDelete: (id: number) => void; isRepostView?: boolean; counts?: MediaCounts }) => {
  const [index, setIndex] = useState(startIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (items.length === 0) { onClose(); return; }
    if (index >= items.length) setIndex(Math.max(0, items.length - 1));
  }, [items, index, onClose]);

  const item = items[Math.min(index, items.length - 1)];
  const goNext = () => index < items.length - 1 ? setIndex(i => i + 1) : onClose();
  const goPrev = () => index > 0 ? setIndex(i => i - 1) : null;

  const handleDelete = () => {
    if (!item) return;
    onDelete(item.id);
    setConfirmDelete(false);
    setDeleted(true);
    setTimeout(() => setDeleted(false), 1200);
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-black/60 to-transparent z-20">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" style={{ touchAction: "manipulation" }} title="Назад"><Icon name="ArrowLeft" size={24} className="text-white" /></button>
        <span className="text-white text-sm font-medium">{index + 1} / {items.length}</span>
        <span className="w-10" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-6">
        <div className="flex items-center justify-center gap-4 pb-2">
          <StatItem icon="Eye" value={counts?.views[String(item.id)] || 0} label="Просмотры" />
          <StatItem icon="Heart" value={counts?.likes[String(item.id)] || 0} label="Лайки" />
          <StatItem icon="MessageCircle" value={counts?.comments[String(item.id)] || 0} label="Комментарии" />
          <StatItem icon="Bookmark" value={counts?.saves[String(item.id)] || 0} label="В коллекциях" />
          <StatItem icon="Download" value={counts?.downloads[String(item.id)] || 0} label="Скачивания" />
        </div>
        <button
          onClick={() => setConfirmDelete(true)}
          className="pointer-events-auto w-full flex items-center justify-center gap-2 px-4 pt-2 pb-8 text-red-400 font-semibold text-sm hover:text-red-300 transition-colors cursor-pointer"
          style={{ touchAction: "manipulation" }}
        >
          <Icon name={isRepostView ? "Repeat2" : "Trash2"} fallback="Trash2" size={20} />
          {isRepostView ? "Убрать репост" : "Удалить"}
        </button>
      </div>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-end justify-center pb-16" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl mx-4 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center">
              <p className="font-bold text-black text-base">{isRepostView ? "Убрать репост?" : "Удалить?"}</p>
              <p className="text-gray-500 text-sm mt-1">{isRepostView ? "Публикация исчезнет из твоего профиля" : "Это действие нельзя отменить"}</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmDelete(false); }}
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3.5 text-gray-500 font-medium text-sm border-r border-gray-100"
                style={{ touchAction: "manipulation" }}
              >Отмена</button>
              <button
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(); }}
                onClick={handleDelete}
                className="flex-1 py-3.5 text-red-500 font-semibold text-sm"
                style={{ touchAction: "manipulation" }}
              >{isRepostView ? "Убрать" : "Удалить"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {deleted && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2 shadow-lg">
          <Icon name={isRepostView ? "Repeat2" : "Trash2"} fallback="Trash2" size={16} className="text-red-500" />
          <span className="text-black text-sm font-medium">{isRepostView ? "Репост убран" : "Удалено"}</span>
        </div>
      )}

      {/* Media */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {item.type === "text" ? (
          <div key={item.id} className="w-full h-full overflow-y-auto flex items-center justify-center px-8 py-24 bg-gradient-to-br from-[#2a1f3d] to-[#1a2a3a]">
            <p className="text-white text-lg leading-relaxed whitespace-pre-wrap break-words">{item.description}</p>
          </div>
        ) : item.type === "video" ? (
          <video
            key={item.id}
            src={item.url}
            poster={item.thumbnail || item.thumb || undefined}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            autoPlay
            controls
            playsInline
          />
        ) : (
          <img loading="lazy" decoding="async" key={item.id} src={item.url} className="max-w-full max-h-full w-auto h-auto object-contain" alt="" />
        )}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        <div className="flex-1 pointer-events-auto" onClick={goPrev} />
        <div className="w-16" />
        <div className="flex-1 pointer-events-auto" onClick={goNext} />
      </div>

      {/* Arrows */}
      {index > 0 && (
        <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2">
          <Icon name="ChevronLeft" size={24} className="text-white" />
        </button>
      )}
      {index < items.length - 1 && (
        <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2">
          <Icon name="ChevronRight" size={24} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default MediaViewer;
