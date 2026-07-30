import { useEffect, useRef, useState } from "react";
import { useCallConnection } from "./call-screen/useCallConnection";
import CallBackground from "./call-screen/CallBackground";
import CallHeader from "./call-screen/CallHeader";
import CallControls from "./call-screen/CallControls";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useAuth } from "@/context/AuthContext";

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

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
    diagText,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    hangup,
    switchCamera,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  } = useCallConnection({ name, mode, myId, peerId, onEnd, isCaller });

  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAddCall, setShowAddCall] = useState(false);
  const [callSearch, setCallSearch] = useState("");
  const [callUsers, setCallUsers] = useState<{ id: string; name: string; avatar: string; handle: string; phone: string }[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteToast, setInviteToast] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (!showAddCall || !user) return;
    fetch(`${CHAT_API}?module=chat&action=all_users`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        setCallUsers(data.users || []);
      })
      .catch(() => setCallUsers([]));
  }, [showAddCall, user]);

  const inviteToCall = async (u: { id: string; name: string }) => {
    if (!user || inviting) return;
    setInviting(u.id);
    const roomId = `call_${[myId, peerId].sort().join("_")}`;
    try {
      await fetch(`${CHAT_API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({
          room_id: `incoming_${u.id}`,
          to_user: u.id,
          type: "call_invite",
          payload: { callerId: user.id, callerName: user.name, mode, roomId },
        }),
      });
      setInviteToast(`Приглашение отправлено: ${u.name}`);
    } catch {
      setInviteToast("Не удалось пригласить");
    } finally {
      setInviting(null);
      setTimeout(() => setInviteToast(""), 2500);
    }
  };

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (mode === "video") {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
    }
  };

  useEffect(() => {
    if (mode !== "video") {
      setControlsVisible(true);
      return;
    }
    showControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [mode]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{
        maxWidth: 480,
        margin: "0 auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      onClick={showControls}
      onTouchStart={showControls}
    >
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <CallBackground
        mode={mode}
        avatar={avatar}
        cameraOff={cameraOff}
        remoteVideoRef={remoteVideoRef}
        localVideoRef={localVideoRef}
      />

      <div className={`transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <CallHeader
          name={name}
          avatar={avatar}
          mode={mode}
          status={status}
          quality={quality}
          connectionWarning={connectionWarning}
          seconds={seconds}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
        {endReason && (
          <div className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
            <p className="text-white/90 text-sm text-center">{endReason}</p>
          </div>
        )}
        {diagText && status !== "connected" && (
          <div className="max-w-[340px] px-4 py-3 rounded-2xl bg-black/70 backdrop-blur-sm border border-yellow-500/30">
            <p className="text-yellow-300/90 text-xs text-center whitespace-pre-line leading-relaxed">{diagText}</p>
          </div>
        )}
      </div>

      <div className={`absolute top-20 right-4 z-30 transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowAddCall(true); }}
          className="w-11 h-11 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center"
          title="Добавить участника"
        >
          <Icon name="UserPlus" size={18} className="text-white" />
        </button>
      </div>

      <div className={`transition-opacity duration-300 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
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

      {showAddCall && (() => {
        const q = callSearch.trim().toLowerCase();
        const qDigits = q.replace(/\D/g, "");
        const filtered = callUsers.filter(u => {
          if (u.id === myId || u.id === peerId) return false;
          if (!q) return true;
          if (u.name.toLowerCase().includes(q)) return true;
          if (u.handle && u.handle.toLowerCase().includes(q.replace(/^@/, ""))) return true;
          if (qDigits.length >= 3 && u.phone && u.phone.replace(/\D/g, "").includes(qDigits)) return true;
          return false;
        });
        return (
          <div
            className="absolute inset-0 z-40 bg-black/80 flex items-end justify-center"
            onClick={(e) => { e.stopPropagation(); setShowAddCall(false); }}
          >
            <div
              className="bg-[#1a1a1a] w-full max-h-[80vh] rounded-t-3xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-lg">Добавить участника</span>
                  <button onClick={() => setShowAddCall(false)}>
                    <Icon name="X" size={22} className="text-white/60" />
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                  <Icon name="Search" size={16} className="text-white/40" />
                  <input
                    value={callSearch}
                    onChange={(e) => setCallSearch(e.target.value)}
                    placeholder="Имя, @ник или номер"
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-6" style={{ scrollbarWidth: "none" }}>
                {filtered.length === 0 ? (
                  <div className="text-center text-white/40 text-sm py-8">Никого не нашли</div>
                ) : (
                  filtered.map(u => (
                    <button
                      key={u.id}
                      onClick={() => inviteToCall(u)}
                      disabled={inviting === u.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{u.name}</p>
                        <p className="text-white/40 text-xs truncate">{u.handle ? `@${u.handle}` : (u.phone || "")}</p>
                      </div>
                      {inviting === u.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="PhoneCall" size={16} className="text-green-400" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {inviteToast && (
        <div className="absolute left-1/2 -translate-x-1/2 top-32 z-50 bg-black/90 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl">
          {inviteToast}
        </div>
      )}
    </div>
  );
};

export default CallScreen;