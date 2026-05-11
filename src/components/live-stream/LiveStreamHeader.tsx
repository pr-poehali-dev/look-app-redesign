import Icon from "@/components/ui/icon";

interface Props {
  isLive: boolean;
  viewers: number;
  seconds: number;
  flipping: boolean;
  formatTime: (s: number) => string;
  onFlip: () => void;
  onClose: () => void;
}

const LiveStreamHeader = ({ isLive, viewers, seconds, flipping, formatTime, onFlip, onClose }: Props) => {
  return (
    <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-3">
      <div className="flex items-center gap-2">
        {isLive && (
          <div className="flex items-center gap-1.5 bg-[#fe2c55] px-2.5 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
          </div>
        )}
        {isLive && (
          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <Icon name="Eye" size={12} className="text-white/70" />
            <span className="text-white text-xs font-semibold">{viewers.toLocaleString()}</span>
          </div>
        )}
        {isLive && (
          <div className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <span className="text-white/80 text-xs font-mono">{formatTime(seconds)}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onFlip} disabled={flipping}
          className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform">
          <Icon name="RefreshCw" size={16} className={`text-white ${flipping ? "animate-spin" : ""}`} />
        </button>
        <button onClick={onClose}
          className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <Icon name="X" size={18} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default LiveStreamHeader;
