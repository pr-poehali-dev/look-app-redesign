import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

interface Props {
  onBack: () => void;
}

const QrLoginScreen = ({ onBack }: Props) => {
  const { loginWithSession } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "waiting" | "approved" | "rejected" | "expired" | "error">("loading");
  const [secondsLeft, setSecondsLeft] = useState(600);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const createSession = async () => {
    setStatus("loading");
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "qr_create" }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.code) {
        setCode(data.code);
        setSecondsLeft(data.expires_in || 600);
        setStatus("waiting");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    createSession();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  useEffect(() => {
    if (!code || status !== "waiting") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "qr_status", code }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.status === "approved" && data.token && data.user) {
          setStatus("approved");
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => loginWithSession(data.user, data.token), 600);
        } else if (data.status === "rejected") {
          setStatus("rejected");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.status === "not_found") {
          setStatus("expired");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // продолжаем поллинг
      }
    }, 2000);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus("expired");
          if (pollRef.current) clearInterval(pollRef.current);
          if (tickRef.current) clearInterval(tickRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [code, status, loginWithSession]);

  const qrUrl = code ? `${window.location.origin}/?qr_login=${code}` : "";
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 bg-black overflow-y-auto" style={{ maxWidth: 560, margin: "0 auto" }}>
      <div className="min-h-full flex flex-col">
        <div className="flex items-center justify-between px-4 pt-12 pb-3">
          <button onClick={onBack} className="p-2 -ml-1 text-white"><Icon name="ArrowLeft" size={22} /></button>
          <p className="text-white font-bold">Вход по QR</p>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="bg-white rounded-3xl p-6 flex flex-col items-center gap-4 w-full max-w-sm">
            <div className="relative">
              {status === "waiting" && code && (
                <div className="p-3 bg-white rounded-2xl border-4 border-[#fe2c55]/20">
                  <QRCodeSVG value={qrUrl} size={220} level="M" includeMargin={false} />
                </div>
              )}
              {status === "loading" && (
                <div className="w-[260px] h-[260px] flex items-center justify-center">
                  <div className="w-10 h-10 border-4 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {status === "approved" && (
                <div className="w-[260px] h-[260px] flex flex-col items-center justify-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                    <Icon name="Check" size={48} className="text-green-600" />
                  </div>
                  <p className="text-black font-bold text-lg">Подтверждено!</p>
                  <p className="text-gray-500 text-sm">Заходим в аккаунт...</p>
                </div>
              )}
              {(status === "expired" || status === "rejected" || status === "error") && (
                <div className="w-[260px] h-[260px] flex flex-col items-center justify-center gap-3 px-4">
                  <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                    <Icon name={status === "rejected" ? "X" : "Clock"} size={44} className="text-red-500" />
                  </div>
                  <p className="text-black font-bold text-lg text-center">
                    {status === "rejected" ? "Вход отклонён" : status === "expired" ? "Код истёк" : "Ошибка"}
                  </p>
                  <p className="text-gray-500 text-sm text-center">Попробуй создать новый код.</p>
                </div>
              )}
            </div>

            {status === "waiting" && (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Icon name="Clock" size={14} />
                <span>Код действует ещё {mm}:{ss}</span>
              </div>
            )}

            {(status === "expired" || status === "rejected" || status === "error") && (
              <button
                onClick={createSession}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-sm"
              >Создать новый код</button>
            )}
          </div>

          <div className="mt-6 text-white/80 text-sm max-w-sm">
            <p className="font-semibold mb-2">Как войти:</p>
            <ol className="space-y-1.5 list-decimal list-inside text-white/70">
              <li>Открой приложение Лоок на телефоне</li>
              <li>Зайди в Профиль → Сканировать QR</li>
              <li>Наведи камеру на этот код</li>
              <li>Подтверди вход — ПК зайдёт автоматически</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrLoginScreen;
