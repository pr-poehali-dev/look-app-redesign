import { RefObject } from "react";
import Icon from "@/components/ui/icon";

const TRACKS = [
  { id: 1, title: "Roses Remix", artist: "Imanbek", duration: "2:34", color: "#fe2c55" },
  { id: 2, title: "Bangarang", artist: "Skrillex", duration: "3:12", color: "#8b5cf6" },
  { id: 3, title: "Blinding Lights", artist: "The Weeknd", duration: "3:20", color: "#f59e0b" },
  { id: 4, title: "Mood", artist: "24kGoldn", duration: "2:20", color: "#34d399" },
  { id: 5, title: "Stay", artist: "Kid LAROI", duration: "2:21", color: "#61d4f0" },
  { id: 6, title: "Levitating", artist: "Dua Lipa", duration: "3:23", color: "#ec4899" },
  { id: 7, title: "Heat Waves", artist: "Glass Animals", duration: "3:59", color: "#fb923c" },
  { id: 8, title: "Good 4 U", artist: "Olivia Rodrigo", duration: "2:58", color: "#a78bfa" },
];

interface CameraMusicPanelProps {
  showMusicPanel: boolean;
  selectedTrack: typeof TRACKS[0] | null;
  playingId: number | null;
  uploadedAudio: { name: string; url: string } | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onSelectTrack: (track: typeof TRACKS[0] | null) => void;
  onSetPlayingId: (id: number | null) => void;
  onRemoveTrack: () => void;
}

const CameraMusicPanel = ({
  showMusicPanel,
  selectedTrack,
  playingId,
  uploadedAudio,
  fileInputRef,
  onClose,
  onSelectTrack,
  onSetPlayingId,
  onRemoveTrack,
}: CameraMusicPanelProps) => {
  return (
    <>
      {/* Selected track ticker */}
      {(selectedTrack || uploadedAudio) && !showMusicPanel && (
        <div className="relative z-20 mx-4 mb-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/15 rounded-full px-4 py-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center animate-spin flex-shrink-0"
            style={{ background: selectedTrack ? selectedTrack.color : "#fe2c55", animationDuration: "3s" }}
          >
            <Icon name="Music" size={11} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium flex-1 truncate">
            {uploadedAudio ? uploadedAudio.name : `${selectedTrack!.title} — ${selectedTrack!.artist}`}
          </span>
          <button onClick={onRemoveTrack}>
            <Icon name="X" size={14} className="text-white/50" />
          </button>
        </div>
      )}

      {/* Music panel */}
      {showMusicPanel && (
        <div className="relative z-20 mx-2 mb-3 bg-black/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="text-white font-bold text-sm">Музыка для видео</span>
            <button onClick={onClose}>
              <Icon name="ChevronDown" size={20} className="text-white/60" />
            </button>
          </div>

          {/* Upload from device */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mx-3 mb-2 w-[calc(100%-24px)] flex items-center gap-3 bg-white/8 border border-dashed border-white/20 rounded-2xl px-4 py-3 hover:bg-white/12 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-[#fe2c55]/20 border border-[#fe2c55]/40 flex items-center justify-center flex-shrink-0">
              <Icon name="Upload" size={17} className="text-[#fe2c55]" />
            </div>
            <div className="text-left">
              <p className="text-white text-sm font-semibold">Загрузить с устройства</p>
              <p className="text-white/40 text-xs">mp3, wav, aac...</p>
            </div>
          </button>

          {/* Track list */}
          <div className="max-h-48 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
            {TRACKS.map((track) => {
              const isSelected = selectedTrack?.id === track.id;
              const isPlaying = playingId === track.id;
              return (
                <button
                  key={track.id}
                  onClick={() => {
                    onSelectTrack(isSelected ? null : track);
                    onSetPlayingId(isPlaying ? null : track.id);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 transition-all w-full ${isSelected ? "bg-white/10" : "hover:bg-white/5"}`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPlaying ? "animate-spin" : ""}`}
                    style={{ background: `${track.color}30`, border: `1px solid ${track.color}50`, animationDuration: "3s" }}
                  >
                    <Icon name={isPlaying ? "Music" : "Play"} size={16} style={{ color: track.color }} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{track.title}</p>
                    <p className="text-white/40 text-xs truncate">{track.artist}</p>
                  </div>
                  <span className="text-white/30 text-xs flex-shrink-0">{track.duration}</span>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0">
                      <Icon name="Check" size={11} className="text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};

export default CameraMusicPanel;
