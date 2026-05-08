import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";

const AVATAR = "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg";

export interface Story {
  id: number;
  url: string;
  type: "image" | "video";
  label: string;
}

const StoryViewer = ({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) => {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const story = stories[index];
  const DURATION = story.type === "video" ? 15000 : 5000;

  const goNext = () => {
    if (index < stories.length - 1) { setIndex(i => i + 1); setProgress(0); }
    else onClose();
  };
  const goPrev = () => {
    if (index > 0) { setIndex(i => i - 1); setProgress(0); }
  };

  useState(() => {
    setProgress(0);
  });

  // progress bar
  useRef(() => {});
  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(0);
    const step = 100 / (DURATION / 50);
    timerRef.current = setInterval(() => {
      setProgress(p => {
        if (p + step >= 100) { clearInterval(timerRef.current!); goNext(); return 100; }
        return p + step;
      });
    }, 50);
  };

  // reset on index change
  const mounted = useRef(false);
  if (!mounted.current) { mounted.current = true; }

  useRef(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); }; });

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={e => e.stopPropagation()}>
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-12 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-14 left-4 right-4 flex items-center gap-3 z-10">
        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white flex-shrink-0">
          <UserAvatar src={AVATAR} name={story.label} alt={story.label} />
        </div>
        <span className="text-white font-semibold text-sm flex-1">{story.label}</span>
        <button onClick={onClose} className="p-1"><Icon name="X" size={22} className="text-white" /></button>
      </div>

      {/* Media */}
      {story.type === "video" ? (
        <video
          ref={videoRef}
          key={story.id}
          src={story.url}
          className="w-full h-full object-cover"
          autoPlay
          muted={false}
          playsInline
          onPlay={startProgress}
          onLoadedData={() => videoRef.current?.play()}
        />
      ) : (
        <img
          key={story.id}
          src={story.url}
          className="w-full h-full object-cover"
          onLoad={startProgress}
          alt=""
        />
      )}

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-10">
        <div className="flex-1" onClick={goPrev} />
        <div className="flex-1" onClick={goNext} />
      </div>
    </div>
  );
};

export default StoryViewer;
