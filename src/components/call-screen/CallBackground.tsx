import { RefObject, useState } from "react";

interface CallBackgroundProps {
  mode: "audio" | "video";
  avatar: string;
  cameraOff: boolean;
  remoteVideoRef: RefObject<HTMLVideoElement>;
  localVideoRef: RefObject<HTMLVideoElement>;
}

const CallBackground = ({ mode, avatar, cameraOff, remoteVideoRef, localVideoRef }: CallBackgroundProps) => {
  const [imgFailed, setImgFailed] = useState(false);
  return (
    <>
      <div className="absolute inset-0">
        {mode === "video" ? (
          <video ref={remoteVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        ) : avatar && !imgFailed ? (
          <img src={avatar} onError={() => setImgFailed(true)} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950" />
        )}
        <div className={`absolute inset-0 ${mode === "video" ? "bg-black/40" : "bg-black/75 backdrop-blur-xl"}`} />
      </div>

      {mode === "video" && !cameraOff && (
        <div className="absolute bottom-36 right-4 w-24 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-white text-[10px] bg-black/40 rounded px-1">Вы</span>
          </div>
        </div>
      )}
    </>
  );
};

export default CallBackground;