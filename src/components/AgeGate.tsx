import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const AgeGate = () => {
  const { user, token, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user || user.birth_set !== false) return null;

  const submit = async (age18: boolean) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_age", token, age12: true, age18 }),
      });
      const raw = await res.json();
      const data = typeof raw?.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.error) setError(data.error);
      else updateUser({ birth_set: true, is_adult: !!data.is_adult, age_confirmed: age18 ? 18 : 12 });
    } catch {
      setError("Не удалось сохранить. Попробуйте ещё раз");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center px-6">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4">
        <h2 className="text-black font-bold text-lg">Подтвердите возраст</h2>
        <p className="text-gray-500 text-sm">
          По закону часть контента доступна только совершеннолетним. Мы не храним дату рождения, только отметку о возрасте. Сервис доступен с 12 лет.
        </p>
        {error && <p className="text-[#fe2c55] text-sm">{error}</p>}
        <button
          onClick={() => submit(true)}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-[#fe2c55] text-white font-bold text-base disabled:opacity-40"
        >
          Мне есть 18 лет
        </button>
        <button
          onClick={() => submit(false)}
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gray-100 text-black font-bold text-base disabled:opacity-40"
        >
          Мне 12–17 лет
        </button>
      </div>
    </div>
  );
};

export default AgeGate;
