import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { Story } from "./PostFeedTypes";

const StoryViewer = ({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) => {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5000;

  const startProgress = () => {
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current!);
        setIndex(i => {
          if (i + 1 < stories.length) return i + 1;
          onClose();
          return i;
        });
      }
    }, 30);
  };

  useEffect(() => {
    startProgress();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [index]);

  const story = stories[index];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" onClick={(e) => {
      const x = (e as React.MouseEvent).clientX;
      if (x < window.innerWidth / 2) {
        setIndex(i => Math.max(0, i - 1));
      } else {
        if (index + 1 < stories.length) setIndex(i => i + 1);
        else onClose();
      }
    }}>
      {/* Progress bars */}
      <div className="flex gap-1 px-2 pt-12 pb-2 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pb-3 z-10">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40">
          <img src={story.avatar} className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-semibold text-sm">{story.handle}</span>
        <span className="text-white/40 text-xs">сейчас</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="ml-auto">
          <Icon name="X" size={22} className="text-white" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative">
        <img src={story.image} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>,
    document.body
  );
};

export default StoryViewer;
