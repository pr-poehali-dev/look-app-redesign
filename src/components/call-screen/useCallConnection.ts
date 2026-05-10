import { useState, useEffect, useRef } from "react";
import { RTC_CONFIG, getRtcConfig } from "@/lib/webrtc-config";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

export type CallStatus = "connecting" | "ringing" | "connected" | "ended";
export type CallQuality = "good" | "fair" | "poor" | "unknown";

interface UseCallConnectionParams {
  name: string;
  mode: "audio" | "video";
  myId: string;
  peerId: string;
  onEnd: () => void;
  isCaller?: boolean;
}

export const useCallConnection = ({ name, mode, myId, peerId, onEnd, isCaller: isCallerProp }: UseCallConnectionParams) => {
  const roomId = `call_${[myId, peerId].sort().join("_")}`;

  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(mode === "video");
  const [cameraOff, setCameraOff] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [quality, setQuality] = useState<CallQuality>("unknown");
  const [connectionWarning, setConnectionWarning] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
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
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteSetRef = useRef(false);

  const sendSignal = async (type: string, payload: unknown) => {
    try {
      await fetch(`${API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({ room_id: roomId, to_user: peerId, type, payload }),
      });
    } catch (e) { void e; }
  };

  const flushPendingIce = async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const cand of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.warn("[CallScreen] ICE add failed", e); }
    }
  };

  const handleSignal = async (pc: RTCPeerConnection, sig: { id: number; type: string; payload: unknown }) => {
    lastSigIdRef.current = sig.id;
    if (sig.type === "offer") {
      console.log("[CallScreen] got offer");
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
      remoteSetRef.current = true;
      await flushPendingIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await sendSignal("answer", answer);
    } else if (sig.type === "answer") {
      console.log("[CallScreen] got answer");
      await pc.setRemoteDescription(new RTCSessionDescription(sig.payload as RTCSessionDescriptionInit));
      remoteSetRef.current = true;
      await flushPendingIce(pc);
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
      const cand = sig.payload as RTCIceCandidateInit;
      if (!remoteSetRef.current) {
        pendingIceRef.current.push(cand);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.warn("[CallScreen] ICE add failed", e); }
      }
    } else if (sig.type === "end" || sig.type === "call_declined") {
      console.log("[CallScreen] received", sig.type, "— closing call");
      if (noAnswerTimerRef.current) { clearTimeout(noAnswerTimerRef.current); noAnswerTimerRef.current = null; }
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      try { pcRef.current?.close(); } catch (e) { void e; }
      try { localStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) { void e; }
      if (callIdRef.current) {
        const status = answeredRef.current ? "ended" : (sig.type === "call_declined" ? "declined" : "missed");
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
      setStatus("ended");
      onEnd();
    }
  };

  const startPoll = (pc: RTCPeerConnection) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${API}?module=signal&room_id=${roomId}&since_id=${lastSigIdRef.current}`,
          { headers: { "X-User-Id": myId } }
        );
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        for (const sig of data.signals || []) {
          await handleSignal(pc, sig);
        }
      } catch (e) { void e; }
    }, 1500);
  };

  useEffect(() => {
    let pc: RTCPeerConnection;

    const start = async () => {
      console.log("[CallScreen] start", { myId, peerId, roomId, isCaller: isCaller.current, mode });
      setStatus("connecting");

      // Сбрасываем «хвост» старых сигналов прошлых попыток звонка в этой же комнате,
      // иначе callee сразу получит end/call_declined от прошлого сеанса и звонок мгновенно закроется.
      try {
        const r = await fetch(
          `${API}?module=signal&room_id=${roomId}&since_id=0`,
          { headers: { "X-User-Id": myId } }
        );
        const raw = await r.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const sigs = data.signals || [];
        if (sigs.length > 0) {
          lastSigIdRef.current = Math.max(...sigs.map((s: { id: number }) => s.id));
          console.log("[CallScreen] skipped", sigs.length, "stale signals, since_id =", lastSigIdRef.current);
        }
      } catch (e) { void e; }

      const cfg = await getRtcConfig().catch(() => RTC_CONFIG);
      console.log("[CallScreen] iceServers count =", (cfg.iceServers || []).length);
      pc = new RTCPeerConnection(cfg);
      pcRef.current = pc;

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia_unsupported");
        }
        const isSecure = window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
        if (!isSecure) {
          throw new Error("insecure_context");
        }

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: mode === "video",
          });
        } catch (err) {
          if (mode === "video") {
            console.warn("[CallScreen] video+audio failed, fallback to audio-only", err);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          } else {
            throw err;
          }
        }
        localStreamRef.current = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream as MediaStream));
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        console.log("[CallScreen] getUserMedia ok", { tracks: stream.getTracks().length });
      } catch (e) {
        console.error("[CallScreen] getUserMedia FAILED", e);
        const err = e as Error;
        let msg = "";
        if (err.message === "insecure_context") {
          msg = "Звонки работают только по защищённому соединению (https). Открой сайт через https:// или с другого устройства.";
        } else if (err.message === "getUserMedia_unsupported") {
          msg = "Этот браузер не поддерживает звонки. Попробуй Chrome, Safari или Firefox.";
        } else if (err.name === "NotAllowedError" || err.name === "SecurityError") {
          msg = "Доступ к микрофону заблокирован. Открой настройки сайта в браузере и разреши микрофон" + (mode === "video" ? " и камеру." : ".");
        } else if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
          msg = mode === "video" ? "Не найдена камера или микрофон. Подключи устройство и попробуй снова." : "Микрофон не найден. Подключи микрофон и попробуй снова.";
        } else if (err.name === "NotReadableError" || err.name === "AbortError") {
          msg = "Микрофон или камера заняты другим приложением. Закрой их и попробуй снова.";
        } else {
          msg = mode === "video" ? "Нет доступа к камере или микрофону. Разреши доступ в настройках браузера." : "Нет доступа к микрофону. Разреши доступ в настройках браузера.";
        }
        alert(msg);
        setStatus("ended");
        onEnd();
        return;
      }

      pc.ontrack = (e) => {
        const remoteStream = e.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          const playPromise = remoteAudioRef.current.play();
          if (playPromise) playPromise.catch((err) => console.warn("[CallScreen] audio play failed", err));
        }
        setStatus("connected");
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) sendSignal("ice", e.candidate.toJSON());
      };

      pc.onconnectionstatechange = () => {
        console.log("[CallScreen] connectionState =", pc.connectionState);
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "failed") {
          if (isCaller.current) {
            try { (pc as RTCPeerConnection & { restartIce?: () => void }).restartIce?.(); } catch (e) { void e; }
            pc.createOffer({ iceRestart: true })
              .then((o) => pc.setLocalDescription(o).then(() => sendSignal("offer", o)))
              .catch(() => setStatus("ended"));
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[CallScreen] iceConnectionState =", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected") setQuality("poor");
        if (pc.iceConnectionState === "failed" && isCaller.current) {
          try { (pc as RTCPeerConnection & { restartIce?: () => void }).restartIce?.(); } catch (e) { void e; }
          pc.createOffer({ iceRestart: true })
            .then((o) => pc.setLocalDescription(o).then(() => sendSignal("offer", o)))
            .catch(() => {});
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("[CallScreen] iceGatheringState =", pc.iceGatheringState);
      };

      pc.onsignalingstatechange = () => {
        console.log("[CallScreen] signalingState =", pc.signalingState);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    setConnectionWarning(false);
    const t = setInterval(() => setSeconds((s) => { secondsRef.current = s + 1; return s + 1; }), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status === "connected" || status === "ended") return;
    const warnTimer = setTimeout(() => {
      if (status !== "connected") setConnectionWarning(true);
    }, 15000);
    return () => clearTimeout(warnTimer);
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

  const toggleSpeaker = () => setSpeakerOn((v) => !v);

  return {
    seconds,
    muted,
    speakerOn,
    cameraOff,
    status,
    quality,
    connectionWarning,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    hangup,
    switchCamera,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
  };
};