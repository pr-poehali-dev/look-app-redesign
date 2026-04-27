import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const OTP_REQUEST_URL = "https://functions.poehali.dev/37ce1591-438c-4426-870f-1031b2c57d22";
const OTP_VERIFY_URL = "https://functions.poehali.dev/b9c5bff7-0a7d-43c6-9e65-4d6365a68447";

interface Props {
  initialEmail?: string;
  onClose: () => void;
}

const parseBody = (raw: unknown): Record<string, unknown> => {
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  if (raw && typeof (raw as { body?: unknown }).body === "string") {
    try { return JSON.parse((raw as { body: string }).body); } catch { return {}; }
  }
  return raw as Record<string, unknown>;
};

const LegacyLoginDialog = ({ initialEmail = "", onClose }: Props) => {
  const { loginWithSession } = useAuth();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const requestCode = async () => {
    setError("");
    setInfo("");
    if (!email.trim() || !email.includes("@")) {
      setError("Укажи корректный email");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(OTP_REQUEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = parseBody(await r.json());
      if (r.status === 429) {
        setError((data.message as string) || "Слишком много попыток. Попробуй позже.");
        return;
      }
      if (data.error) {
        setError((data.message as string) || "Не удалось отправить код.");
        return;
      }
      setStep("code");
      if (data.sent === false) {
        setInfo("Если такой email был зарегистрирован — код придёт на почту.");
      } else {
        setInfo("Код отправлен на почту. Проверь входящие и спам.");
      }
    } catch (e) {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    if (code.length !== 6) {
      setError("Код состоит из 6 цифр");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(OTP_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
      });
      const data = parseBody(await r.json());
      if (data.error) {
        setError((data.message as string) || "Не удалось войти.");
        return;
      }
      const u = data.user as { id: string; name: string; handle: string; email: string; avatar: string | null; token: string };
      if (!u || !u.token) {
        setError("Не получилось получить сессию.");
        return;
      }
      loginWithSession(
        { id: u.id, name: u.name, handle: u.handle, email: u.email, avatar: u.avatar },
        u.token,
      );
      onClose();
    } catch (e) {
      setError("Ошибка сети. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-8 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-black font-bold text-lg">Старый аккаунт short-video</h2>
          <button onClick={onClose} className="p-1">
            <Icon name="X" size={20} className="text-gray-400" />
          </button>
        </div>

        {step === "email" ? (
          <>
            <p className="text-gray-500 text-sm">
              Был аккаунт в short-video? Введи email — мы отправим код подтверждения и восстановим твой профиль с подписками, видео и лайками.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoFocus
                placeholder="example@mail.com"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
                <span className="text-red-600 text-xs">{error}</span>
              </div>
            )}
            <button
              onClick={requestCode}
              disabled={!email.trim() || loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base disabled:opacity-40"
            >
              {loading ? "Отправка..." : "Получить код"}
            </button>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-sm">
              Введи 6-значный код из письма на <span className="text-black font-semibold">{email}</span>
            </p>
            {info && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <Icon name="Mail" size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                <span className="text-blue-700 text-xs">{info}</span>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Код</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                type="text"
                inputMode="numeric"
                autoFocus
                placeholder="• • • • • •"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-2xl tracking-[0.5em] text-center font-bold outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
                <span className="text-red-600 text-xs">{error}</span>
              </div>
            )}
            <button
              onClick={verifyCode}
              disabled={code.length !== 6 || loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base disabled:opacity-40"
            >
              {loading ? "Проверка..." : "Войти"}
            </button>
            <button
              onClick={() => { setStep("email"); setCode(""); setError(""); setInfo(""); }}
              className="text-gray-400 text-xs font-semibold"
            >
              Изменить email
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LegacyLoginDialog;
