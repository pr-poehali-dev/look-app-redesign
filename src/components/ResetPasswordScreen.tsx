import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const RESET_URL = "https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7";

interface Props {
  token: string;
  onDone: () => void;
}

const ResetPasswordScreen = ({ token, onDone }: Props) => {
  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(RESET_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) { setValidToken(true); setEmail(data.email || ""); }
        else setError(data.error || "Ссылка недействительна");
      })
      .catch(() => setError("Не удалось проверить ссылку"))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async () => {
    setError("");
    if (password.length < 6) { setError("Пароль минимум 6 символов"); return; }
    if (password !== confirm) { setError("Пароли не совпадают"); return; }
    setLoading(true);
    try {
      const res = await fetch(RESET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", token, password }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setDone(true);
    } catch {
      setError("Ошибка сети");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center mb-2">
          <Icon name="KeyRound" size={28} className="text-white" />
        </div>
        <h1 className="text-white font-black text-3xl">Новый пароль</h1>
        {email && <p className="text-white/50 text-sm">для {email}</p>}
      </div>

      <div className="bg-white rounded-t-3xl px-6 pt-7 pb-10 flex flex-col gap-4">
        {verifying ? (
          <p className="text-gray-500 text-center py-6">Проверка ссылки...</p>
        ) : !validToken ? (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <Icon name="AlertCircle" size={28} className="text-red-600" />
              </div>
              <p className="text-black font-semibold text-base text-center">Ссылка не работает</p>
              <p className="text-gray-500 text-sm text-center">{error || "Запроси новую ссылку для восстановления."}</p>
            </div>
            <button
              onClick={onDone}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base"
            >Вернуться ко входу</button>
          </>
        ) : done ? (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="CheckCircle2" size={28} className="text-green-600" />
              </div>
              <p className="text-black font-semibold text-base text-center">Пароль обновлён</p>
              <p className="text-gray-500 text-sm text-center">Теперь ты можешь войти с новым паролем.</p>
            </div>
            <button
              onClick={onDone}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base"
            >Войти</button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Новый пароль</label>
              <div className="flex items-center bg-gray-100 rounded-xl px-4">
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Минимум 6 символов"
                  className="flex-1 py-3 bg-transparent text-black text-sm outline-none"
                />
                <button onClick={() => setShowPassword(s => !s)} className="ml-2 p-1">
                  <Icon name={showPassword ? "EyeOff" : "Eye"} size={18} className="text-gray-400" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Повтори пароль</label>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder="Повтори пароль"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
                <span className="text-red-600 text-sm">{error}</span>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!password || !confirm || loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base disabled:opacity-40"
            >
              {loading ? "Сохранение..." : "Сохранить пароль"}
            </button>

            <button onClick={onDone} className="text-gray-400 text-sm">Отмена</button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordScreen;
