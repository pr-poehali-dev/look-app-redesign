import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { UserMediaProvider } from "./context/UserMediaContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UnreadProvider } from "./context/UnreadContext";
import AuthScreen from "./components/AuthScreen";
import ResetPasswordScreen from "./components/ResetPasswordScreen";
import CallScreen from "./components/CallScreen";
import Icon from "@/components/ui/icon";

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface IncomingCall {
  callerId: string;
  callerName: string;
  mode: "audio" | "video";
  roomId: string;
  sigId: number;
}

const queryClient = new QueryClient();

const AppContent = () => {
  const { user, token, loading } = useAuth();
  const [resetToken, setResetToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token");
  });
  const [verifyToken, setVerifyToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("verify_token");
  });
  const [verifyState, setVerifyState] = useState<"loading" | "ok" | "error">("loading");
  const [verifyError, setVerifyError] = useState<string>("");

  useEffect(() => {
    if (!verifyToken) return;
    fetch("https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify_email", token: verifyToken }),
    })
      .then(r => r.json())
      .then(data => {
        const d = typeof data.body === "string" ? JSON.parse(data.body) : data;
        if (d.verified) {
          setVerifyState("ok");
          if (d.email) localStorage.setItem(`email_verified:${d.email.toLowerCase()}`, "1");
        }
        else { setVerifyState("error"); setVerifyError(d.error || "Ссылка недействительна"); }
      })
      .catch(() => { setVerifyState("error"); setVerifyError("Ошибка сети"); });
  }, [verifyToken]);
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
    pollRef.current = setInterval(async () => {
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
    }, 3000);
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
    setActiveCall(incomingCall);
    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall || !user) return;
    if (autoTimeoutRef.current) { clearTimeout(autoTimeoutRef.current); autoTimeoutRef.current = null; }
    stopRingtone();
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

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
          <span className="text-white font-black text-xl">L</span>
        </div>
      </div>
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onDone={() => {
          setResetToken(null);
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  if (verifyToken) {
    const close = () => {
      setVerifyToken(null);
      window.history.replaceState({}, "", window.location.pathname);
    };
    return (
      <div className="fixed inset-0 bg-black flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 gap-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center mb-2">
            <Icon name="MailCheck" size={28} className="text-white" />
          </div>
          <h1 className="text-white font-black text-3xl">Подтверждение email</h1>
        </div>
        <div className="bg-white rounded-t-3xl px-6 pt-7 pb-10 flex flex-col gap-4">
          {verifyState === "loading" ? (
            <p className="text-gray-500 text-center py-6">Проверяем ссылку...</p>
          ) : verifyState === "ok" ? (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <Icon name="CheckCircle2" size={28} className="text-green-600" />
                </div>
                <p className="text-black font-semibold text-base text-center">Email подтверждён</p>
                <p className="text-gray-500 text-sm text-center">Спасибо! Теперь твой аккаунт защищён.</p>
              </div>
              <button onClick={close} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base">Продолжить</button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <Icon name="AlertCircle" size={28} className="text-red-600" />
                </div>
                <p className="text-black font-semibold text-base text-center">Ссылка не работает</p>
                <p className="text-gray-500 text-sm text-center">{verifyError}</p>
              </div>
              <button onClick={close} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base">Закрыть</button>
            </>
          )}
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <UserMediaProvider userId={user.id} token={token}>
      <UnreadProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      {activeCall && (
        <div className="fixed inset-0 z-[10000]">
          <CallScreen
            name={activeCall.callerName}
            avatar=""
            mode={activeCall.mode}
            myId={user.id}
            peerId={activeCall.callerId}
            isCaller={false}
            onEnd={() => setActiveCall(null)}
          />
        </div>
      )}

      {incomingCall && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 64px)" }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-sm bg-zinc-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
            <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#fe2c55]/50 to-[#8b5cf6]/50 border-2 border-white/10 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">
                  {incomingCall.callerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-lg">{incomingCall.callerName}</p>
                <p className="text-white/50 text-sm mt-0.5 flex items-center justify-center gap-1.5">
                  <Icon name={incomingCall.mode === "video" ? "Video" : "Phone"} size={14} />
                  Входящий {incomingCall.mode === "video" ? "видео" : "аудио"}звонок
                </p>
              </div>
              <div className="flex items-center gap-6 mt-2">
                <button
                  onClick={declineCall}
                  className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <Icon name="PhoneOff" size={26} className="text-white" />
                </button>
                <button
                  onClick={acceptCall}
                  className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                >
                  <Icon name={incomingCall.mode === "video" ? "Video" : "Phone"} size={26} className="text-white" />
                </button>
              </div>
              <div className="flex gap-12 -mt-2">
                <span className="text-white/30 text-xs">Отклонить</span>
                <span className="text-white/30 text-xs">Принять</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </UnreadProvider>
    </UserMediaProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;