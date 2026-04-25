import Icon from "@/components/ui/icon";

const MODES = ["Фото", "Видео", "Прямой эфир"];

interface CameraTopBarProps {
  flash: boolean;
  recording: boolean;
  recordSeconds: number;
  selectedTrack: { color: string; title: string; artist: string } | null;
  showMusicPanel: boolean;
  mode: string;
  timerRef: React.RefObject<ReturnType<typeof setInterval> | null>;
  onClose: () => void;
  onToggleFlash: () => void;
  onToggleMusicPanel: () => void;
  onModeChange: (m: string) => void;
  onStopRecording: () => void;
}

const formatTime = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const CameraTopBar = ({
  flash,
  recording,
  recordSeconds,
  selectedTrack,
  showMusicPanel,
  mode,
  timerRef,
  onClose,
  onToggleFlash,
  onToggleMusicPanel,
  onModeChange,
  onStopRecording,
}: CameraTopBarProps) => {
  return (
    <>
      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-5 pt-14 pb-4">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>

        {recording && (
          <div className="flex items-center gap-1.5 bg-[#fe2c55] px-3 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-sm font-bold font-mono">{formatTime(recordSeconds)}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFlash}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            <Icon
              name={flash ? "Zap" : "ZapOff"}
              size={18}
              className={flash ? "text-yellow-400" : "text-white"}
            />
          </button>
          <button
            onClick={onToggleMusicPanel}
            className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center border transition-all ${
              selectedTrack ? "bg-[#fe2c55]/80 border-[#fe2c55]" : "bg-black/40 border-transparent"
            }`}
          >
            <Icon name="Music" size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="relative z-20 flex justify-center gap-8 pb-2">
        {MODES.map((m) => (
          <button
            key={m}
            onClick={() => {
              onModeChange(m);
              onStopRecording();
              if (timerRef.current) clearInterval(timerRef.current);
            }}
            className={`text-sm font-semibold pb-1 transition-all ${
              mode === m ? "text-white border-b-2 border-white" : "text-white/40"
            }`}
          >
            {m}
          </button>
        ))}
      </div>
    </>
  );
};

export default CameraTopBar;
