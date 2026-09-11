import { useRef, useState, ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface VideoNoteBubbleProps {
  isMe: boolean;
  mediaUrl: string;
  duration: number;
  time: string;
  transcript?: string;
  transcribing?: boolean;
  onTranscribe?: () => void;
  ticks: ReactNode;
}

const VideoNoteBubble = ({ isMe, mediaUrl, duration, time, transcript, transcribing, onTranscribe, ticks }: VideoNoteBubbleProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); } else { v.play().catch(() => {}); }
  };

  return (
    <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
      <div className="relative w-44 h-44 rounded-full overflow-hidden ring-2 ring-white/15 shadow-xl bg-black">
        {mediaUrl && (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-cover"
            playsInline
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onClick={toggle}
          />
        )}
        {!playing && (
          <button onClick={toggle} className="absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="w-11 h-11 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
              <Icon name="Play" size={20} className="text-white ml-0.5" />
            </div>
          </button>
        )}
        <span className="absolute bottom-2 right-2 text-white text-[10px] bg-black/50 px-1.5 py-0.5 rounded-full">{duration}с</span>
        {onTranscribe && !transcribing && (
          <button
            onClick={onTranscribe}
            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-[#2b7fff] flex items-center justify-center shadow-lg"
            title="Расшифровать"
          >
            <span className="text-white text-[13px] font-semibold">T</span>
          </button>
        )}
      </div>

      <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
        <span className="text-white/30 text-[10px]">{time}</span>
        {isMe && ticks}
      </div>

      {transcribing && (
        <div className="mt-1 flex items-center gap-1.5 text-white/40 text-[11px]">
          <div className="w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          Распознаём речь...
        </div>
      )}

      {transcript && (
        <div className={`mt-1 px-3 py-2 rounded-xl max-w-full ${isMe ? "bg-[#fe2c55]/15" : "bg-white/5"}`}>
          <p className="text-white/70 text-xs leading-snug italic">{transcript}</p>
        </div>
      )}
    </div>
  );
};

export default VideoNoteBubble;