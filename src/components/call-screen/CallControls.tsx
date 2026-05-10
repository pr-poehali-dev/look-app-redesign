import Icon from "@/components/ui/icon";

interface CallControlsProps {
  mode: "audio" | "video";
  muted: boolean;
  cameraOff: boolean;
  speakerOn: boolean;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => void;
  hangup: () => void;
}

const CallControls = ({
  mode,
  muted,
  cameraOff,
  speakerOn,
  toggleMute,
  toggleCamera,
  toggleSpeaker,
  switchCamera,
  hangup,
}: CallControlsProps) => {
  return (
    <div
      className="relative z-20 px-8"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
    >
      <div className="flex items-center justify-around mb-8">
        <button onClick={toggleMute} className="flex flex-col items-center gap-2">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white" : "bg-white/20"}`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={22} className={muted ? "text-black" : "text-white"} />
          </div>
          <span className="text-white/60 text-xs">{muted ? "Включить" : "Выключить"}</span>
        </button>

        {mode === "video" && (
          <button onClick={toggleCamera} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cameraOff ? "bg-white" : "bg-white/20"}`}>
              <Icon name={cameraOff ? "VideoOff" : "Video"} size={22} className={cameraOff ? "text-black" : "text-white"} />
            </div>
            <span className="text-white/60 text-xs">Видео</span>
          </button>
        )}

        <button onClick={toggleSpeaker} className="flex flex-col items-center gap-2">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${speakerOn ? "bg-white" : "bg-white/20"}`}>
            <Icon name={speakerOn ? "Volume2" : "VolumeX"} size={22} className={speakerOn ? "text-black" : "text-white"} />
          </div>
          <span className="text-white/60 text-xs">Динамик</span>
        </button>

        {mode === "video" ? (
          <button onClick={switchCamera} className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name="SwitchCamera" size={22} className="text-white" />
            </div>
            <span className="text-white/60 text-xs">Камера</span>
          </button>
        ) : (
          <button className="flex flex-col items-center gap-2 opacity-50">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name="MoreHorizontal" size={22} className="text-white" />
            </div>
            <span className="text-white/60 text-xs">Ещё</span>
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={hangup}
          className="w-16 h-16 rounded-full bg-[#fe2c55] flex items-center justify-center shadow-[0_0_30px_rgba(254,44,85,0.5)] hover:scale-110 active:scale-95 transition-all"
        >
          <Icon name="PhoneOff" size={26} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default CallControls;