import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7";

const call = async (action: string, payload: Record<string, unknown>, token: string) => {
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Admin-Token": token },
    body: JSON.stringify({ action, ...payload }),
  });
  const raw = await res.json();
  const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

interface Metrics {
  boards_total: number; board_owners: number; boards_per_user: number;
  board_items_total: number; board_items_week: number;
  cards_total: number; cards_share: number;
  challenge_entries: number; badges_total: number;
  ideas_filter_on: number; ideas_filter_users: number;
}
interface TopicRow { slug: string; title: string; icon: string; color: string; sort_order: number }
interface ChallengeRow { id: number; title: string; description: string; criteria: string; topic: string | null; badge_title: string; ends_at: string; is_active: boolean; entries: number }

const inputCls = "w-full bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none";

const Stat = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4">
    <p className="text-white/50 text-sm">{label}</p>
    <p className="text-2xl font-bold mt-1">{typeof value === "number" ? value.toLocaleString("ru") : value}</p>
    {hint && <p className="text-white/30 text-xs mt-1">{hint}</p>}
  </div>
);

const IdeasAdmin = ({ token }: { token: string }) => {
  const [m, setM] = useState<Metrics | null>(null);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [err, setErr] = useState("");
  const [tf, setTf] = useState({ slug: "", title: "", icon: "Sparkles", color: "#8b5cf6", sort_order: 50 });
  const [cf, setCf] = useState({ title: "", description: "", criteria: "", topic: "", badge_title: "Участник недели", days: 7 });

  const load = useCallback(() => {
    call("ideas_metrics", {}, token).then(setM).catch((e) => setErr(e.message));
    call("topics_admin_list", {}, token).then((d) => setTopics(d.topics || [])).catch(() => {});
    call("challenges_admin_list", {}, token).then((d) => setChallenges(d.challenges || [])).catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const saveTopic = async () => {
    try { await call("topic_save", tf, token); setTf({ ...tf, slug: "", title: "" }); load(); } catch (e) { setErr((e as Error).message); }
  };
  const delTopic = async (slug: string) => {
    if (!confirm("Удалить тему? Старые посты сохранят отметку, но тема пропадёт из списка.")) return;
    await call("topic_delete", { slug }, token).catch(() => {});
    load();
  };
  const saveChallenge = async () => {
    try { await call("challenge_save", cf, token); setCf({ ...cf, title: "", description: "", criteria: "" }); load(); } catch (e) { setErr((e as Error).message); }
  };
  const toggleChallenge = async (c: ChallengeRow) => {
    await call("challenge_save", { ...c, is_active: !c.is_active }, token).catch(() => {});
    load();
  };

  const delChallenge = async (c: ChallengeRow) => {
    if (!confirm(`Удалить челлендж «${c.title}»? Участия и выданные за него бейджи тоже удалятся.`)) return;
    await call("challenge_delete", { id: c.id }, token).catch((e) => setErr((e as Error).message));
    load();
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold hidden md:block">Идеи и подборки</h2>
      {err && <p className="text-[#FF5A3C] text-sm">{err}</p>}

      {m && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Досок на пользователя" value={m.boards_per_user} hint={`всего досок: ${m.boards_total}, авторов: ${m.board_owners}`} />
          <Stat label="Доля постов-карточек" value={`${m.cards_share}%`} hint={`карточек: ${m.cards_total}`} />
          <Stat label="Сохранений в доски" value={m.board_items_total} hint={`за неделю: ${m.board_items_week}`} />
          <Stat label="Участий в челленджах" value={m.challenge_entries} hint={`бейджей выдано: ${m.badges_total}`} />
          <Stat label="Включений «Только идеи»" value={m.ideas_filter_on} hint={`людей: ${m.ideas_filter_users}`} />
        </div>
      )}

      <section>
        <h3 className="font-bold text-lg mb-3">Темы</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl divide-y divide-white/5">
          {topics.map((t) => (
            <div key={t.slug} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: t.color }}><Icon name={t.icon} fallback="Sparkles" size={14} className="text-white" /></span>
              <span className="flex-1 text-sm">{t.title} <span className="text-white/30">· {t.slug}</span></span>
              <button onClick={() => setTf({ slug: t.slug, title: t.title, icon: t.icon, color: t.color, sort_order: t.sort_order })} className="text-white/50 text-xs">Изменить</button>
              <button onClick={() => delTopic(t.slug)} aria-label="Удалить"><Icon name="Trash2" size={14} className="text-white/40" /></button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3">
          <input className={inputCls} placeholder="Код (латиницей)" value={tf.slug} onChange={(e) => setTf({ ...tf, slug: e.target.value })} />
          <input className={`${inputCls} md:col-span-2`} placeholder="Название" value={tf.title} onChange={(e) => setTf({ ...tf, title: e.target.value })} />
          <input className={inputCls} placeholder="Иконка (Sparkles)" value={tf.icon} onChange={(e) => setTf({ ...tf, icon: e.target.value })} />
          <input className={inputCls} type="color" value={tf.color} onChange={(e) => setTf({ ...tf, color: e.target.value })} />
          <button onClick={saveTopic} className="bg-[#FF5A3C] rounded-lg text-sm font-semibold py-2">Сохранить</button>
        </div>
      </section>

      <section>
        <h3 className="font-bold text-lg mb-3">Челленджи недели</h3>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl divide-y divide-white/5">
          {challenges.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-white/40 text-xs">до {new Date(c.ends_at).toLocaleDateString("ru")} · участников: {c.entries} · бейдж «{c.badge_title}»</p>
              </div>
              <button onClick={() => toggleChallenge(c)} className={`px-3 py-1 rounded-full text-xs font-semibold ${c.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/50"}`}>
                {c.is_active ? "Идёт" : "Скрыт"}
              </button>
              <button onClick={() => delChallenge(c)} aria-label="Удалить челлендж" title="Удалить"><Icon name="Trash2" size={15} className="text-white/40" /></button>
            </div>
          ))}
        </div>
        <div className="grid gap-2 mt-3">
          <input className={inputCls} placeholder="Название челленджа" value={cf.title} onChange={(e) => setCf({ ...cf, title: e.target.value })} />
          <textarea className={inputCls} rows={2} placeholder="Описание" value={cf.description} onChange={(e) => setCf({ ...cf, description: e.target.value })} />
          <input className={inputCls} placeholder="Критерии" value={cf.criteria} onChange={(e) => setCf({ ...cf, criteria: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <input className={inputCls} placeholder="Код темы (diy)" value={cf.topic} onChange={(e) => setCf({ ...cf, topic: e.target.value })} />
            <input className={inputCls} placeholder="Название бейджа" value={cf.badge_title} onChange={(e) => setCf({ ...cf, badge_title: e.target.value })} />
            <input className={inputCls} type="number" min={1} max={60} placeholder="Дней" value={cf.days} onChange={(e) => setCf({ ...cf, days: Number(e.target.value) || 7 })} />
          </div>
          <button onClick={saveChallenge} disabled={!cf.title.trim()} className="bg-[#FF5A3C] rounded-lg text-sm font-semibold py-2 disabled:opacity-50">Запустить челлендж</button>
        </div>
      </section>
    </div>
  );
};

export default IdeasAdmin;
