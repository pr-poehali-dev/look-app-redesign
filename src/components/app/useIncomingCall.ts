import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

export interface IncomingCall {
  callerId: string;
  callerName: string;
  mode: "audio" | "video";
  roomId: string;
  sigId: number;
}

type AuthUser = ReturnType<typeof useAuth>["user"];

export const useIncomingCall = (user: AuthUser) => {
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
  const lastSigRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const ringtoneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allCtxRef = useRef<AudioContext[]>([]);
  const handledRoomsRef = useRef<Set<string>>(new Set());

  const playRingtone = () => {
    // Гарантированно глушим всё, что играло до этого
    stopRingtone();
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      allCtxRef.current.push(ctx);
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(ctx.destination);
      masterGainRef.current = masterGain;
      oscillatorsRef.current = [];

      const playNote = (freq: number, start: number, duration: number, volume = 0.25) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.type = "triangle";
        filter.type = "lowpass";
        filter.frequency.value = 2000;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.02);
        gain.gain.linearRampToValueAtTime(volume * 0.7, start + duration * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.start(start);
        osc.stop(start + duration);
        oscillatorsRef.current.push(osc);
      };

      const playMelody = () => {
        const now = ctx.currentTime;
        playNote(659.25, now + 0.0, 0.18);
        playNote(880.0, now + 0.2, 0.18);
        playNote(659.25, now + 0.5, 0.18);
        playNote(880.0, now + 0.7, 0.18);
        playNote(987.77, now + 1.0, 0.35);
      };

      playMelody();
      ringtoneRef.current = setInterval(playMelody, 2200);
    } catch (e) { void e; }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) { clearInterval(ringtoneRef.current); ringtoneRef.current = null; }
    // Самое надёжное — суспендим И закрываем КАЖДЫЙ когда-либо созданный AudioContext.
    // suspend() мгновенно глушит ВСЕ запланированные на будущее осцилляторы,
    // а close() освобождает ресурсы.
    for (const ctx of allCtxRef.current) {
      try { ctx.suspend().catch(() => {}); } catch (e) { void e; }
      try { ctx.close().catch(() => {}); } catch (e) { void e; }
    }
    for (const osc of oscillatorsRef.current) {
      try { osc.stop(0); } catch (e) { void e; }
      try { osc.disconnect(); } catch (e) { void e; }
    }
    oscillatorsRef.current = [];
    masterGainRef.current = null;
    audioCtxRef.current = null;
    allCtxRef.current = [];
    if ("vibrate" in navigator) {
      try { navigator.vibrate(0); } catch (e) { void e; }
    }
  };

  const vibrate = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }
  };

  const autoMissCall = (call: IncomingCall) => {
    if (!user) return;
    stopRingtone();
    fetch(`${CHAT_API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({
        room_id: call.roomId,
        to_user: call.callerId,
        type: "call_declined",
        payload: { reason: "timeout" },
      }),
    }).catch(() => {});
    setIncomingCall(null);
  };

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const room = params.get("accept_call");
    if (room) {
      handledRoomsRef.current.add(room);
      stopRingtone();
      setIncomingCall(null);
      setActiveCall({
        callerId: params.get("cid") || "",
        callerName: params.get("cname") || "",
        mode: params.get("cmode") === "video" ? "video" : "audio",
        roomId: room,
        sigId: 0,
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
    const onMsg = (ev: MessageEvent) => {
      const m = ev.data;
      if (m && m.type === "accept_call" && m.call) {
        if (m.call.roomId) handledRoomsRef.current.add(m.call.roomId);
        stopRingtone();
        setIncomingCall(null);
        setActiveCall({
          callerId: m.call.callerId,
          callerName: m.call.callerName,
          mode: m.call.mode === "video" ? "video" : "audio",
          roomId: m.call.roomId,
          sigId: 0,
        });
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    pollRef.current = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(
          `${CHAT_API}?module=signal&room_id=incoming_${user.id}&since_id=${lastSigRef.current}&max_age_seconds=30`,
          { headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) } }
        );
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        for (const sig of data.signals || []) {
          lastSigRef.current = sig.id;
          if (sig.type === "call_invite" && sig.payload) {
            if (handledRoomsRef.current.has(sig.payload.roomId)) continue;
            playRingtone();
            vibrate();
            const call: IncomingCall = {
              callerId: sig.payload.callerId,
              callerName: sig.payload.callerName,
              mode: sig.payload.mode,
              roomId: sig.payload.roomId,
              sigId: sig.id,
            };
            setIncomingCall(call);
            if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
            autoTimeoutRef.current = setTimeout(() => autoMissCall(call), 30000);
          } else if (sig.type === "call_cancel") {
            stopRingtone();
            if (autoTimeoutRef.current) { clearTimeout(autoTimeoutRef.current); autoTimeoutRef.current = null; }
            setIncomingCall(null);
          }
        }
      } catch (e) { void e; }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (autoTimeoutRef.current) clearTimeout(autoTimeoutRef.current);
      stopRingtone();
    };
  }, [user]);

  const acceptCall = () => {
    if (!incomingCall) return;
    if (autoTimeoutRef.current) { clearTimeout(autoTimeoutRef.current); autoTimeoutRef.current = null; }
    stopRingtone();
    handledRoomsRef.current.add(incomingCall.roomId);
    setActiveCall(incomingCall);
    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall || !user) return;
    if (autoTimeoutRef.current) { clearTimeout(autoTimeoutRef.current); autoTimeoutRef.current = null; }
    stopRingtone();
    handledRoomsRef.current.add(incomingCall.roomId);
    // Шлём в комнату самого звонка, чтобы CallScreen звонящего получил сигнал и закрылся
    await fetch(`${CHAT_API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({
        room_id: incomingCall.roomId,
        to_user: incomingCall.callerId,
        type: "call_declined",
        payload: {},
      }),
    }).catch(() => {});
    setIncomingCall(null);
  };

  return { incomingCall, activeCall, setActiveCall, acceptCall, declineCall };
};
