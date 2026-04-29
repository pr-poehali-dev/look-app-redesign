import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import { RTC_CONFIG } from "@/lib/webrtc-config";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface CallScreenProps {
  name: string;
  avatar: string;
  mode: "audio" | "video";
  myId: string;
  peerId: string;
  onEnd: () => void;
  isCaller?: boolean;
}

const CallScreen = ({ name, avatar, mode, myId, peerId, onEnd, isCaller: isCallerProp }: CallScreenProps) => {
  const roomId = `call_${[myId, peerId].sort().join("_")}`;

  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(mode === "video");
  const [cameraOff, setCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [quality, setQuality] = useState<"good" | "fair" | "poor" | "unknown">("unknown");

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSigIdRef = useRef(0);
  const isCaller = useRef(isCallerProp !== undefined ? isCallerProp : myId > peerId);
  const callIdRef = useRef<number | null>(null);
  const secondsRef = useRef(0);
  const answeredRef = useRef(false);
  const statsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPacketsLostRef = useRef(0);
  const prevPacketsRef = useRef(0);
  const noAnswerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendSignal = async (type: string, payload: unknown) => {
    try {
      await fetch(`${API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({ room_id: roomId, to_user: peerId, type, payload }),
      });
    } catch (e) { void e; }
  };

  const handleSignal = async (pc: RTCPeerConnection, sig: { id: number; type: string; payload: unknown }) => {
    lastSigIdRef.current = sig.id;
    if (sig.type === "offer") {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal("answer", answer);
      setStatus("connected");
    } else if (sig.type === "answer") {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
      setStatus("connected");
      answeredRef.current = true;
      if (noAnswerTimerRef.current) { clearTimeout(noAnswerTimerRef.current); noAnswerTimerRef.current = null; }
      if (callIdRef.current) {
        fetch(`${API}?module=calls`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": myId },
          body: JSON.stringify({ action: "answer", call_id: callIdRef.current }),
        }).catch(() => {});
      }
    } else if (sig.type === "ice") {
      try { await pc.addIceCandidate(new RTCIceCandidate(sig.payload as RTCIceCandidateInit)); } catch (e) { void e; }
    } else if (sig.type === "end" || sig.type === "call_declined") {
      hangup();
    }
  };

  const startPoll = (pc: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}?module=signal&room_id=${roomId}&since_id=${lastSigIdRef.current}`,
          { headers: { "X-User-Id": myId } }
        );
        const data = await res.json();
        for (const sig of data.signals || []) {
          await handleSignal(pc, sig);
        }
      } catch (e) { void e; }
    }, 1000);
  };

  useEffect(() => {
    let pc: RTCPeerConnection;

    const start = async () => {
      setStatus("connecting");
      pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });
        localStreamRef.current = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (e) { void e; }

      pc.ontrack = (e) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
        setStatus("connected");
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal("ice", e.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "failed") {
          if (isCaller.current) {
            pc.createOffer({ iceRestart: true })
              .then((o) => pc.setLocalDescription(o).then(() => sendSignal("offer", o)))
              .catch(() => setStatus("ended"));
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "disconnected") setQuality("poor");
        if (pc.iceConnectionState === "failed" && isCaller.current) {
          pc.createOffer({ iceRestart: true })
            .then((o) => pc.setLocalDescription(o).then(() => sendSignal("offer", o)))
            .catch(() => {});
        }
      };

      startPoll(pc);

      if (isCaller.current) {
        setStatus("ringing");
        try {
          const r = await fetch(`${API}?module=calls`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-User-Id": myId },
            body: JSON.stringify({ action: "start", callee_id: peerId, callee_name: name, mode, room_id: roomId }),
          });
          const d = await r.json();
          const data = typeof d.body === "string" ? JSON.parse(d.body) : d;
          if (data.call_id) callIdRef.current = data.call_id;
        } catch (e) { void e; }
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: mode === "video" });
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
        // Авто-сброс через 30 сек, если никто не ответил
        noAnswerTimerRef.current = setTimeout(() => {
          if (!answeredRef.current) {
            setStatus("ended");
            hangup();
          }
        }, 30000);
      }
    };

    start();

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (noAnswerTimerRef.current) clearTimeout(noAnswerTimerRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const t = setInterval(() => setSeconds((s) => { secondsRef.current = s + 1; return s + 1; }), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status !== "connected" || !pcRef.current) return;
    statsRef.current = setInterval(async () => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let lost = 0, total = 0, rtt = 0, hasInbound = false;
        stats.forEach((r) => {
          if (r.type === "inbound-rtp" && !r.isRemote) {
            lost += r.packetsLost || 0;
            total += (r.packetsReceived || 0) + (r.packetsLost || 0);
            hasInbound = true;
          }
          if (r.type === "candidate-pair" && r.state === "succeeded" && r.currentRoundTripTime) {
            rtt = r.currentRoundTripTime * 1000;
          }
        });
        if (!hasInbound) return;
        const deltaLost = lost - prevPacketsLostRef.current;
        const deltaTotal = total - prevPacketsRef.current;
        prevPacketsLostRef.current = lost;
        prevPacketsRef.current = total;
        const lossRate = deltaTotal > 0 ? deltaLost / deltaTotal : 0;
        if (lossRate > 0.1 || rtt > 400) setQuality("poor");
        else if (lossRate > 0.03 || rtt > 200) setQuality("fair");
        else setQuality("good");
      } catch (e) { void e; }
    }, 2000);
    return () => { if (statsRef.current) clearInterval(statsRef.current); };
  }, [status]);

  const hangup = () => {
    if (noAnswerTimerRef.current) { clearTimeout(noAnswerTimerRef.current); noAnswerTimerRef.current = null; }
    sendSignal("end", {});
    // Если разговор ещё не принят — также шлём call_cancel в "incoming"-комнату,
    // чтобы у вызываемого закрылся попап входящего вызова
    if (!answeredRef.current && isCaller.current) {
      fetch(`${API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({
          room_id: `incoming_${peerId}`,
          to_user: peerId,
          type: "call_cancel",
          payload: {},
        }),
      }).catch(() => {});
    }
    if (pollRef.current) clearInterval(pollRef.current);
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    if (callIdRef.current) {
      const status = answeredRef.current ? "ended" : "missed";
      fetch(`${API}?module=calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({
          action: "finish",
          call_id: callIdRef.current,
          status,
          duration_sec: secondsRef.current,
          answered: answeredRef.current,
        }),
      }).catch(() => {});
    }
    onEnd();
  };

  const switchCamera = async () => {
    if (mode !== "video" || !localStreamRef.current || !pcRef.current) return;
    const newFacing = facingMode === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: newFacing },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
      const oldVideo = localStreamRef.current.getVideoTracks()[0];
      if (oldVideo) {
        localStreamRef.current.removeTrack(oldVideo);
        oldVideo.stop();
      }
      localStreamRef.current.addTrack(newTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setFacingMode(newFacing);
    } catch (e) { void e; }
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted((v) => !v);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = cameraOff; });
    setCameraOff((v) => !v);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const statusLabel = {
    connecting: "Подключение...",
    ringing: "Вызов...",
    connected: formatTime(seconds),
    ended: "Завершено",
  }[status];

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Background */}
      <div className="absolute inset-0">
        {mode === "video" ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <img src={avatar} className="w-full h-full object-cover" alt="" />
        )}
        <div className={`absolute inset-0 ${mode === "video" ? "bg-black/40" : "bg-black/75 backdrop-blur-xl"}`} />
      </div>

      {/* Local video (picture-in-picture) */}
      {mode === "video" && !cameraOff && (
        <div className="absolute bottom-36 right-4 w-24 h-36 rounded-2xl overflow-hidden border-2 border-white/30 shadow-xl z-10">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
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
          {status === "connecting" || status === "ringing" ? (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.15s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: "0.3s" }} />
              <span className="ml-1">{statusLabel}</span>
            </span>
          ) : statusLabel}
        </p>
        <div className="mt-2 flex items-center gap-1 text-white/40 text-xs">
          <Icon name={mode === "video" ? "Video" : "Phone"} size={12} />
          <span>{mode === "video" ? "Видеозвонок" : "Аудиозвонок"}</span>
        </div>
        {status === "connected" && quality !== "unknown" && (
          <div className={`mt-2 flex items-center gap-1.5 text-xs ${
            quality === "good" ? "text-green-400" : quality === "fair" ? "text-yellow-400" : "text-red-400"
          }`}>
            <div className="flex items-end gap-0.5 h-3">
              <div className={`w-1 h-1 rounded-sm ${quality !== "unknown" ? "bg-current" : "bg-current/30"}`} />
              <div className={`w-1 h-2 rounded-sm ${quality === "fair" || quality === "good" ? "bg-current" : "bg-current/30"}`} />
              <div className={`w-1 h-3 rounded-sm ${quality === "good" ? "bg-current" : "bg-current/30"}`} />
            </div>
            <span>
              {quality === "good" ? "Хорошее соединение" : quality === "fair" ? "Среднее соединение" : "Слабое соединение"}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1" />

      {/* Controls */}
      <div className="relative z-20 pb-16 px-8">
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

          <button onClick={() => setSpeakerOn((v) => !v)} className="flex flex-col items-center gap-2">
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
    </div>
  );
};

export default CallScreen;