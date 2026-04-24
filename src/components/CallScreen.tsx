import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface CallScreenProps {
  name: string;
  avatar: string;
  mode: "audio" | "video";
  onEnd: () => void;
}

const CallScreen = ({ name, avatar, mode, onEnd }: CallScreenProps) => {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(mode === "video");
  const [cameraOff, setCameraOff] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnected(true), 1800);
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [connected]);

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Background */}
      <div className="absolute inset-0">
        <img src={avatar} className="w-full h-full object-cover" alt="" />
        <div className={`absolute inset-0 ${mode === "video" ? "bg-black/40" : "bg-black/75 backdrop-blur-xl"}`} />
      </div>

      {/* Remote video area (video mode) */}
      {mode === "video" && !cameraOff && (
        <div className="absolute bottom-36 right-4 w-24 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-10">
          <img src="https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg"
            className="w-full h-full object-cover" alt="camera" />
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-white text-[10px] bg-black/40 rounded px-1">Вы</span>
          </div>
        </div>
      )}

      {/* Top info */}
      <div className="relative z-20 flex flex-col items-center pt-20 pb-6">
        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl mb-4">
          <img src={avatar} className="w-full h-full object-cover" alt={name} />
        </div>
        <h2 className="text-white font-bold text-2xl mb-1">{name}</h2>
        <p className="text-white/60 text-sm">
          {connected ? formatTime(seconds) : (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
              <span className="ml-1">Соединение...</span>
            </span>
          )}
        </p>
        <div className="mt-2 flex items-center gap-1 text-white/40 text-xs">
          <Icon name={mode === "video" ? "Video" : "Phone"} size={12} />
          <span>{mode === "video" ? "Видеозвонок" : "Аудиозвонок"}</span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Controls */}
      <div className="relative z-20 pb-16 px-8">
        <div className="flex items-center justify-around mb-8">
          <button
            onClick={() => setMuted((v) => !v)}
            className={`flex flex-col items-center gap-2`}
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${muted ? "bg-white" : "bg-white/20"}`}>
              <Icon name={muted ? "MicOff" : "Mic"} size={22} className={muted ? "text-black" : "text-white"} />
            </div>
            <span className="text-white/60 text-xs">{muted ? "Включить" : "Выключить"}</span>
          </button>

          {mode === "video" && (
            <button onClick={() => setCameraOff((v) => !v)} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${cameraOff ? "bg-white" : "bg-white/20"}`}>
                <Icon name={cameraOff ? "VideoOff" : "Video"} size={22} className={cameraOff ? "text-black" : "text-white"} />
              </div>
              <span className="text-white/60 text-xs">Камера</span>
            </button>
          )}

          <button onClick={() => setSpeakerOn((v) => !v)} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${speakerOn ? "bg-white" : "bg-white/20"}`}>
              <Icon name={speakerOn ? "Volume2" : "VolumeX"} size={22} className={speakerOn ? "text-black" : "text-white"} />
            </div>
            <span className="text-white/60 text-xs">Динамик</span>
          </button>

          <button className="flex flex-col items-center gap-2">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Icon name="MoreHorizontal" size={22} className="text-white" />
            </div>
            <span className="text-white/60 text-xs">Ещё</span>
          </button>
        </div>

        {/* End call */}
        <div className="flex justify-center">
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-[#fe2c55] flex items-center justify-center shadow-[0_0_30px_rgba(254,44,85,0.5)] hover:scale-110 active:scale-95 transition-all"
          >
            <Icon name="PhoneOff" size={26} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallScreen;
