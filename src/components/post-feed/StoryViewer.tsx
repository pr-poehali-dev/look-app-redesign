import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
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
    if (stories.length === 0) { onClose(); return; }
    startProgress();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [index, stories.length]);

  const story = stories[Math.min(index, stories.length - 1)];
  if (!story) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" onClick={(e) => {
      const x = (e as React.MouseEvent).clientX;
      if (x < window.innerWidth / 2) {
        setIndex(i => Math.max(0, i - 1));
      } else {
        if (index + 1 < stories.length) setIndex(i => i + 1);
        else onClose();
      }
    }}>
      <div className="relative w-full h-full md:w-auto md:h-[90vh] md:aspect-[9/16] md:max-h-[90vh] md:max-w-[min(50vh,420px)] md:rounded-2xl md:overflow-hidden bg-black flex flex-col">
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-3 md:pt-2 pb-2 z-10">
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
        <div className="absolute top-4 md:top-3 left-0 right-0 flex items-center gap-2 px-3 pt-4 pb-3 z-10 bg-gradient-to-b from-black/40 to-transparent">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40">
            <UserAvatar src={story.avatar} name={story.handle} alt={story.handle} />
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
      </div>
    </div>,
    document.body
  );
};

export default StoryViewer;