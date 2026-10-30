import { useState, useEffect, lazy, Suspense } from "react";
import { useSwipeBack } from "@/hooks/useSwipeBack";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Landing from "@/components/Landing";
import AutoTranslator from "@/components/AutoTranslator";
import { fetchIceServers } from "@/lib/webrtc-config";
import OfflineBanner from "@/components/OfflineBanner";
import PullToRefresh from "@/components/PullToRefresh";
import VerifyEmailScreen from "@/components/app/VerifyEmailScreen";
import AuthenticatedApp from "@/components/app/AuthenticatedApp";
import InstallAppBanner from "@/components/InstallAppBanner";
import { useIncomingCall } from "@/components/app/useIncomingCall";
import { useNotifySound } from "@/components/app/useNotifySound";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/i18n";

const MediaDeepLink = lazy(() => import("@/components/MediaDeepLink"));
const ArticleDeepLink = lazy(() => import("@/components/profile/ArticleDeepLink"));
const Admin = lazy(() => import("@/pages/Admin"));
const AuthScreen = lazy(() => import("@/components/AuthScreen"));
const ResetPasswordScreen = lazy(() => import("@/components/ResetPasswordScreen"));
const QrLoginScreen = lazy(() => import("@/components/QrLoginScreen"));
const QrApproveScreen = lazy(() => import("@/components/QrApproveScreen"));

const ScreenFallback = () => (
  <div className="fixed inset-0 bg-black flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#22e0a1] animate-spin" />
  </div>
);

// Рендерится только в браузере (ClientOnly в маршрутах): вход хранится в localStorage.
const AppContent = () => {
  useSwipeBack();
  const { user, token, loading } = useAuth();

  useEffect(() => {
    if (!user?.id) return;
    fetchIceServers().catch(() => {});
    const t = setInterval(() => { fetchIceServers().catch(() => {}); }, 25 * 60 * 1000);
    return () => clearInterval(t);
  }, [user?.id]);
  const [resetToken, setResetToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("reset_token");
  });
  const [verifyToken, setVerifyToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("verify_token");
  });
  const [qrLoginCode, setQrLoginCode] = useState<string | null>(() => {
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

  const { incomingCall, activeCall, setActiveCall, acceptCall, declineCall } = useIncomingCall(user);
  useNotifySound(!!user);

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
    return <VerifyEmailScreen verifyState={verifyState} verifyError={verifyError} onClose={close} />;
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

  const isAdminRoute = window.location.pathname.startsWith("/Olesya_Pavel_Nastya");
  if (isAdminRoute) {
    return <Admin />;
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
          <InstallAppBanner />
        </>
      );
    }
    return <AuthScreen initialMode={authMode} onBack={() => setAuthMode("landing")} />;
  }

  return (
    <AuthenticatedApp
      user={user}
      token={token}
      activeCall={activeCall}
      incomingCall={incomingCall}
      onEndCall={() => setActiveCall(null)}
      onAccept={acceptCall}
      onDecline={declineCall}
    />
  );
};

const AppShell = () => (
  <ErrorBoundary>
    <AutoTranslator />
    <OfflineBanner />
    <PullToRefresh />
    <ThemeProvider>
      <AuthProvider>
        <Suspense fallback={<ScreenFallback />}>
          <AppContent />
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default AppShell;
