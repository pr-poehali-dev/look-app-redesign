import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STREAMS_API = "https://functions.poehali.dev/54ce632b-903a-4de7-8f5f-e81fa2f42053";

interface Upcoming {
  id: number;
  user_id: string;
  user_name: string;
  title: string;
  category: string;
  scheduled_at: string;
  reminders: number;
  reminded: boolean;
}

const CATS = ["Общее", "Игры", "Музыка", "Кулинария", "Путешествия", "Спорт", "Юмор", "Образование"];

const parse = (raw: unknown) => {
  const r = raw as { body?: unknown };
  return typeof r?.body === "string" ? JSON.parse(r.body) : raw;
};

const formatWhen = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Сегодня, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Завтра, ${time}`;
  return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${time}`;
};

const UpcomingStreams = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Upcoming[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Общее");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);

  const headers = useCallback(
    () => ({
      "Content-Type": "application/json",
      "X-User-Id": user?.id || "anon",
      "X-User-Name": encodeURIComponent(user?.name || "Гость"),
    }),
    [user?.id, user?.name],
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${STREAMS_API}?action=upcoming`, { headers: headers() });
      const data = parse(await res.json()) as { streams?: Upcoming[] };
      setList(data.streams || []);
    } catch {
      /* тихо */
    }
  }, [headers]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const call = async (action: string, payload: Record<string, unknown>) => {
    const res = await fetch(STREAMS_API, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ action, ...payload }),
    });
    return parse(await res.json()) as { error?: string; reminded?: boolean };
  };

  const submit = async () => {
    if (!user) { toast.error("Войдите в аккаунт, чтобы анонсировать трансляцию"); return; }
    setSaving(true);
    const data = await call("schedule", {
      title,
      category,
      user_avatar: user.avatar || "",
      scheduled_at: new Date(when).toISOString(),
    });
    setSaving(false);
    if (data.error) { toast.error(data.error); return; }
    toast.success("Трансляция анонсирована, подписчики получат уведомление");
    setShowForm(false);
    setTitle("");
    setWhen("");
    load();
  };

  const remind = async (s: Upcoming) => {
    if (!user) { toast.error("Войдите в аккаунт, чтобы получить напоминание"); return; }
    const data = await call("remind", { stream_id: s.id });
    if (data.error) { toast.error(data.error); return; }
    toast.success(data.reminded ? "Напомним перед началом" : "Напоминание отключено");
    load();
  };

  const cancel = async (s: Upcoming) => {
    if (!confirm("Отменить анонс? Тем, кто ждёт, придёт уведомление")) return;
    const data = await call("cancel_schedule", { stream_id: s.id });
    if (data.error) { toast.error(data.error); return; }
    load();
  };

  const minLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  return (
    <div className="px-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">Ближайшие трансляции</p>
        <button onClick={() => setShowForm((v) => !v)} className="text-[#FF5A3C] text-xs font-semibold flex items-center gap-1">
          <Icon name={showForm ? "X" : "CalendarPlus"} size={14} />
          {showForm ? "Закрыть" : "Анонсировать"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col gap-2 mb-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="Тема трансляции"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/30 outline-none"
          />
          <input
            type="datetime-local"
            value={when}
            min={minLocal}
            onChange={(e) => setWhen(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none"
          />
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border ${category === c ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "border-white/15 text-white/60"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={submit}
            disabled={!title.trim() || !when || saving}
            className="w-full py-2.5 rounded-xl bg-[#FF5A3C] text-white text-sm font-bold disabled:opacity-40"
          >
            {saving ? "Сохраняем..." : "Анонсировать трансляцию"}
          </button>
          <p className="text-white/30 text-[11px]">Подписчики получат уведомление сразу, а те, кто нажмёт «Напомнить», ещё и за 15 минут до начала</p>
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-white/30 text-sm">Запланированных трансляций пока нет</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-3">
              <div className="w-11 h-11 rounded-xl bg-[#FF5A3C]/15 flex items-center justify-center flex-shrink-0">
                <Icon name="CalendarClock" size={20} className="text-[#FF5A3C]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">{s.title}</p>
                <p className="text-white/50 text-xs truncate">{s.user_name} · {formatWhen(s.scheduled_at)}</p>
                <p className="text-white/30 text-[11px]">{s.reminders} ждут</p>
              </div>
              {user?.id === s.user_id ? (
                <button onClick={() => cancel(s)} className="px-3 py-1.5 rounded-full border border-white/20 text-white/70 text-xs font-semibold">
                  Отменить
                </button>
              ) : (
                <button
                  onClick={() => remind(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold ${s.reminded ? "bg-white/15 text-white" : "bg-[#FF5A3C] text-white"}`}
                >
                  {s.reminded ? "Ждёте" : "Напомнить"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingStreams;
