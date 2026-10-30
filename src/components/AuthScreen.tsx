import { useState } from "react";
import Icon from "@/components/ui/icon";
import { LegalScreen } from "@/components/SettingsScreen";
import { useAuth } from "@/context/AuthContext";
import GuideScreen from "@/components/profile/GuideScreen";

interface AuthScreenProps {
  initialMode?: "login" | "register";
  onBack?: () => void;
}

const AuthScreen = ({ initialMode = "login", onBack }: AuthScreenProps = {}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [showGuide, setShowGuide] = useState(false);
      const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
  const [age14, setAge14] = useState(false);
  const [age18, setAge18] = useState(false);
  const [consent, setConsent] = useState(false);
  const [legalDoc, setLegalDoc] = useState<"terms" | "privacy" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const handleForgot = async () => {
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    try {
      await fetch("https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          email: forgotEmail.trim(),
          origin: window.location.origin,
        }),
      });
    } catch {
      // молча
    }
    setForgotLoading(false);
    setForgotSent(true);
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    let err: string | null = null;
    if (mode === "login") {
      err = await login(email.trim(), password);
    } else {
      err = await register("", "", email.trim(), password, "", age18, consent);
    }
    if (err) setError(err);
    setLoading(false);
  };

  const emailRe = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const emailValid = emailRe.test(email.trim());
  const isValid = mode === "login"
    ? email.trim() && password
    : emailValid && password.length >= 6 && age14 && consent;

  if (showGuide) {
    return (
      <div className="fixed inset-0 bg-white z-50" style={{ maxWidth: 480, margin: "0 auto" }}>
        <GuideScreen onBack={() => setShowGuide(false)} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="min-h-full flex flex-col">
      {/* Logo area */}
      <div className={`flex flex-col items-center justify-center px-8 gap-2 ${mode === "register" ? "py-8" : "flex-1 py-10"}`}>
        <div
          className={`relative mb-2 ${onBack ? "cursor-pointer" : ""}`}
          onClick={onBack}
          role={onBack ? "button" : undefined}
        >
          <div className="absolute inset-0 rounded-2xl blur-2xl opacity-70 logo-glow-pulse" style={{ background: "radial-gradient(circle, #22e0a1 0%, #22d3ee 60%, transparent 100%)" }} />
          <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/15">
            <img loading="lazy" decoding="async"
              src="https://static.rustore.ru/imgproxy/vs3_tA6Fiyv_VxNKTcByf1sXvc4-Qy2G_VlA-uzDgTs/preset:web_app_icon_62/plain/https://static.rustore.ru/2025/9/16/49/apk/2063656157/content/ICON/586db88b-5139-4dc5-b8f4-5a7e07f892ba.png@webp"
              alt="Лоок"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <h1
          className={`font-black text-4xl slogan-shimmer ${onBack ? "cursor-pointer" : ""}`}
          onClick={onBack}
        >
          Лоок
        </h1>
        <p className="text-lg font-extrabold tracking-tight mt-1 slogan-shimmer">Смотри#Делись#Общайся#Будь собой</p>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-[0.98] transition-all text-white font-semibold text-sm backdrop-blur-sm"
        >
          <Icon name="BookOpen" size={16} />
          Инструкция
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-t-3xl px-6 pt-7 pb-12 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-1">
          <button
            onClick={() => { setMode("login"); setError(""); setEmail(""); setPassword(""); setShowPassword(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
          >Войти</button>
          <button
            onClick={() => { setMode("register"); setError(""); setEmail(""); setPassword(""); setAge14(false); setAge18(false); setConsent(false); setShowPassword(false); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
          >Регистрация</button>
        </div>

        {mode === "register" && (
          <>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={age14} onChange={e => { setAge14(e.target.checked); if (!e.target.checked) setAge18(false); }} className="mt-0.5 w-4 h-4 accent-[#fe2c55] flex-shrink-0" />
                <span className="text-xs text-gray-600 leading-snug">Мне есть 14 лет <span className="text-[#fe2c55]">*</span></span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={age18} disabled={!age14} onChange={e => setAge18(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#fe2c55] flex-shrink-0" />
                <span className="text-xs text-gray-600 leading-snug">Мне есть 18 лет (откроет контент 18+)</span>
              </label>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email <span className="text-[#fe2c55]">*</span></label>
          <input
            value={email}
            autoComplete="off"
            onChange={e => setEmail(e.target.value.replace(/\s/g, ""))}
            type="email"
            placeholder="example@mail.com"
            className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
          />
          {mode === "register" && email.length > 0 && !emailValid && (
            <p className="text-[11px] text-[#fe2c55]">Введите корректный email, например example@mail.com</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Пароль <span className="text-[#fe2c55]">*</span></label>
          <div className="flex items-center bg-gray-100 rounded-xl px-4">
            <input
              value={password}
              autoComplete="new-password"
              onChange={e => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder={mode === "register" ? "Минимум 6 символов" : "Пароль"}
              className="flex-1 py-3 bg-transparent text-black text-sm outline-none"
            />
            <button onClick={() => setShowPassword(s => !s)} className="ml-2 p-1 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={18} className="text-gray-400" />
            </button>
          </div>
          {mode === "login" && (
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotEmail(email); setForgotSent(false); }}
              className="self-end text-[#8b5cf6] text-xs font-semibold mt-1"
            >
              Забыли пароль?
            </button>
          )}
        </div>

        {mode === "register" && (
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={e => setConsent(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#fe2c55] flex-shrink-0"
            />
            <span className="text-xs text-gray-500 leading-snug">
              Принимаю{" "}
              <button type="button" onClick={() => setLegalDoc("terms")} className="text-[#8b5cf6] font-semibold">условия использования</button>
              {" "}и даю согласие на обработку персональных данных в соответствии с{" "}
              <button type="button" onClick={() => setLegalDoc("privacy")} className="text-[#8b5cf6] font-semibold">политикой конфиденциальности</button>
            </span>
          </label>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="auth-cta-btn w-full py-3.5 rounded-xl text-white font-bold text-base disabled:opacity-40 mt-1"
        >
          {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        {mode === "login" && (
          <>
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-gray-400 text-xs">или</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-qr-login"))}
              className="w-full py-3 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 hover:border-gray-300 hover:shadow-sm active:scale-[0.99] transition-all text-black font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name="QrCode" size={18} />
              Войти по QR-коду
            </button>
          </>
        )}

      </div>

      {legalDoc && (
        <div className="fixed inset-0 z-[9999] bg-gray-100">
          <LegalScreen
            onBack={() => setLegalDoc(null)}
            title={legalDoc === "terms" ? "Условия использования" : "Политика конфиденциальности"}
            settingKey={legalDoc === "terms" ? "terms_of_use" : "privacy_policy"}
            fallback={legalDoc === "terms" ? "Используя приложение Look, вы соглашаетесь с нашими условиями использования." : "Мы уважаем вашу конфиденциальность."}
          />
        </div>
      )}

      {showForgot && (
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center" onClick={() => setShowForgot(false)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-black font-bold text-lg">Восстановление пароля</h2>
              <button onClick={() => setShowForgot(false)} className="p-1">
                <Icon name="X" size={20} className="text-gray-400" />
              </button>
            </div>

            {!forgotSent ? (
              <>
                <p className="text-gray-500 text-sm">Введи email, на который мы отправим ссылку для восстановления пароля.</p>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                  <input
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    type="email"
                    placeholder="example@mail.com"
                    className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
                  />
                </div>
                <button
                  onClick={handleForgot}
                  disabled={!forgotEmail.trim() || forgotLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base disabled:opacity-40 transition-opacity"
                >
                  {forgotLoading ? "Отправка..." : "Отправить ссылку"}
                </button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                    <Icon name="MailCheck" size={28} className="text-green-600" />
                  </div>
                  <p className="text-black font-semibold text-base text-center">Письмо отправлено</p>
                  <p className="text-gray-500 text-sm text-center">
                    Если аккаунт с адресом <span className="font-semibold text-black">{forgotEmail}</span> существует, мы отправили ссылку для восстановления пароля.
                  </p>
                </div>
                <button
                  onClick={() => setShowForgot(false)}
                  className="w-full py-3.5 rounded-xl bg-gray-100 text-black font-bold text-base"
                >
                  Понятно
                </button>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AuthScreen;