import { Toaster } from "@/components/ui/toaster";
import { notifyIncomingCall } from "@/lib/nativeBridge";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import NotFound from "./pages/NotFound";
import { UserMediaProvider } from "./context/UserMediaContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { UnreadProvider } from "./context/UnreadContext";
import { ThemeProvider } from "./context/ThemeContext";
import Landing from "./components/Landing";
import AutoTranslator from "./components/AutoTranslator";
import Icon from "@/components/ui/icon";
import OfflineBanner from "@/components/OfflineBanner";

const Index = lazy(() => import("./pages/Index"));
import AgeGate from "./components/AgeGate";
const MediaDeepLink = lazy(() => import("./components/MediaDeepLink"));
const ArticleDeepLink = lazy(() => import("./components/profile/ArticleDeepLink"));
const Admin = lazy(() => import("./pages/Admin"));
const AuthScreen = lazy(() => import("./components/AuthScreen"));
const ResetPasswordScreen = lazy(() => import("./components/ResetPasswordScreen"));
const QrLoginScreen = lazy(() => import("./components/QrLoginScreen"));
const QrApproveScreen = lazy(() => import("./components/QrApproveScreen"));
const ThumbnailWorker = lazy(() => import("./components/ThumbnailWorker"));

const ScreenFallback = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#22e0a1] animate-spin" />
  </div>
);

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
      networkMode: "offlineFirst",
      staleTime: 30000,
      refetchOnReconnect: true,
    },
  },
});

const AppContent = () => {
  useSwipeBack();
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
  const [qrLoginCode, setQrLoginCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    return params.get("qr_login");
  });
  const [showQrLogin, setShowQrLogin] = useState(false);

  useEffect(() => {
    // Маркер успешного монтирования React — для фолбэка на старых ТВ-браузерах
    const root = document.getElementById("root");
    if (root) root.setAttribute("data-app-mounted", "1");
    const fb = document.getElementById("fallback-msg");
    if (fb) fb.style.display = "none";
  }, []);

  useEffect(() => {
    const onOpen = () => setShowQrLogin(true);
    const onApprove = (e: Event) => {
      const detail = (e as CustomEvent).detail as { code?: string } | null;
      if (detail?.code) setQrLoginCode(detail.code);
    };
    window.addEventListener("open-qr-login", onOpen);
    window.addEventListener("qr-login-approve", onApprove);
    return () => {
      window.removeEventListener("open-qr-login", onOpen);
      window.removeEventListener("qr-login-approve", onApprove);
    };
  }, []);
  const [verifyState, setVerifyState] = useState<"loading" | "ok" | "error">("loading");
  const [verifyError, setVerifyError] = useState<string>("");
  const [authMode, setAuthMode] = useState<"landing" | "login" | "register">("landing");
  useEffect(() => {
    const onOpenAuth = (e: Event) => setAuthMode(((e as CustomEvent).detail?.mode) || "login");
    window.addEventListener("open-auth", onOpenAuth);
    return () => window.removeEventListener("open-auth", onOpenAuth);
  }, []);

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
  const lastSigRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
            notifyIncomingCall({ callerName: sig.payload.callerName, isVideo: sig.payload.mode === "video", callId: sig.payload.roomId });
          }
        }
      } catch (e) { void e; }
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
          <img loading="lazy" decoding="async"
            src="https://static.rustore.ru/imgproxy/vs3_tA6Fiyv_VxNKTcByf1sXvc4-Qy2G_VlA-uzDgTs/preset:web_app_icon_62/plain/https://static.rustore.ru/2025/9/16/49/apk/2063656157/content/ICON/586db88b-5139-4dc5-b8f4-5a7e07f892ba.png@webp"
            alt="Look"
            className="w-full h-full object-cover"
          />
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

  if (qrLoginCode) {
    return (
      <QrApproveScreen
        code={qrLoginCode}
        onDone={() => {
          setQrLoginCode(null);
          window.history.replaceState({}, "", window.location.pathname);
        }}
      />
    );
  }

  if (showQrLogin && !user) {
    return <QrLoginScreen onBack={() => setShowQrLogin(false)} />;
  }

  const isAdminRoute = typeof window !== "undefined" && window.location.pathname.startsWith("/Olesya_Pavel_Nastya");
  if (isAdminRoute) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/Olesya_Pavel_Nastya" element={<Admin />} />
          <Route path="/Olesya_Pavel_Nastya/*" element={<Admin />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (!user) {
    if (authMode === "landing") {
      return (
        <>
          <Landing
            onLogin={() => setAuthMode("login")}
            onRegister={() => setAuthMode("register")}
          />
          <ArticleDeepLink /><MediaDeepLink />
        </>
      );
    }
    return <AuthScreen initialMode={authMode} onBack={() => setAuthMode("landing")} />;
  }

  return (
    <UserMediaProvider userId={user.id} token={token}>
      <UnreadProvider>
      <ThumbnailWorker />
      <AgeGate />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<><Index /><ArticleDeepLink /><MediaDeepLink /></>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>

      </UnreadProvider>
    </UserMediaProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AutoTranslator />
      <OfflineBanner />
      <ThemeProvider>
        <AuthProvider>
          <Suspense fallback={<ScreenFallback />}>
            <AppContent />
          </Suspense>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;