import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import type { CollectionItem } from "@/hooks/useCollections";

interface Props {
  items: CollectionItem[];
  startIndex?: number;
  onWatched: (id: number) => void;
  onClose: () => void;
}

const PHOTO_MS = 5000;

const CollectionPlayer = ({ items, startIndex = 0, onWatched, onClose }: Props) => {
  const [index, setIndex] = useState(startIndex);
  const [depth, setDepth] = useState(1);
  const timer = useRef<number | null>(null);
  const item = items[index];

  const next = () => {
    if (index >= items.length - 1) { onClose(); return; }
    setIndex(index + 1);
    setDepth((d) => d + 1);
  };
  const prev = () => { if (index > 0) setIndex(index - 1); };

  useEffect(() => {
    if (!item) return;
    onWatched(item.id);
    if (timer.current) window.clearTimeout(timer.current);
    if (!item.is_video) timer.current = window.setTimeout(next, PHOTO_MS);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item) return null;
  const src = item.url || item.image || "";

  return createPortal(
    <div className="fixed inset-0 z-[10002] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
        <button onClick={onClose} className="p-2 -ml-2"><Icon name="X" size={24} className="text-white" /></button>
        <span className="text-white/70 text-sm font-semibold">{index + 1} / {items.length}</span>
        <span className="w-8" />
      </div>
      <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={next}>
        {item.is_video ? (
          <video
            key={item.id}
            src={src}
            className="max-h-full max-w-full object-contain"
            autoPlay
            playsInline
            controls
            onEnded={next}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img key={item.id} src={src} alt={item.title || ""} className="max-h-full max-w-full object-contain" />
        )}
      </div>
      <div className="px-4 py-4 flex-shrink-0">
        {item.handle && <p className="text-white font-semibold text-sm">@{item.handle}</p>}
        {item.title && <p className="text-white/80 text-sm leading-snug line-clamp-2">{item.title}</p>}
        <div className="flex gap-3 mt-3">
          <button onClick={prev} disabled={index === 0} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm font-semibold disabled:opacity-30">Назад</button>
          <button onClick={next} className="flex-1 py-2.5 rounded-xl bg-[#FF5A3C] text-white text-sm font-semibold">{index >= items.length - 1 ? "Закончить" : "Дальше"}</button>
        </div>
        <p className="sr-only">{depth}</p>
      </div>
    </div>,
    document.body
  );
};

export default CollectionPlayer;
