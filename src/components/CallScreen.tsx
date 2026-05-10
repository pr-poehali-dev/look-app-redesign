import { useCallConnection } from "./call-screen/useCallConnection";
import CallBackground from "./call-screen/CallBackground";
import CallHeader from "./call-screen/CallHeader";
import CallControls from "./call-screen/CallControls";

interface CallScreenProps {
  name: string;
  avatar: string;
  mode: "audio" | "video";
  myId: string;
  peerId: string;
  onEnd: () => void;
  isCaller?: boolean;
}

const CallScreen = ({ name, avatar, mode, myId, peerId, onEnd, isCaller }: CallScreenProps) => {
  const {
    seconds,
    muted,
    speakerOn,
    cameraOff,
    status,
    quality,
    connectionWarning,
    endReason,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    hangup,
    switchCamera,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useCallConnection({ name, mode, myId, peerId, onEnd, isCaller });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        maxWidth: 480,
        margin: "0 auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <CallBackground
        mode={mode}
        avatar={avatar}
        cameraOff={cameraOff}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
      />

      <CallHeader
        name={name}
        avatar={avatar}
        mode={mode}
        status={status}
        quality={quality}
        connectionWarning={connectionWarning}
        seconds={seconds}
      />

      <div className="flex-1 flex items-center justify-center px-6">
        {endReason && (
          <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
            <p className="text-white/90 text-sm text-center">{endReason}</p>
          </div>
        )}
      </div>

      <CallControls
        mode={mode}
        muted={muted}
        cameraOff={cameraOff}
        speakerOn={speakerOn}
        toggleMute={toggleMute}
        toggleCamera={toggleCamera}
        toggleSpeaker={toggleSpeaker}
        switchCamera={switchCamera}
        hangup={hangup}
      />
    </div>
  );
};

export default CallScreen;