import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7";
const TOKEN_KEY = "admin_token_v1";

type Section = "dashboard" | "users" | "videos" | "comments" | "chats" | "reports" | "streams" | "broadcast";

interface Stats {
  users_total: number; users_today: number; users_week: number;
  videos_total: number; videos_today: number;
  comments_total: number; likes_total: number;
  messages_total: number; chats_total: number; streams_active: number;
  reports_open: number;
  users_chart: { date: string; count: number }[];
  videos_chart: { date: string; count: number }[];
}

const api = async (action: string, payload: Record<string, unknown> = {}, token?: string) => {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Admin-Token": token } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const raw = await res.json();
  const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { id: "users", label: "Пользователи", icon: "Users" },
  { id: "videos", label: "Видео", icon: "Film" },
  { id: "comments", label: "Комментарии", icon: "MessageSquare" },
  { id: "chats", label: "Чаты", icon: "MessagesSquare" },
  { id: "streams", label: "Стримы", icon: "Radio" },
  { id: "reports", label: "Жалобы", icon: "Flag" },
  { id: "broadcast", label: "Рассылки", icon: "Send" },
];

export default function Admin() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [section, setSection] = useState<Section>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  if (!token) return <Login onLogin={(t) => { localStorage.setItem(TOKEN_KEY, t); setToken(t); }} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static z-40 w-64 h-screen bg-zinc-900 border-r border-white/10 flex flex-col transition-transform`}>
        <div className="px-5 py-5 border-b border-white/10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
            <Icon name="Shield" size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold">Админ-панель</p>
            <p className="text-xs text-white/40">Управление</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSection(s.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                section === s.id ? "bg-[#fe2c55] text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon name={s.icon} size={18} />
              {s.label}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="m-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white">
          <Icon name="LogOut" size={18} />
          Выйти
        </button>
      </aside>

      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-zinc-900 sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-white/5">
            <Icon name="Menu" size={20} />
          </button>
          <p className="font-bold">{SECTIONS.find(s => s.id === section)?.label}</p>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          {section === "dashboard" && <Dashboard token={token!} />}
          {section === "users" && <Users token={token!} />}
          {section === "videos" && <Videos token={token!} />}
          {section === "comments" && <Comments token={token!} />}
          {section === "chats" && <Chats token={token!} />}
          {section === "streams" && <Streams token={token!} />}
          {section === "reports" && <Reports token={token!} />}
          {section === "broadcast" && <Broadcast token={token!} />}
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const data = await api("login", { login, password });
      onLogin(data.token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
            <Icon name="Shield" size={26} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">Админ-панель</p>
            <p className="text-white/40 text-xs">Только для администратора</p>
          </div>
        </div>
        <input
          autoFocus
          value={login} onChange={(e) => setLogin(e.target.value)}
          placeholder="Логин"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#fe2c55]"
        />
        <input
          type="password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#fe2c55]"
        />
        {err && <p className="text-[#fe2c55] text-sm text-center">{err}</p>}
        <button
          type="submit" disabled={loading || !login || !password}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold disabled:opacity-50"
        >
          {loading ? "Входим..." : "Войти"}
        </button>
      </form>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-white/50 text-sm">{label}</p>
        <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
          <Icon name={icon} size={18} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString("ru") : value}</p>
    </div>
  );
}

function MiniChart({ data, color }: { data: { date: string; count: number }[]; color: string }) {
  if (!data?.length) return <p className="text-white/40 text-sm">Нет данных</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}`}>
          <div className={`w-full ${color} rounded-t`} style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
          <p className="text-[9px] text-white/30">{d.date.slice(5)}</p>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("stats", {}, token).then(setStats).catch(e => setErr(e.message));
  }, [token]);

  if (err) return <p className="text-[#fe2c55]">{err}</p>;
  if (!stats) return <p className="text-white/50">Загрузка...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold hidden md:block">Дашборд</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всего юзеров" value={stats.users_total} icon="Users" color="bg-blue-500" />
        <StatCard label="Новых за сутки" value={stats.users_today} icon="UserPlus" color="bg-emerald-500" />
        <StatCard label="Новых за неделю" value={stats.users_week} icon="TrendingUp" color="bg-purple-500" />
        <StatCard label="Видео всего" value={stats.videos_total} icon="Film" color="bg-pink-500" />
        <StatCard label="Видео за сутки" value={stats.videos_today} icon="Video" color="bg-orange-500" />
        <StatCard label="Комментариев" value={stats.comments_total} icon="MessageSquare" color="bg-cyan-500" />
        <StatCard label="Лайков" value={stats.likes_total} icon="Heart" color="bg-rose-500" />
        <StatCard label="Чатов" value={stats.chats_total} icon="MessagesSquare" color="bg-indigo-500" />
        <StatCard label="Сообщений" value={stats.messages_total} icon="Mail" color="bg-teal-500" />
        <StatCard label="Стримов сейчас" value={stats.streams_active} icon="Radio" color="bg-red-500" />
        <StatCard label="Жалоб открыто" value={stats.reports_open || 0} icon="Flag" color="bg-yellow-500" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
          <p className="font-semibold mb-3">Регистрации (14 дней)</p>
          <MiniChart data={stats.users_chart} color="bg-emerald-500" />
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5">
          <p className="font-semibold mb-3">Видео (14 дней)</p>
          <MiniChart data={stats.videos_chart} color="bg-pink-500" />
        </div>
      </div>
    </div>
  );
}

interface UserRow { id: string; name: string; handle: string; email: string; avatar?: string; created_at?: string; email_verified?: boolean }

function Users({ token }: { token: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("users_list", { search, limit: 100 }, token);
      setUsers(data.users || []);
    } finally { setLoading(false); }
  }, [search, token]);

  useEffect(() => { load(); }, [load]);

  const del = async (id: string) => {
    if (!confirm("Удалить пользователя навсегда?")) return;
    await api("user_delete", { user_id: id }, token);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold hidden md:block">Пользователи</h2>
      <div className="flex gap-2">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, нику, email, id..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-white/30"
        />
        <button onClick={load} className="px-4 rounded-xl bg-zinc-900 border border-white/10 hover:bg-white/5">
          <Icon name="RefreshCw" size={18} />
        </button>
      </div>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden">
        {loading && <p className="p-4 text-white/50 text-sm">Загрузка...</p>}
        {!loading && users.length === 0 && <p className="p-4 text-white/50 text-sm">Никого не найдено</p>}
        <div className="divide-y divide-white/5">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                {u.avatar ? <img src={u.avatar} alt="" className="w-full h-full object-cover" /> : (u.name?.[0] || "?")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{u.name} <span className="text-white/40 text-xs">@{u.handle}</span></p>
                <p className="text-white/50 text-xs truncate">{u.email} · {u.id}</p>
              </div>
              {u.email_verified && <Icon name="BadgeCheck" size={16} className="text-blue-400 flex-shrink-0" />}
              <button onClick={() => del(u.id)} className="p-2 text-[#fe2c55] hover:bg-[#fe2c55]/10 rounded-lg flex-shrink-0">
                <Icon name="Trash2" size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface VideoRow { id: number; url: string; thumbnail?: string; author: string; handle: string; description?: string; likes?: number; comments?: number; created_at?: string; hidden?: boolean }

function Videos({ token }: { token: string }) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("videos_list", { search, limit: 100 }, token);
      setVideos(data.videos || []);
    } finally { setLoading(false); }
  }, [search, token]);

  useEffect(() => { load(); }, [load]);

  const hide = async (id: number, hidden: boolean) => {
    await api("video_hide", { video_id: id, hidden: !hidden }, token);
    load();
  };
  const del = async (id: number) => {
    if (!confirm("Удалить видео?")) return;
    await api("video_delete", { video_id: id }, token);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold hidden md:block">Видео</h2>
      <div className="flex gap-2">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по автору, описанию..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-white/30"
        />
        <button onClick={load} className="px-4 rounded-xl bg-zinc-900 border border-white/10 hover:bg-white/5">
          <Icon name="RefreshCw" size={18} />
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading && <p className="text-white/50 col-span-full">Загрузка...</p>}
        {videos.map((v) => (
          <div key={v.id} className={`bg-zinc-900 border border-white/10 rounded-xl overflow-hidden ${v.hidden ? "opacity-50" : ""}`}>
            <div className="aspect-[9/16] bg-black relative">
              {v.thumbnail ? (
                <img src={v.thumbnail} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30"><Icon name="Film" size={32} /></div>
              )}
              {v.hidden && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-xs">скрыто</div>}
            </div>
            <div className="p-2 space-y-1">
              <p className="text-xs font-medium truncate">{v.author}</p>
              <p className="text-[11px] text-white/40 truncate">{v.description || "—"}</p>
              <p className="text-[11px] text-white/40">♥ {v.likes || 0} · 💬 {v.comments || 0}</p>
              <div className="flex gap-1 pt-1">
                <button onClick={() => hide(v.id, !!v.hidden)} className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px]">
                  {v.hidden ? "Показать" : "Скрыть"}
                </button>
                <button onClick={() => del(v.id)} className="px-2 py-1 rounded bg-[#fe2c55]/20 hover:bg-[#fe2c55]/30 text-[#fe2c55]">
                  <Icon name="Trash2" size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CommentRow { id: number; target_type: string; target_id: string; author_name: string; author_handle?: string; text: string; created_at?: string; user_id?: string }

function Comments({ token }: { token: string }) {
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await api("comments_list", { limit: 200 }, token); setRows(d.comments || []); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => {
    if (!confirm("Удалить комментарий?")) return;
    await api("comment_delete", { comment_id: id }, token);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold hidden md:block">Комментарии</h2>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl divide-y divide-white/5">
        {loading && <p className="p-4 text-white/50 text-sm">Загрузка...</p>}
        {rows.map((c) => (
          <div key={c.id} className="p-3 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
              {c.author_name?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{c.author_name} <span className="text-white/40 text-xs">@{c.author_handle || "-"}</span></p>
              <p className="text-sm text-white/80 break-words">{c.text}</p>
              <p className="text-[11px] text-white/40 mt-1">{c.target_type} #{c.target_id} · {c.created_at?.slice(0, 16)}</p>
            </div>
            <button onClick={() => del(c.id)} className="p-2 text-[#fe2c55] hover:bg-[#fe2c55]/10 rounded-lg">
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ChatRow { id: string; type: string; name?: string; avatar?: string; created_at?: string; members: number; messages: number }
interface MsgRow { id: number; chat_id: string; user_id: string; user_name: string; type: string; content: string; created_at?: string }

function Chats({ token }: { token: string }) {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [active, setActive] = useState<ChatRow | null>(null);
  const [msgs, setMsgs] = useState<MsgRow[]>([]);

  const load = useCallback(async () => {
    const d = await api("chats_list", { limit: 200 }, token);
    setChats(d.chats || []);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const openChat = async (c: ChatRow) => {
    setActive(c);
    const d = await api("chat_messages", { chat_id: c.id }, token);
    setMsgs(d.messages || []);
  };

  const delChat = async (id: string) => {
    if (!confirm("Удалить чат у всех со всей историей?")) return;
    await api("chat_delete", { chat_id: id }, token);
    setActive(null); setMsgs([]);
    load();
  };
  const delMsg = async (id: number) => {
    await api("message_delete", { message_id: id }, token);
    if (active) openChat(active);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold hidden md:block">Чаты</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-white/10 rounded-2xl divide-y divide-white/5 max-h-[70vh] overflow-y-auto">
          {chats.map((c) => (
            <button key={c.id} onClick={() => openChat(c)} className={`w-full p-3 flex items-center gap-3 hover:bg-white/5 text-left ${active?.id === c.id ? "bg-white/5" : ""}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(c.name || c.id)?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name || c.id}</p>
                <p className="text-xs text-white/40">{c.type} · {c.members} участн. · {c.messages} сообщ.</p>
              </div>
            </button>
          ))}
        </div>
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-3 max-h-[70vh] overflow-y-auto">
          {!active ? <p className="text-white/40 text-sm">Выбери чат</p> : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-sm truncate">{active.name || active.id}</p>
                <button onClick={() => delChat(active.id)} className="px-2 py-1 rounded bg-[#fe2c55]/20 text-[#fe2c55] text-xs">Удалить чат</button>
              </div>
              <div className="space-y-2">
                {msgs.map((m) => (
                  <div key={m.id} className="flex items-start gap-2 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/40">{m.user_name} · {m.created_at?.slice(11, 16)}</p>
                      <p className="text-sm break-words">{m.content}</p>
                    </div>
                    <button onClick={() => delMsg(m.id)} className="opacity-0 group-hover:opacity-100 text-[#fe2c55] p-1">
                      <Icon name="X" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface StreamRow { id: number; user_id: string; user_name: string; title: string; category?: string; status?: string; viewers?: number; likes?: number; started_at?: string; ended_at?: string }

function Streams({ token }: { token: string }) {
  const [rows, setRows] = useState<StreamRow[]>([]);
  const load = useCallback(async () => {
    const d = await api("streams_list", { limit: 100 }, token);
    setRows(d.streams || []);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const stop = async (id: number) => { await api("stream_stop", { stream_id: id }, token); load(); };
  const del = async (id: number) => { if (!confirm("Удалить запись стрима?")) return; await api("stream_delete", { stream_id: id }, token); load(); };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold hidden md:block">Стримы</h2>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl divide-y divide-white/5">
        {rows.map((s) => (
          <div key={s.id} className="p-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "active" ? "bg-red-500 animate-pulse" : "bg-white/30"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.title || "(без названия)"} <span className="text-white/40 text-xs">— {s.user_name}</span></p>
              <p className="text-xs text-white/40">{s.category} · 👁 {s.viewers || 0} · ♥ {s.likes || 0} · {s.started_at?.slice(0, 16)}</p>
            </div>
            {s.status === "active" && (
              <button onClick={() => stop(s.id)} className="px-2 py-1 rounded bg-orange-500/20 text-orange-400 text-xs">Остановить</button>
            )}
            <button onClick={() => del(s.id)} className="p-2 text-[#fe2c55] hover:bg-[#fe2c55]/10 rounded-lg">
              <Icon name="Trash2" size={16} />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="p-4 text-white/40 text-sm">Стримов нет</p>}
      </div>
    </div>
  );
}

interface ReportRow {
  id: number; target_type: string; target_id: string; reason: string; comment: string;
  reporter_id: string; reporter_name: string; status: string; resolved_at?: string;
  resolved_note?: string; created_at?: string;
}
interface ReportPreview { title?: string; subtitle?: string; thumb?: string; hidden?: boolean }

const REASON_LABEL: Record<string, string> = {
  spam: "Спам", violence: "Насилие", harassment: "Травля", nudity: "18+",
  hate: "Ненависть", illegal: "Незаконное", fake: "Фейк", other: "Другое",
};
const TARGET_LABEL: Record<string, string> = {
  video: "Видео", comment: "Комментарий", user: "Пользователь",
  chat: "Чат", message: "Сообщение", stream: "Стрим", post: "Пост",
};

function Reports({ token }: { token: string }) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [previews, setPreviews] = useState<Record<string, ReportPreview>>({});
  const [openCount, setOpenCount] = useState(0);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api("reports_list", { status: filter, limit: 200 }, token);
      setRows(d.reports || []);
      setPreviews(d.previews || {});
      setOpenCount(d.open_count || 0);
    } finally { setLoading(false); }
  }, [filter, token]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (id: number) => { await api("report_resolve", { report_id: id }, token); load(); };
  const remove = async (id: number) => { if (!confirm("Удалить жалобу?")) return; await api("report_delete", { report_id: id }, token); load(); };
  const doAction = async (id: number, doKey: string, label: string) => {
    if (!confirm(`Выполнить: ${label}? Жалоба будет закрыта.`)) return;
    await api("report_action", { report_id: id, do: doKey }, token);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold hidden md:block">Жалобы</h2>
        <div className="flex gap-1 bg-zinc-900 border border-white/10 rounded-xl p-1">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filter === f ? "bg-[#fe2c55] text-white" : "text-white/60 hover:text-white"}`}
            >
              {f === "open" ? `Новые${openCount ? ` (${openCount})` : ""}` : f === "resolved" ? "Закрытые" : "Все"}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-white/50 text-sm">Загрузка...</p>}
      {!loading && rows.length === 0 && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center">
          <Icon name="ShieldCheck" size={32} className="text-emerald-400 mx-auto mb-2" />
          <p className="text-white/70 text-sm">Жалоб нет</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const preview = previews[`${r.target_type}:${r.target_id}`];
          return (
            <div key={r.id} className="bg-zinc-900 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#fe2c55]/20 flex items-center justify-center">
                  <Icon name="Flag" size={20} className="text-[#fe2c55]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{TARGET_LABEL[r.target_type] || r.target_type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{REASON_LABEL[r.reason] || r.reason}</span>
                    {r.status === "resolved" && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Закрыта</span>}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    От {r.reporter_name || r.reporter_id} · {r.created_at?.slice(0, 16)} · #{r.id}
                  </p>
                </div>
              </div>

              {preview && (
                <div className="flex items-center gap-3 p-3 bg-black/30 rounded-xl">
                  {preview.thumb && <img src={preview.thumb} alt="" className="w-12 h-16 object-cover rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{preview.title || "—"}</p>
                    {preview.subtitle && <p className="text-xs text-white/50 truncate">{preview.subtitle}</p>}
                    {preview.hidden && <p className="text-xs text-orange-400">⚠ Скрыто</p>}
                  </div>
                  <span className="text-xs text-white/40">ID {r.target_id}</span>
                </div>
              )}

              {r.comment && (
                <p className="text-sm text-white/70 italic bg-black/20 rounded-xl p-3">«{r.comment}»</p>
              )}

              {r.status === "open" && (
                <div className="flex flex-wrap gap-2">
                  {r.target_type === "video" && (
                    <>
                      <button onClick={() => doAction(r.id, "hide_video", "скрыть видео")} className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-medium hover:bg-orange-500/30">
                        Скрыть видео
                      </button>
                      <button onClick={() => doAction(r.id, "delete_video", "удалить видео")} className="px-3 py-1.5 rounded-lg bg-[#fe2c55]/20 text-[#fe2c55] text-xs font-medium hover:bg-[#fe2c55]/30">
                        Удалить видео
                      </button>
                    </>
                  )}
                  {r.target_type === "comment" && (
                    <button onClick={() => doAction(r.id, "delete_comment", "удалить комментарий")} className="px-3 py-1.5 rounded-lg bg-[#fe2c55]/20 text-[#fe2c55] text-xs font-medium hover:bg-[#fe2c55]/30">
                      Удалить комментарий
                    </button>
                  )}
                  {r.target_type === "user" && (
                    <button onClick={() => doAction(r.id, "delete_user", "удалить пользователя")} className="px-3 py-1.5 rounded-lg bg-[#fe2c55]/20 text-[#fe2c55] text-xs font-medium hover:bg-[#fe2c55]/30">
                      Удалить пользователя
                    </button>
                  )}
                  {r.target_type === "message" && (
                    <button onClick={() => doAction(r.id, "delete_message", "удалить сообщение")} className="px-3 py-1.5 rounded-lg bg-[#fe2c55]/20 text-[#fe2c55] text-xs font-medium hover:bg-[#fe2c55]/30">
                      Удалить сообщение
                    </button>
                  )}
                  <button onClick={() => resolve(r.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30">
                    Закрыть без действий
                  </button>
                  <button onClick={() => remove(r.id)} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs hover:bg-white/10 ml-auto">
                    Удалить жалобу
                  </button>
                </div>
              )}

              {r.status === "resolved" && (
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>Закрыто: {r.resolved_at?.slice(0, 16)} {r.resolved_note ? `· ${r.resolved_note}` : ""}</span>
                  <button onClick={() => remove(r.id)} className="text-white/40 hover:text-[#fe2c55]">
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface BroadcastRow { id: number; text: string; target: string; created_at: string }

function Broadcast({ token }: { token: string }) {
  const [text, setText] = useState("");
  const [list, setList] = useState<BroadcastRow[]>([]);
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    api("broadcasts_list", {}, token).then(d => setList(d.broadcasts || []));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    if (!text.trim()) return;
    await api("broadcast", { text, target: "all" }, token);
    setText(""); setSent(true); setTimeout(() => setSent(false), 2000);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold hidden md:block">Рассылки</h2>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-3">
        <p className="text-sm text-white/70">Текст сообщения, которое сохранится в журнале рассылок:</p>
        <textarea
          value={text} onChange={(e) => setText(e.target.value)}
          rows={4} placeholder="Привет, у нас обновление..."
          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white placeholder:text-white/30 resize-none"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/40">Аудитория: все пользователи</p>
          <button onClick={send} disabled={!text.trim()} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-semibold text-sm disabled:opacity-50">
            {sent ? "Сохранено ✓" : "Отправить"}
          </button>
        </div>
      </div>
      <div className="bg-zinc-900 border border-white/10 rounded-2xl divide-y divide-white/5">
        <p className="px-4 py-2 text-xs uppercase text-white/40 tracking-wider">История</p>
        {list.map((b) => (
          <div key={b.id} className="p-3">
            <p className="text-sm break-words">{b.text}</p>
            <p className="text-[11px] text-white/40 mt-1">{b.target} · {b.created_at?.slice(0, 16)}</p>
          </div>
        ))}
        {list.length === 0 && <p className="p-4 text-white/40 text-sm">Рассылок пока не было</p>}
      </div>
    </div>
  );
}