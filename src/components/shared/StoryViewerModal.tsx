import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useIsMobile } from "@/hooks/use-mobile";

export interface StoryViewerItem {
  id: number | string;
  image: string;
  isVideo?: boolean;
  label: string;
  avatar?: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

const getTargetRect = (isMobile: boolean): Rect => {
  if (isMobile) {
    const size = Math.min(Math.min(window.innerWidth, window.innerHeight) * 0.78, 380);
    return {
      top: (window.innerHeight - size) / 2,
      left: (window.innerWidth - size) / 2,
      width: size,
      height: size,
      radius: size / 2,
    };
  }
  return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight, radius: 0 };
};

const rectFromDom = (r: DOMRect): Rect => ({
  top: r.top,
  left: r.left,
  width: r.width,
  height: r.height,
  radius: r.width / 2,
});

interface Props {
  items: StoryViewerItem[];
  startIndex: number;
  onClose: () => void;
  originRect: DOMRect | null;
}

/** Универсальный просмотрщик историй: раскрывается анимацией из круглого аватара.
 * На десктопе — в полноэкранный вид, на телефоне — остаётся компактным круглым окном по центру. */
const StoryViewerModal = ({ items, startIndex, onClose, originRect }: Props) => {
  const isMobile = useIsMobile();
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [opened, setOpened] = useState(false);
  const [rect, setRect] = useState<Rect>(() => (originRect ? rectFromDom(originRect) : getTargetRect(isMobile)));
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setRect(getTargetRect(isMobile));
      setOpened(true);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const item = items[Math.min(index, items.length - 1)];
  const DURATION = item?.isVideo ? 15000 : 5000;

  const goNext = () => {
    if (index < items.length - 1) setIndex(i => i + 1);
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) setIndex(i => i - 1);
  };

  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    const step = 100 / (DURATION / 50);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p + step >= 100) {
          clearInterval(timerRef.current!);
          goNext();
          return 100;
        }
        return p + step;
      });
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (item && !item.isVideo) startProgress();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (items.length === 0) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (!item) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black transition-opacity duration-300"
        style={{ opacity: opened ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="fixed overflow-hidden bg-black shadow-2xl"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: rect.radius,
          transition: "top 320ms cubic-bezier(.4,0,.2,1), left 320ms cubic-bezier(.4,0,.2,1), width 320ms cubic-bezier(.4,0,.2,1), height 320ms cubic-bezier(.4,0,.2,1), border-radius 320ms cubic-bezier(.4,0,.2,1)",
        }}
      >
        {/* Progress bars */}
        <div
          className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-3 z-10 transition-opacity duration-200"
          style={{ opacity: opened ? 1 : 0 }}
        >
          {items.map((_, i) => (
            <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div
          className="absolute top-4 left-0 right-0 flex items-center gap-2 px-3 pt-4 pb-3 z-10 bg-gradient-to-b from-black/50 to-transparent transition-opacity duration-200"
          style={{ opacity: opened ? 1 : 0 }}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40 flex-shrink-0">
            <UserAvatar src={item.avatar} name={item.label} alt={item.label} />
          </div>
          <span className="text-white font-semibold text-sm truncate flex-1">{item.label}</span>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="flex-shrink-0">
            <Icon name="X" size={22} className="text-white" />
          </button>
        </div>

        {/* Media */}
        {item.isVideo ? (
          <video
            ref={videoRef}
            key={item.id}
            src={item.image}
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            playsInline
            onPlay={startProgress}
            onLoadedData={() => videoRef.current?.play()}
          />
        ) : (
          <img key={item.id} src={item.image} className="absolute inset-0 w-full h-full object-cover" alt="" />
        )}

        {/* Tap zones */}
        <div className="absolute inset-0 flex z-10" style={{ pointerEvents: opened ? "auto" : "none" }}>
          <div className="flex-1" onClick={goPrev} />
          <div className="flex-1" onClick={goNext} />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StoryViewerModal;
