import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";

interface VideoFullscreenPlayerProps {
  playerUrl: string;
  onClose: () => void;
}

const VideoFullscreenPlayer = ({ playerUrl, onClose }: VideoFullscreenPlayerProps) => {
  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col">
      {/* Верхняя панель с кнопкой Назад */}
      <div className="flex items-center gap-3 px-4 pt-10 pb-3 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Назад"
        >
          <Icon name="ChevronLeft" size={24} className="text-white" />
        </button>
        <span className="text-white font-semibold text-sm">Назад в Лоок</span>
      </div>
      {/* Сам плеер */}
      <div className="flex-1 flex items-center justify-center px-2">
        <video
          src={playerUrl}
          controls
          autoPlay
          playsInline
          className="max-w-full max-h-full rounded-lg"
        />
      </div>
    </div>,
    document.body
  );
};

export default VideoFullscreenPlayer;
