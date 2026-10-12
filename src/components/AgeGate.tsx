import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const AgeGate = () => {
  const { user, token, updateUser } = useAuth();
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user || user.birth_set !== false) return null;

  const today = new Date().toISOString().slice(0, 10);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_birth_date", token, birth_date: birthDate }),
      });
      const raw = await res.json();
      const data = typeof raw?.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.error) setError(data.error);
      else updateUser({ birth_set: true, is_adult: !!data.is_adult });
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4">
        <h2 className="text-black font-bold text-lg">Укажите дату рождения</h2>
        <p className="text-gray-500 text-sm">
          По закону часть контента доступна только совершеннолетним. Дату рождения можно указать один раз, она нужна только для возрастных ограничений.
        </p>
        <input
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          type="date"
          max={today}
          className="w-full px-4 py-3 rounded-xl bg-gray-100 text-black text-sm outline-none focus:ring-2 focus:ring-[#8b5cf6]/30"
        />
        {error && <p className="text-[#fe2c55] text-sm">{error}</p>}
        <button
          onClick={submit}
          disabled={!birthDate || loading}
          className="w-full py-3.5 rounded-xl bg-[#fe2c55] text-white font-bold text-base disabled:opacity-40"
        >
          {loading ? "Сохраняем..." : "Подтвердить"}
        </button>
      </div>
    </div>
  );
};

export default AgeGate;
