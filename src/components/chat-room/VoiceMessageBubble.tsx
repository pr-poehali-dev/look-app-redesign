import { useRef, useState, ReactNode } from "react";
import Icon from "@/components/ui/icon";

interface VoiceMessageBubbleProps {
  isMe: boolean;
  dataUrl: string;
  duration: number;
  time: string;
  transcript?: string;
  transcribing: boolean;
  onTranscribe: () => void;
  ticks: ReactNode;
}

const VoiceMessageBubble = ({ isMe, dataUrl, duration, time, transcript, transcribing, onTranscribe, ticks }: VoiceMessageBubbleProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); } else { a.play().catch(() => {}); }
  };

  return (
    <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
      <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
        {dataUrl && (
          <audio
            ref={audioRef}
            src={dataUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        )}
        <button onClick={toggle} disabled={!dataUrl} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 disabled:opacity-40">
          <Icon name={playing ? "Pause" : "Play"} size={14} className="text-white ml-0.5" />
        </button>
        <div className="flex items-center gap-0.5 flex-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="w-0.5 bg-white/50 rounded-full" style={{ height: `${((i * 37) % 16) + 4}px` }} />
          ))}
        </div>
        <span className="text-white/70 text-xs flex-shrink-0">{duration}с</span>
        {isMe && ticks}
      </div>

      {transcript ? (
        <div className={`mt-1 px-3 py-2 rounded-xl max-w-full ${isMe ? "bg-[#fe2c55]/15" : "bg-white/5"}`}>
          <p className="text-white/70 text-xs leading-snug italic">{transcript}</p>
        </div>
      ) : dataUrl ? (
        <button
          onClick={onTranscribe}
          disabled={transcribing}
          className="mt-1 flex items-center gap-1 text-white/40 hover:text-white/70 text-[11px] transition-colors disabled:opacity-50"
        >
          {transcribing ? (
            <div className="w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="FileText" size={12} />
          )}
          {transcribing ? "Распознаём..." : "Расшифровать"}
        </button>
      ) : null}

      <span className="text-white/30 text-[10px] mt-0.5">{time}</span>
    </div>
  );
};

export default VoiceMessageBubble;
