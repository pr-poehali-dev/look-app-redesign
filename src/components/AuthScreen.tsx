import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

const AuthScreen = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    let err: string | null = null;
    if (mode === "login") {
      err = await login(email.trim(), password);
    } else {
      err = await register(name.trim(), handle.trim(), email.trim(), password);
    }
    if (err) setError(err);
    setLoading(false);
  };

  const isValid = mode === "login"
    ? email.trim() && password
    : name.trim() && handle.trim() && email.trim() && password.length >= 6;

  return (
    <div className="fixed inset-0 bg-black flex flex-col" style={{ maxWidth: 480, margin: "0 auto" }}>
      {/* Logo area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 gap-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center mb-2">
          <span className="text-white font-black text-2xl">L</span>
        </div>
        <h1 className="text-white font-black text-3xl">Look</h1>
        <p className="text-white/50 text-sm">Смотри. Делись. Будь собой.</p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-t-3xl px-6 pt-7 pb-10 flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-1">
          <button
            onClick={() => { setMode("login"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "login" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
          >Войти</button>
          <button
            onClick={() => { setMode("register"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "register" ? "bg-white text-black shadow-sm" : "text-gray-400"}`}
          >Регистрация</button>
        </div>

        {mode === "register" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Имя</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Как тебя зовут?"
                className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Никнейм</label>
              <div className="flex items-center bg-gray-100 rounded-xl px-4">
                <span className="text-gray-400 text-sm">@</span>
                <input
                  value={handle}
                  onChange={e => setHandle(e.target.value.replace(/[^a-z0-9_.]/gi, ""))}
                  placeholder="nickname"
                  className="flex-1 py-3 bg-transparent text-black text-sm outline-none ml-1"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="example@mail.com"
            className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Пароль</label>
          <div className="flex items-center bg-gray-100 rounded-xl px-4">
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              placeholder={mode === "register" ? "Минимум 6 символов" : "Пароль"}
              className="flex-1 py-3 bg-transparent text-black text-sm outline-none"
            />
            <button onClick={() => setShowPassword(s => !s)} className="ml-2 p-1">
              <Icon name={showPassword ? "EyeOff" : "Eye"} size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <Icon name="AlertCircle" size={16} className="text-red-500 flex-shrink-0" />
            <span className="text-red-600 text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold text-base disabled:opacity-40 transition-opacity mt-1"
        >
          {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
