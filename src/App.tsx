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
import AuthScreen from "./components/AuthScreen";
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
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
  const lastSigRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringtoneRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playRingtone = () => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      let beat = 0;
      ringtoneRef.current = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(beat % 2 === 0 ? 880 : 660, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
        beat++;
      }, 600);
    } catch (e) { void e; }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) { clearInterval(ringtoneRef.current); ringtoneRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  };

  const vibrate = () => {
    if ("vibrate" in navigator) {
      navigator.vibrate([400, 200, 400, 200, 400]);
    }
  };

  useEffect(() => {
    if (!user) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(
          `${CHAT_API}?module=signal&room_id=incoming_${user.id}&since_id=${lastSigRef.current}`,
          { headers: { "X-User-Id": user.id, "X-User-Name": user.name } }
        );
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        for (const sig of data.signals || []) {
          lastSigRef.current = sig.id;
          if (sig.type === "call_invite" && sig.payload) {
            playRingtone();
            vibrate();
            setIncomingCall({
              callerId: sig.payload.callerId,
              callerName: sig.payload.callerName,
              mode: sig.payload.mode,
              roomId: sig.payload.roomId,
              sigId: sig.id,
            });
          } else if (sig.type === "call_cancel") {
            stopRingtone();
            setIncomingCall(null);
          }
        }
      } catch (e) { void e; }
    }, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      stopRingtone();
    };
  }, [user]);

  const acceptCall = () => {
    if (!incomingCall) return;
    stopRingtone();
    setActiveCall(incomingCall);
    setIncomingCall(null);
  };

  const declineCall = async () => {
    if (!incomingCall || !user) return;
    stopRingtone();
    await fetch(`${CHAT_API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({
        room_id: `incoming_${incomingCall.callerId}`,
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

  if (!user) return <AuthScreen />;

  if (activeCall) return (
    <CallScreen
      name={activeCall.callerName}
      avatar=""
      mode={activeCall.mode}
      myId={user.id}
      peerId={activeCall.callerId}
      onEnd={() => setActiveCall(null)}
    />
  );

  return (
    <UserMediaProvider userId={user.id} token={token}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      {incomingCall && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-16 px-4">
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