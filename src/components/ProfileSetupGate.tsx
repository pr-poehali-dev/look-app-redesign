import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const ProfileSetupGate = () => {
  const { user, token, updateUser } = useAuth();
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user || !/^user_[0-9a-f]{8}$/.test(user.handle || "")) return null;

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = { action: "update_profile", token, handle: handle.trim() };
      if (name.trim()) body.name = name.trim();
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.json();
      const data = typeof raw?.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.error) setError(data.error);
      else if (data.user) updateUser(data.user);
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4">
        <h2 className="text-black font-bold text-lg">Заполните профиль</h2>
        <p className="text-gray-500 text-sm">Придумайте никнейм, по нему вас будут находить. Имя можно указать позже.</p>
        <div className="flex items-center bg-gray-100 rounded-xl px-4">
          <span className="text-gray-400 text-sm">@</span>
          <input
            value={handle}
            autoComplete="off"
            onChange={e => setHandle(e.target.value.replace(/[^a-z0-9_.]/gi, ""))}
            placeholder="nickname"
            className="flex-1 py-3 bg-transparent text-black text-sm outline-none ml-1"
          />
        </div>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Имя (необязательно)"
          className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none"
        />
        {error && <p className="text-[#fe2c55] text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={handle.trim().length < 3 || loading}
          className="w-full py-3.5 rounded-xl bg-[#fe2c55] text-white font-bold text-base disabled:opacity-40"
        >
          {loading ? "Сохраняем..." : "Продолжить"}
        </button>
      </div>
    </div>
  );
};

export default ProfileSetupGate;
