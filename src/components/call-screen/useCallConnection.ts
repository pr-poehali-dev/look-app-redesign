import { useState, useEffect, useRef } from "react";
import { RTC_CONFIG, getRtcConfig } from "@/lib/webrtc-config";
import { HQ_AUDIO_CONSTRAINTS, applyAudioTrackTuning, boostOpusInSdp, tuneAudioSenders, unlockMobileAudio, tuneRemoteAudioElement } from "@/lib/audioConstraints";

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
  const [endReason, setEndReason] = useState<string>("");
  const [diagText, setDiagText] = useState<string>("");

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
  const processedSigIdsRef = useRef<Set<number>>(new Set());
  const lastIceRestartAtRef = useRef(0);
  const endedRef = useRef(false);
  const lastRemoteSdpRef = useRef<string>("");
  const sessionStartAtRef = useRef<number>(0);
  const sessionFromUserRef = useRef<string>("");
  const offerAppliedRef = useRef<boolean>(false);
  const answerAppliedRef = useRef<boolean>(false);
  const pendingFreshOffersRef = useRef<{ id: number; type: string; payload: unknown }[]>([]);
  const forceRelayRef = useRef<(() => void) | null>(null);
  const applyRelayOnlyRef = useRef<((initiate: boolean) => void) | null>(null);
  const relayForcedRef = useRef<boolean>(false);
  const audioCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceOutboxRef = useRef<RTCIceCandidateInit[]>([]);
  const iceFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendSignal = async (type: string, payload: unknown) => {
    if (endedRef.current && type !== "end") return;
    try {
      const res = await fetch(`${API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({ room_id: roomId, to_user: peerId, type, payload }),
      });
      console.log("[CallScreen] sendSignal", type, "to=", peerId, "status=", res.status);
      if (!res.ok && (type === "offer" || type === "answer")) {
        for (let i = 0; i < 3; i++) {
          await new Promise((r) => setTimeout(r, 500));
          try {
            const r2 = await fetch(`${API}?module=signal`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-User-Id": myId },
              body: JSON.stringify({ room_id: roomId, to_user: peerId, type, payload }),
            });
            console.log("[CallScreen] sendSignal RETRY", type, "attempt", i + 1, "status=", r2.status);
            if (r2.ok) break;
          } catch (e) { void e; }
        }
      }
    } catch (e) { console.warn("[CallScreen] sendSignal error", type, e); }
  };

  const flushIceOutbox = async () => {
    if (iceFlushTimerRef.current) {
      clearTimeout(iceFlushTimerRef.current);
      iceFlushTimerRef.current = null;
    }
    if (iceOutboxRef.current.length === 0) return;
    const batch = iceOutboxRef.current;
    iceOutboxRef.current = [];
    if (endedRef.current) return;
    try {
      await fetch(`${API}?module=signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": myId },
        body: JSON.stringify({
          room_id: roomId,
          to_user: peerId,
          type: "ice_batch",
          payload: batch,
        }),
      });
    } catch (e) { void e; }
  };

  const queueIce = (candidate: RTCIceCandidateInit) => {
    iceOutboxRef.current.push(candidate);
    if (iceFlushTimerRef.current) return;
    iceFlushTimerRef.current = setTimeout(() => { flushIceOutbox(); }, 300);
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
    if (processedSigIdsRef.current.has(sig.id)) return;
    processedSigIdsRef.current.add(sig.id);
    if (endedRef.current || pc.signalingState === "closed") return;
    if (sig.type === "offer") {
      if (offerAppliedRef.current) {
        console.log("[CallScreen] skip offer — already applied in this session");
        return;
      }
      const offerDesc = sig.payload as RTCSessionDescriptionInit;
      const sdp = offerDesc?.sdp || "";
      if (pc.signalingState !== "stable" && pc.signalingState !== "have-remote-offer") {
        console.log("[CallScreen] skip offer in state", pc.signalingState);
        return;
      }
      console.log("[CallScreen] got offer, sdpLen=", sdp.length);
      offerAppliedRef.current = true;
      lastRemoteSdpRef.current = sdp;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offerDesc));
        remoteSetRef.current = true;
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        if (answer.sdp) answer.sdp = boostOpusInSdp(answer.sdp);
        await pc.setLocalDescription(answer);
        await tuneAudioSenders(pc);
        console.log("[CallScreen] sending answer");
        await sendSignal("answer", answer);
      } catch (err) {
        console.error("[CallScreen] offer handling failed", err);
        offerAppliedRef.current = false;
        lastRemoteSdpRef.current = "";
      }
    } else if (sig.type === "answer") {
      if (answerAppliedRef.current) {
        console.log("[CallScreen] skip answer — already applied");
        return;
      }
      if (pc.signalingState !== "have-local-offer") {
        console.log("[CallScreen] skip duplicate answer in state", pc.signalingState);
        return;
      }
      console.log("[CallScreen] got answer");
      answerAppliedRef.current = true;
      try {
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
      } catch (err) {
        console.error("[CallScreen] answer handling failed", err);
        answerAppliedRef.current = false;
      }
    } else if (sig.type === "force_relay") {
      console.log("[CallScreen] peer requested relay-only");
      applyRelayOnlyRef.current?.(false);
    } else if (sig.type === "ice") {
      if (pc.signalingState === "closed") return;
      const cand = sig.payload as RTCIceCandidateInit;
      if (!remoteSetRef.current) {
        pendingIceRef.current.push(cand);
      } else {
        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.warn("[CallScreen] ICE add failed", e); }
      }
    } else if (sig.type === "ice_batch") {
      if (pc.signalingState === "closed") return;
      const cands = (sig.payload as RTCIceCandidateInit[]) || [];
      for (const cand of cands) {
        if (!remoteSetRef.current) {
          pendingIceRef.current.push(cand);
        } else {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) { console.warn("[CallScreen] ICE add failed", e); }
        }
      }
    } else if (sig.type === "end" || sig.type === "call_declined") {
      if (endedRef.current) return;
      const sigAny = sig as { from_user?: string };
      const fromUser = sigAny.from_user || "?";
      const ageMs = Date.now() - sessionStartAtRef.current;
      console.log("[CallScreen] received", sig.type, "from", fromUser, "ageMs=", ageMs, "myId=", myId, "peerId=", peerId);
      if (fromUser === myId) {
        console.log("[CallScreen] ignoring own", sig.type, "echo");
        return;
      }
      if (ageMs < 2000) {
        console.log("[CallScreen] ignoring early", sig.type, "(stale from previous session)");
        return;
      }
      endedRef.current = true;
      console.log("[CallScreen] closing call due to", sig.type);
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
      let reason = "";
      if (sig.type === "call_declined") reason = "Собеседник отклонил звонок";
      else if (!answeredRef.current) reason = "Собеседник не ответил";
      else reason = "Собеседник завершил звонок";
      setEndReason(reason);
      setStatus("ended");
      setTimeout(() => onEnd(), 1500);
    }
  };

  const startPoll = (pc: RTCPeerConnection) => {
    const pollOnce = async () => {
      let pageCount = 0;
      while (pageCount < 10) {
        pageCount++;
        const res = await fetch(
          `${API}?module=signal&room_id=${roomId}&since_id=${lastSigIdRef.current}`,
          { headers: { "X-User-Id": myId } }
        );
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const sigs = data.signals || [];
        if (sigs.length === 0) break;
        const types = sigs.map((s: { type: string; from_user?: string }) => `${s.type}<-${s.from_user || "?"}`).join(",");
        console.log("[CallScreen] poll got", sigs.length, "signals:", types, "since=", lastSigIdRef.current);
        for (const sig of sigs) {
          await handleSignal(pc, sig);
        }
        if (sigs.length < 50) break;
      }
    };
    pollRef.current = setInterval(() => {
      pollOnce().catch((e) => console.warn("[CallScreen] poll error", e));
    }, 1500);
  };

  useEffect(() => {
    let pc: RTCPeerConnection;

    const start = async () => {
      sessionStartAtRef.current = Date.now();
      sessionFromUserRef.current = "";
      offerAppliedRef.current = false;
      answerAppliedRef.current = false;
      relayForcedRef.current = false;
      iceOutboxRef.current = [];
      console.log("[CallScreen] start", { myId, peerId, roomId, isCaller: isCaller.current, mode });
      setStatus("connecting");

      // Сбрасываем «хвост» старых сигналов прошлых попыток звонка в этой же комнате,
      // иначе callee сразу получит end/call_declined от прошлого сеанса и звонок мгновенно закроется.
      // Также помечаем все ID как обработанные, чтобы даже если пришли заново — игнор.
      try {
        // Быстрая очистка stale-сигналов: тянем максимум 8 страниц по 50 = 400 шт.
        // Если в комнате накопилось больше — игнорируем, polling догребёт.
        let totalSkipped = 0;
        // Свежий offer, который уже лежит в комнате к моменту принятия входящего,
        // НЕЛЬЗЯ выкидывать как stale — иначе callee не создаст answer и ICE не стартует.
        const freshOffers: { id: number; type: string; payload: unknown }[] = [];
        for (let i = 0; i < 8; i++) {
          const r = await fetch(
            `${API}?module=signal&room_id=${roomId}&since_id=${lastSigIdRef.current}&max_age_seconds=600`,
            { headers: { "X-User-Id": myId } }
          );
          const raw = await r.json();
          const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
          const sigs = data.signals || [];
          if (sigs.length === 0) break;
          let maxId = lastSigIdRef.current;
          for (const s of sigs as { id: number; type: string; payload: unknown }[]) {
            // offer оставляем на обработку — берём только самый свежий
            if (s.type === "offer" && !isCaller.current) {
              freshOffers.push(s);
            } else {
              processedSigIdsRef.current.add(s.id);
            }
            if (s.id > maxId) maxId = s.id;
          }
          lastSigIdRef.current = maxId;
          totalSkipped += sigs.length;
          if (sigs.length < 50) break;
        }
        console.log("[CallScreen] cleared", totalSkipped, "stale signals, kept", freshOffers.length, "offers, since_id =", lastSigIdRef.current);
        pendingFreshOffersRef.current = freshOffers;
      } catch (e) { void e; }

      const cfg = await getRtcConfig().catch(() => RTC_CONFIG);
      console.log("[CallScreen] iceServers count =", (cfg.iceServers || []).length);
      pc = new RTCPeerConnection(cfg);
      pcRef.current = pc;

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("getUserMedia_unsupported");
        }
        // В Android WebView приложение может открывать https-сайт, но isSecureContext
        // иногда возвращает false — доверяем известным доменам и file:// (WebView)
        const trustedHosts = ["localhost", "127.0.0.1", "look.com.ru", "www.look.com.ru"];
        const isSecure =
          window.isSecureContext ||
          location.protocol === "file:" ||
          trustedHosts.includes(location.hostname) ||
          location.hostname.endsWith(".look.com.ru");
        if (!isSecure) {
          throw new Error("insecure_context");
        }

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: HQ_AUDIO_CONSTRAINTS,
            video: mode === "video" ? { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } : false,
          });
        } catch (err) {
          const e = err as Error;
          console.warn("[CallScreen] getUserMedia attempt 1 failed", e.name, e.message);
          // Попытка 2: простые constraints (помогает на Android WebView)
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: mode === "video",
            });
          } catch (err2) {
            const e2 = err2 as Error;
            console.warn("[CallScreen] getUserMedia attempt 2 failed", e2.name, e2.message);
            if (mode === "video") {
              // Попытка 3: только аудио
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } else {
              throw err2;
            }
          }
        }
        applyAudioTrackTuning(stream);
        unlockMobileAudio();
        localStreamRef.current = stream;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream as MediaStream));
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
          localVideoRef.current.playsInline = true;
          localVideoRef.current.play().catch((err) => console.warn("[CallScreen] local video play blocked", err));
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
          msg = "Нет доступа к микрофону" + (mode === "video" ? " или камере" : "") + ". В настройках приложения разреши доступ к микрофону" + (mode === "video" ? " и камере" : "") + ", затем попробуй снова.";
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
          // Видео-элемент только для картинки. Звук всегда воспроизводится через <audio>,
          // иначе получается двойное проигрывание и микрофон ловит эхо.
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = true;
          remoteVideoRef.current.volume = 0;
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          tuneRemoteAudioElement(remoteAudioRef.current);
          unlockMobileAudio();
          const playPromise = remoteAudioRef.current.play();
          if (playPromise) playPromise.catch((err) => console.warn("[CallScreen] audio play failed", err));
        }
        setStatus("connected");
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          const c = e.candidate;
          console.log("[CallScreen] local ICE", c.type, c.protocol, c.address || c.candidate?.split(" ")[4], "via", c.relatedAddress || "-");
          queueIce(c.toJSON());
        } else {
          console.log("[CallScreen] ICE gathering done");
          flushIceOutbox();
        }
      };

      const tryIceRestart = () => {
        const now = Date.now();
        if (now - lastIceRestartAtRef.current < 5000) return;
        lastIceRestartAtRef.current = now;
        try { (pc as RTCPeerConnection & { restartIce?: () => void }).restartIce?.(); } catch (e) { void e; }
        pc.createOffer({ iceRestart: true })
          .then((o) => pc.setLocalDescription(o).then(() => sendSignal("offer", o)))
          .catch(() => {});
      };

      // Форсируем relay-only: медиа пойдёт строго через TURN (в т.ч. TCP/TLS 5349),
      // минуя проблемные прямые/UDP-пары. Применяется на обеих сторонах.
      const applyRelayOnly = async (initiate: boolean) => {
        if (relayForcedRef.current) return;
        relayForcedRef.current = true;
        try {
          const relayCfg = await getRtcConfig(true);
          (pc as RTCPeerConnection & { setConfiguration?: (c: RTCConfiguration) => void }).setConfiguration?.(relayCfg);
          console.log("[CallScreen] switched to relay-only");
        } catch (e) { console.warn("[CallScreen] setConfiguration relay failed", e); }
        if (initiate && isRestartLeader) {
          lastIceRestartAtRef.current = Date.now();
          try { (pc as RTCPeerConnection & { restartIce?: () => void }).restartIce?.(); } catch (e) { void e; }
          try {
            const o = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(o);
            await sendSignal("offer", o);
          } catch (e) { console.warn("[CallScreen] relay offer failed", e); }
        }
      };
      forceRelayRef.current = () => {
        // Сообщаем второй стороне тоже переключиться, затем инициируем сами
        sendSignal("force_relay", {});
        applyRelayOnly(true);
      };
      applyRelayOnlyRef.current = applyRelayOnly;

      // Инициатор ICE-restart — сторона с большим id (детерминированно, чтобы
      // обе стороны не рестартовали одновременно и не ломали SDP).
      const isRestartLeader = myId > peerId;

      pc.onconnectionstatechange = () => {
        console.log("[CallScreen] connectionState =", pc.connectionState);
        if (pc.connectionState === "connected") setStatus("connected");
        if (pc.connectionState === "failed" && isRestartLeader) tryIceRestart();
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[CallScreen] iceConnectionState =", pc.iceConnectionState);
        if (pc.iceConnectionState === "disconnected") setQuality("poor");
        if ((pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") && isRestartLeader) tryIceRestart();
      };

      pc.onicegatheringstatechange = () => {
        console.log("[CallScreen] iceGatheringState =", pc.iceGatheringState);
      };

      pc.onsignalingstatechange = () => {
        console.log("[CallScreen] signalingState =", pc.signalingState);
      };

      startPoll(pc);

      // Обрабатываем offer, который уже лежал в комнате к моменту принятия входящего
      // (иначе он был бы выкинут как stale и answer не создался бы).
      if (!isCaller.current && pendingFreshOffersRef.current.length > 0) {
        const offers = pendingFreshOffersRef.current;
        pendingFreshOffersRef.current = [];
        const latest = offers[offers.length - 1];
        console.log("[CallScreen] applying buffered offer id=", latest.id);
        await handleSignal(pc, latest);
      }

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
        if (offer.sdp) offer.sdp = boostOpusInSdp(offer.sdp);
        await pc.setLocalDescription(offer);
        await tuneAudioSenders(pc);
        await sendSignal("offer", offer);
        // Resend offer aggressively if no answer — callee might still be clearing stale signals
        const resendOffer = async () => {
          if (answeredRef.current || endedRef.current) return;
          try {
            const desc = pc.localDescription;
            if (desc) {
              console.log("[CallScreen] resending offer (no answer yet)");
              await sendSignal("offer", { type: desc.type, sdp: desc.sdp });
            }
          } catch (e) { console.warn("[CallScreen] resend offer failed", e); }
        };
        setTimeout(resendOffer, 2000);
        setTimeout(resendOffer, 5000);
        setTimeout(resendOffer, 9000);
        setTimeout(resendOffer, 14000);
        noAnswerTimerRef.current = setTimeout(() => {
          if (!answeredRef.current) {
            setEndReason("Собеседник не отвечает");
            setStatus("ended");
            hangup();
          }
        }, 30000);
      }
    };

    start();

    return () => {
      endedRef.current = true;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      if (noAnswerTimerRef.current) clearTimeout(noAnswerTimerRef.current);
      if (iceFlushTimerRef.current) { clearTimeout(iceFlushTimerRef.current); iceFlushTimerRef.current = null; }
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
    const warnTimer = setTimeout(async () => {
      if (status !== "connected") {
        setConnectionWarning(true);
        // Диагностика: какие ICE-кандидаты собрались, какая пара выбрана
        const pc = pcRef.current;
        if (pc) {
          try {
            const stats = await pc.getStats();
            const local: string[] = [];
            const remote: string[] = [];
            const pairs: string[] = [];
            stats.forEach((r) => {
              if (r.type === "local-candidate") local.push(`${r.candidateType}/${r.protocol}/${r.address || r.ip || "?"}`);
              if (r.type === "remote-candidate") remote.push(`${r.candidateType}/${r.protocol}/${r.address || r.ip || "?"}`);
              if (r.type === "candidate-pair") pairs.push(`pair state=${r.state} nominated=${r.nominated} bytes=${r.bytesSent || 0}/${r.bytesReceived || 0}`);
            });
            console.error("[CallScreen] DIAGNOSTIC TIMEOUT", {
              connectionState: pc.connectionState,
              iceConnectionState: pc.iceConnectionState,
              iceGatheringState: pc.iceGatheringState,
              signalingState: pc.signalingState,
              local,
              remote,
              pairs,
            });
            const myRelay = local.filter((c) => c.startsWith("relay")).length;
            const myTotal = local.length;
            const peerRelay = remote.filter((c) => c.startsWith("relay")).length;
            const peerCands = remote.length;
            const nominated = pairs.some((p) => p.includes("nominated=true"));
            const anyBytes = pairs.some((p) => !p.includes("bytes=0/0"));
            let summary = "";
            if (myTotal === 0) {
              summary = "Не удалось получить сеть (ICE-кандидаты не собрались). Проверь интернет/микрофон.";
            } else if (myRelay === 0) {
              summary = "TURN не выдал relay-адрес — проблема в ключе TURN (turn.look.com.ru).";
            } else if (peerCands === 0) {
              summary = "Собеседник не прислал свои адреса — сигналинг не доставил данные второй стороне.";
            } else if (peerRelay === 0) {
              summary = "У собеседника нет TURN-relay: у него TURN не сработал (старый кеш или другой ключ). Обнови приложение с обеих сторон.";
            } else if (!nominated || !anyBytes) {
              summary = "У обеих сторон relay есть, но звук через него не идёт → на TURN-сервере закрыт диапазон UDP-портов для медиа (min-port–max-port). Нужно открыть их в фаерволе.";
            } else {
              summary = "Соединение установлено — если звука нет, проверь громкость/микрофон.";
            }
            setDiagText(
              `Диагностика связи:\n` +
              `• мои адреса: ${myTotal} (из них TURN-relay: ${myRelay})\n` +
              `• адреса собеседника: ${peerCands}\n` +
              `• соединение выбрано: ${nominated ? "да" : "нет"}\n` +
              `• состояние: ${pc.iceConnectionState}\n\n` +
              summary,
            );
          } catch (e) { console.error("[CallScreen] diag failed", e); }
        }
      }
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

  // Детектор "соединено, но звука нет": через 8 сек после connected проверяем,
  // реально ли приходят аудио-байты и через какой тип пары идёт связь.
  useEffect(() => {
    if (status !== "connected") return;
    let attempts = 0;
    const runCheck = async () => {
      attempts += 1;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        const stats = await pc.getStats();
        let audioBytes = 0;
        let audioSent = 0;
        let pairType = "?";
        let pairProto = "?";
        let pairBytes = 0;
        const local: Record<string, { type: string; proto: string }> = {};
        let myRelay = 0, myLocal = 0, peerRelay = 0, peerCands = 0;
        const pairs: { r: RTCStatsReport extends infer T ? Record<string, unknown> : never }[] = [];
        stats.forEach((r) => {
          if (r.type === "local-candidate") {
            local[r.id] = { type: r.candidateType, proto: r.protocol };
            myLocal += 1;
            if (r.candidateType === "relay") myRelay += 1;
          }
          if (r.type === "remote-candidate") {
            peerCands += 1;
            if (r.candidateType === "relay") peerRelay += 1;
          }
          if (r.type === "inbound-rtp" && (r.kind === "audio" || r.mediaType === "audio")) {
            audioBytes += r.bytesReceived || 0;
          }
          if (r.type === "outbound-rtp" && (r.kind === "audio" || r.mediaType === "audio")) {
            audioSent += r.bytesSent || 0;
          }
        });
        // Ищем выбранную пару: сначала nominated+succeeded, потом просто с трафиком
        let best: Record<string, unknown> | null = null;
        stats.forEach((r) => {
          if (r.type !== "candidate-pair") return;
          const rec = r as unknown as Record<string, unknown>;
          pairs.push({ r: rec as never });
          const nominated = rec.nominated === true;
          const succeeded = rec.state === "succeeded";
          const hasBytes = ((rec.bytesReceived as number) || 0) + ((rec.bytesSent as number) || 0) > 0;
          if ((nominated && succeeded) || (!best && (succeeded || hasBytes))) best = rec;
        });
        if (best) {
          const b = best as Record<string, unknown>;
          const lc = local[b.localCandidateId as string];
          if (lc) { pairType = lc.type; pairProto = lc.proto; }
          pairBytes = ((b.bytesReceived as number) || 0);
        }
        console.error("[CallScreen] AUDIO CHECK", { attempts, audioBytes, audioSent, pairType, pairProto, pairBytes, pairsCount: pairs.length });
        if (audioBytes > 0) {
          // Звук пошёл — прячем возможную диагностику и останавливаем проверки
          setDiagText("");
          if (audioCheckRef.current) { clearInterval(audioCheckRef.current); audioCheckRef.current = null; }
          return;
        }
        if (audioBytes === 0 && !relayForcedRef.current && myRelay > 0 && peerRelay > 0 && pairs.length > 0) {
          // Форсируем relay ТОЛЬКО если relay реально собрался у обеих сторон и
          // пары уже строятся — иначе setConfiguration только сломает рабочие кандидаты.
          console.log("[CallScreen] no audio but relay available — forcing relay-only");
          forceRelayRef.current?.();
          return;
        }
        if (audioBytes === 0 && attempts >= 3) {
          let cause = "";
          if (myLocal === 0) {
            cause = "Твой браузер не собрал НИ одного сетевого адреса → нет доступа к микрофону или заблокирован WebRTC. Проверь разрешение микрофона в замке адресной строки.";
          } else if (myRelay === 0) {
            cause = "У тебя нет TURN-relay адресов → TURN-сервер не отвечает по нужному транспорту (ключ/порты 3478-5349). Проверка на стороне сервера.";
          } else if (peerCands === 0) {
            cause = "Собеседник не прислал свои адреса → у него не собрались кандидаты (нет микрофона/заблокирован WebRTC на его стороне).";
          } else if (peerRelay === 0) {
            cause = "У собеседника нет TURN-relay → у него TURN не сработал. Пусть проверит разрешение микрофона и обновит страницу.";
          } else if (pairs.length === 0) {
            cause = "Relay есть у обоих, но пары не строятся → на TURN-сервере закрыт диапазон UDP-портов медиа (min-port–max-port). Нужно открыть на сервере.";
          } else {
            cause = "Relay-пары есть, но байты не идут → медиа-порты сервера режутся фаерволом.";
          }
          setDiagText(
            `Звук не проходит. Диагностика:\n` +
            `• мои адреса: ${myLocal} (relay: ${myRelay})\n` +
            `• адреса собеседника: ${peerCands} (relay: ${peerRelay})\n` +
            `• отправлено аудио: ${audioSent} б\n` +
            `• пар связи: ${pairs.length}, канал: ${pairType}/${pairProto}\n\n` +
            cause,
          );
        }
      } catch (e) { console.error("[CallScreen] audio check failed", e); }
    };
    const first = setTimeout(() => {
      runCheck();
      audioCheckRef.current = setInterval(runCheck, 6000);
    }, 6000);
    return () => {
      clearTimeout(first);
      if (audioCheckRef.current) { clearInterval(audioCheckRef.current); audioCheckRef.current = null; }
    };
  }, [status]);

  const hangup = () => {
    if (endedRef.current) { onEnd(); return; }
    endedRef.current = true;
    const ageMs = Date.now() - sessionStartAtRef.current;
    console.log("[CallScreen] hangup() called", {
      isCaller: isCaller.current,
      answered: answeredRef.current,
      ageMs,
      myId,
      peerId,
      callerStack: new Error().stack?.split("\n").slice(1, 4).join(" | "),
    });
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

    // КРИТИЧНО: на iOS/Android вторая камера занята пока активен трек первой.
    // Останавливаем старый видеотрек ДО запроса нового.
    const oldVideo = localStreamRef.current.getVideoTracks()[0];
    if (oldVideo) {
      localStreamRef.current.removeTrack(oldVideo);
      oldVideo.stop();
    }

    let newStream: MediaStream | null = null;

    // Способ 1: facingMode (мобильные)
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { exact: newFacing } },
      });
    } catch (e) {
      console.warn("[CallScreen] switchCamera facingMode exact failed", e);
    }

    // Способ 2: ideal facingMode (мягче)
    if (!newStream) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: newFacing } },
        });
      } catch (e) {
        console.warn("[CallScreen] switchCamera facingMode ideal failed", e);
      }
    }

    // Способ 3: перебор по списку устройств (для ПК и нестандартных мобильных)
    if (!newStream) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        const oldId = oldVideo?.getSettings().deviceId || "";
        const other = cams.find((c) => c.deviceId && c.deviceId !== oldId);
        if (other) {
          newStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { deviceId: { exact: other.deviceId } },
          });
        }
      } catch (e) {
        console.warn("[CallScreen] switchCamera by deviceId failed", e);
      }
    }

    // Если ничего не сработало — пытаемся восстановить прежнюю камеру
    if (!newStream) {
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facingMode } },
        });
      } catch (e) {
        console.error("[CallScreen] restore camera failed", e);
        return;
      }
    }

    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) return;

    try {
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
    } catch (e) {
      console.warn("[CallScreen] replaceTrack failed", e);
    }

    localStreamRef.current.addTrack(newTrack);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }

    const settings = newTrack.getSettings() as MediaTrackSettings & { facingMode?: string };
    if (settings.facingMode === "user" || settings.facingMode === "environment") {
      setFacingMode(settings.facingMode);
    } else {
      setFacingMode(newFacing);
    }
  };

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = muted; });
    setMuted((v) => !v);
  };

  const toggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = cameraOff; });
    setCameraOff((v) => !v);
  };

  const toggleSpeaker = async () => {
    const next = !speakerOn;
    setSpeakerOn(next);
    const audioEl = remoteAudioRef.current;
    const videoEl = remoteVideoRef.current;
    try {
      if (audioEl) {
        audioEl.volume = next ? 1 : 0.45;
        const anyEl = audioEl as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> };
        if (typeof anyEl.setSinkId === "function") {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outs = devices.filter((d) => d.kind === "audiooutput");
            const speaker = outs.find((d) => /speaker|speakerphone|default/i.test(d.label)) || outs[0];
            const earpiece = outs.find((d) => /earpiece|receiver|handset|internal|телефон/i.test(d.label));
            const target = next ? speaker : (earpiece || speaker);
            if (target) await anyEl.setSinkId(target.deviceId).catch(() => {});
          } catch (e) { void e; }
        }
      }
      if (videoEl) videoEl.volume = next ? 1 : 0.45;
    } catch (e) { void e; }
  };

  return {
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
  };
};