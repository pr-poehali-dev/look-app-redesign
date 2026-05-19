import { useState, useEffect, useCallback, useRef } from "react";
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

function detectKind(url?: string): "video" | "image" | "unknown" {
  if (!url) return "unknown";
  const clean = url.split("?")[0].split("#")[0].toLowerCase();
  if (/\.(mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(clean)) return "video";
  if (/\.(jpe?g|png|gif|webp|avif|bmp|heic|heif)$/i.test(clean)) return "image";
  return "unknown";
}

function isLegacyExternal(url?: string): boolean {
  if (!url) return false;
  return /^https?:\/\/short-video\.ru\//i.test(url);
}

function VideoPreview({ url, thumbnail, hidden }: { url?: string; thumbnail?: string; hidden?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const kind = detectKind(url);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) { setVisible(true); obs.disconnect(); break; }
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (kind !== "video") return;
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  const renderMedia = () => {
    if (!visible) {
      // Скелетон до попадания в viewport
      return (
        <div className="w-full h-full flex items-center justify-center text-white/20 animate-pulse">
          <Icon name="Image" size={28} />
        </div>
      );
    }
    if (thumbnail && !errored) {
      return <img src={thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setErrored(true)} />;
    }
    if (kind === "video" && url) {
      return (
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={() => setErrored(true)}
        />
      );
    }
    if (kind === "image" && url && !errored) {
      return <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setErrored(true)} />;
    }
    if (kind === "unknown" && url && !errored) {
      return <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" onError={() => setErrored(true)} />;
    }
    return (
      <div className="w-full h-full flex items-center justify-center text-white/30">
        <Icon name="Film" size={32} />
      </div>
    );
  };

  return (
    <div ref={wrapperRef} className="aspect-[9/16] bg-black relative cursor-pointer group" onClick={toggle}>
      {renderMedia()}
      {/* Play overlay только для видео */}
      {!playing && kind === "video" && !errored && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/20 transition-colors">
          <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
            <Icon name="Play" size={18} className="text-black ml-0.5" />
          </div>
        </div>
      )}
      {/* Бейдж типа */}
      {kind === "image" && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white/80 flex items-center gap-1">
          <Icon name="Image" size={10} /> Фото
        </div>
      )}
      {kind === "video" && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white/80 flex items-center gap-1">
          <Icon name="Video" size={10} /> Видео
        </div>
      )}
      {errored && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-2 text-[10px] p-2 text-center bg-black/70">
          <Icon name="AlertTriangle" size={20} />
          <span>{isLegacyExternal(url) ? "Файл на внешнем сайте" : "Не загрузилось"}</span>
          <button
            onClick={(e) => { e.stopPropagation(); setErrored(false); }}
            className="px-2 py-1 rounded bg-white/10 text-white/80 hover:bg-white/20 text-[10px]"
          >
            Повторить
          </button>
        </div>
      )}
      {!errored && isLegacyExternal(url) && (
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-orange-500/80 text-[9px] text-white flex items-center gap-1">
          <Icon name="ExternalLink" size={9} /> Legacy
        </div>
      )}
      {hidden && <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-xs">скрыто</div>}
    </div>
  );
}

type KindFilter = "all" | "video" | "image" | "unknown";
type VisFilter = "all" | "active" | "hidden";
type SortKey = "new" | "old" | "likes" | "comments";

function Videos({ token }: { token: string }) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [visFilter, setVisFilter] = useState<VisFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("new");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [brokenCount, setBrokenCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migProgress, setMigProgress] = useState<{ migrated: number; failed: number; remaining: number } | null>(null);
  const migAbortRef = useRef(false);

  const loadBroken = useCallback(async () => {
    try {
      const d = await api("videos_broken_list", {}, token);
      setBrokenCount(d.total || 0);
    } catch (e) { void e; }
  }, [token]);
  useEffect(() => { loadBroken(); }, [loadBroken]);

  // Дублирующий локальный счётчик — на случай если бэк-эндпоинт не отвечает
  const localBrokenCount = videos.filter((v) => isLegacyExternal(v.url)).length;
  const effectiveBroken = brokenCount || localBrokenCount;

  const deleteBroken = async () => {
    const n = brokenCount || videos.filter((v) => isLegacyExternal(v.url)).length;
    if (n === 0) return;
    if (!confirm(`Удалить ${n} битых записей со ссылками на short-video.ru? Это действие необратимо.`)) return;
    const d = await api("videos_broken_delete", {}, token);
    alert(`Удалено: ${d.affected || 0}`);
    setBrokenCount(0);
    load();
  };

  const REUPLOAD_API = "https://functions.poehali.dev/d60ef7bd-d96d-4388-9c4a-637a822e9313";
  const callReupload = async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch(REUPLOAD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({ action, ...payload }),
    });
    const raw = await res.json();
    return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  };

  const migrateLegacy = async () => {
    const n = brokenCount || videos.filter((v) => isLegacyExternal(v.url)).length;
    if (migrating || n === 0) return;
    if (!confirm(`Перенести ${n} legacy-видео на наш CDN? Будет идти в фоне партиями по 5 шт, неудачные пометятся как скрытые.`)) return;
    setMigrating(true);
    migAbortRef.current = false;
    let totalMigrated = 0;
    let totalFailed = 0;
    try {
      while (!migAbortRef.current) {
        const d = await callReupload("migrate", { batch_size: 5 });
        totalMigrated += d.migrated || 0;
        totalFailed += d.failed || 0;
        setMigProgress({ migrated: totalMigrated, failed: totalFailed, remaining: d.remaining ?? 0 });
        setBrokenCount(d.remaining ?? 0);
        if (d.done || (d.migrated === 0 && d.failed === 0)) break;
      }
    } catch (e) {
      alert("Ошибка переноса: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setMigrating(false);
      load();
      loadBroken();
    }
  };
  const stopMigrate = () => { migAbortRef.current = true; };

  // ---------- Очистка дублей и скрытых ----------
  const [cleanupInfo, setCleanupInfo] = useState<{ total: number; hidden: number; duplicates: number; to_delete: number; will_remain: number } | null>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);

  const previewCleanup = async () => {
    setCleanupBusy(true);
    try {
      const d = await api("videos_cleanup_preview", {}, token);
      setCleanupInfo(d);
    } catch (e) {
      alert("Ошибка: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setCleanupBusy(false);
    }
  };

  const runCleanup = async () => {
    if (!cleanupInfo) return;
    if (!confirm(`Удалить ${cleanupInfo.to_delete} видео (${cleanupInfo.hidden} скрытых + дубли)? Останется ${cleanupInfo.will_remain}. Действие необратимо.`)) return;
    setCleanupBusy(true);
    try {
      const d = await api("videos_cleanup_run", {}, token);
      alert(`Удалено: ${d.deleted}`);
      setCleanupInfo(null);
      load();
    } catch (e) {
      alert("Ошибка: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setCleanupBusy(false);
    }
  };

  // ---------- Импорт ZIP с Я.Диска ----------
  const YADISK_API = "https://functions.poehali.dev/be1dc659-71d3-414a-9029-c3bc7de92bf2";
  const [yadiskUrl, setYadiskUrl] = useState("");
  const [yadiskInfo, setYadiskInfo] = useState<{ total_files: number; matched_in_db: number; archive_size: number; sample: string[] } | null>(null);
  const [yadiskBusy, setYadiskBusy] = useState(false);
  const [yadiskImporting, setYadiskImporting] = useState(false);
  const [yadiskProgress, setYadiskProgress] = useState<{ offset: number; total: number; migrated: number; skipped: number } | null>(null);
  const yadiskAbortRef = useRef(false);

  const callYadisk = async (action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch(YADISK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({ action, public_url: yadiskUrl, ...payload }),
    });
    return await res.json();
  };

  const yadiskIndex = async () => {
    if (!yadiskUrl.trim()) { alert("Вставь публичную ссылку на zip с Яндекс.Диска"); return; }
    setYadiskBusy(true);
    setYadiskInfo(null);
    try {
      const d = await callYadisk("index");
      if (d.error) { alert("Ошибка: " + d.error); return; }
      setYadiskInfo({
        total_files: d.total_files,
        matched_in_db: d.matched_in_db,
        archive_size: d.archive_size,
        sample: d.sample || [],
      });
    } catch (e) {
      alert("Ошибка: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setYadiskBusy(false);
    }
  };

  const yadiskImport = async () => {
    if (!yadiskInfo) return;
    const resumeFrom = yadiskProgress?.offset && yadiskProgress.offset < (yadiskProgress?.total || 0) ? yadiskProgress.offset : 0;
    const startMsg = resumeFrom > 0
      ? `Продолжить импорт с ${resumeFrom}/${yadiskInfo.total_files}?`
      : `Импортировать файлы из архива? Будет обработано ${yadiskInfo.total_files} файлов пачками по 3 шт.`;
    if (!confirm(startMsg)) return;
    setYadiskImporting(true);
    yadiskAbortRef.current = false;
    let offset = resumeFrom;
    let migrated = yadiskProgress?.migrated || 0;
    let skipped = yadiskProgress?.skipped || 0;
    let consecutiveErrors = 0;
    try {
      while (!yadiskAbortRef.current) {
        let d: { error?: string; offset?: number; total?: number; migrated?: number; skipped?: number; done?: boolean };
        try {
          d = await callYadisk("import", { offset, batch_size: 5 });
        } catch (netErr) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            alert("Сеть/бэк недоступны 5 раз подряд. Прогресс сохранён, нажми «Запустить импорт» — продолжу с " + offset);
            break;
          }
          await new Promise((r) => setTimeout(r, 1500 * consecutiveErrors));
          continue;
        }
        if (d.error) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            alert("Ошибка 5 раз подряд: " + d.error + ". Прогресс сохранён, продолжу с " + offset);
            break;
          }
          offset += 5;
          setYadiskProgress({ offset, total: d.total || yadiskInfo.total_files, migrated, skipped });
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        consecutiveErrors = 0;
        const newOffset = typeof d.offset === "number" ? d.offset : offset;
        if (newOffset <= offset) {
          // защита от зацикливания: бэк не сдвинул offset — двигаем вручную
          offset = offset + 5;
        } else {
          offset = newOffset;
        }
        migrated += d.migrated || 0;
        skipped += d.skipped || 0;
        setYadiskProgress({ offset, total: d.total || yadiskInfo.total_files, migrated, skipped });
        if (d.done || offset >= (d.total || yadiskInfo.total_files)) break;
      }
    } catch (e) {
      alert("Ошибка импорта: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setYadiskImporting(false);
      load();
      loadBroken();
    }
  };
  const stopYadiskImport = () => { yadiskAbortRef.current = true; };

  const yadiskImportAll = async () => {
    if (!yadiskInfo) return;
    const resumeFrom = yadiskProgress?.offset && yadiskProgress.offset < (yadiskProgress?.total || 0) ? yadiskProgress.offset : 0;
    const msg = resumeFrom > 0
      ? `Продолжить заливку всех файлов с ${resumeFrom}?`
      : `Залить ВСЕ файлы из Я.Диска в S3 и создать новые записи в базе (≈${yadiskInfo.total_files} файлов, видео+превью объединятся в пары)?`;
    if (!confirm(msg)) return;
    setYadiskImporting(true);
    yadiskAbortRef.current = false;
    let offset = resumeFrom;
    let migrated = yadiskProgress?.migrated || 0;
    let skipped = yadiskProgress?.skipped || 0;
    let consecutiveErrors = 0;
    try {
      while (!yadiskAbortRef.current) {
        let d: { error?: string; offset?: number; total?: number; created?: number; migrated?: number; skipped?: number; done?: boolean };
        try {
          d = await callYadisk("import-all", { offset, batch_size: 3 });
        } catch (netErr) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) { alert("Сеть/бэк недоступны. Прогресс сохранён, продолжу с " + offset); break; }
          await new Promise((r) => setTimeout(r, 1500 * consecutiveErrors));
          continue;
        }
        if (d.error) {
          consecutiveErrors++;
          if (consecutiveErrors >= 5) { alert("Ошибка: " + d.error + ". Продолжу с " + offset); break; }
          offset += 3;
          setYadiskProgress({ offset, total: d.total || yadiskInfo.total_files, migrated, skipped });
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        consecutiveErrors = 0;
        const newOffset = typeof d.offset === "number" ? d.offset : offset;
        offset = newOffset <= offset ? offset + 3 : newOffset;
        migrated += d.created || d.migrated || 0;
        skipped += d.skipped || 0;
        setYadiskProgress({ offset, total: d.total || yadiskInfo.total_files, migrated, skipped });
        if (d.done || offset >= (d.total || yadiskInfo.total_files)) break;
      }
    } catch (e) {
      alert("Ошибка: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setYadiskImporting(false);
      load();
      loadBroken();
    }
  };

  // ---------- Разведка short-video.ru ----------
  const PROBE_API = "https://functions.poehali.dev/d1cfb246-8b1e-4e41-8905-1966589c1420";
  const [probeBusy, setProbeBusy] = useState(false);
  const [probeResult, setProbeResult] = useState<unknown>(null);
  const runProbe = async () => {
    setProbeBusy(true);
    setProbeResult(null);
    try {
      const res = await fetch(PROBE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Token": token },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setProbeResult(data);
    } catch (e) {
      setProbeResult({ error: String(e) });
    } finally {
      setProbeBusy(false);
    }
  };
  const fmtBytes = (n: number) => {
    if (n < 1024) return `${n} Б`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} МБ`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} ГБ`;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api("videos_list", { search, limit: 300 }, token);
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

  const toggleSel = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSel = () => setSelected(new Set());
  const bulk = async (op: "hide" | "show" | "delete") => {
    if (selected.size === 0) return;
    const msg = op === "delete"
      ? `Удалить ${selected.size} записей навсегда?`
      : op === "hide" ? `Скрыть ${selected.size} записей?` : `Показать ${selected.size} записей?`;
    if (!confirm(msg)) return;
    await api("videos_bulk", { ids: Array.from(selected), op }, token);
    clearSel();
    load();
  };

  const counts = { all: videos.length, video: 0, image: 0, unknown: 0, hidden: 0, active: 0 };
  for (const v of videos) {
    const k = detectKind(v.url);
    if (k === "video") counts.video++;
    else if (k === "image") counts.image++;
    else counts.unknown++;
    if (v.hidden) counts.hidden++; else counts.active++;
  }

  const filtered = videos
    .filter((v) => kindFilter === "all" || detectKind(v.url) === kindFilter)
    .filter((v) => visFilter === "all" || (visFilter === "hidden" ? v.hidden : !v.hidden))
    .slice()
    .sort((a, b) => {
      if (sortKey === "likes") return (b.likes || 0) - (a.likes || 0);
      if (sortKey === "comments") return (b.comments || 0) - (a.comments || 0);
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortKey === "old" ? at - bt : bt - at;
    });

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${active ? "bg-[#fe2c55] text-white" : "bg-zinc-900 border border-white/10 text-white/60 hover:text-white hover:bg-white/5"}`}
    >
      {children}
    </button>
  );

  const selectAllVisible = () => {
    setSelected(new Set(filtered.map((v) => v.id)));
  };

  return (
    <div className="space-y-4 pb-24">
      <h2 className="text-2xl font-bold hidden md:block">Видео</h2>

      {(effectiveBroken > 0 || migrating) && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-3 flex-wrap">
            <Icon name="AlertTriangle" size={20} className="text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {migrating ? "Переносим legacy-видео на наш CDN..." : `Найдено ${effectiveBroken} legacy-записей`}
              </p>
              <p className="text-xs text-white/60">
                Видео со старого сайта short-video.ru. Можно перенести файлы на наш CDN, чтобы они снова работали, либо удалить.
              </p>
            </div>
            {!migrating ? (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={migrateLegacy}
                  className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2"
                >
                  <Icon name="CloudDownload" size={16} />
                  Перенести на наш CDN ({effectiveBroken})
                </button>
                <button
                  onClick={deleteBroken}
                  className="px-3 py-2 rounded-lg bg-[#fe2c55] text-white text-sm font-semibold hover:opacity-90"
                >
                  Удалить все
                </button>
              </div>
            ) : (
              <button
                onClick={stopMigrate}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
              >
                Остановить
              </button>
            )}
          </div>
          {migProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>Перенесено: <b className="text-emerald-400">{migProgress.migrated}</b> · Не удалось: <b className="text-[#fe2c55]">{migProgress.failed}</b> · Осталось: <b>{migProgress.remaining}</b></span>
                {migrating && <span className="flex items-center gap-1"><Icon name="Loader2" size={12} className="animate-spin" /> в процессе</span>}
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${migProgress.migrated + migProgress.failed > 0
                    ? Math.round(((migProgress.migrated + migProgress.failed) / (migProgress.migrated + migProgress.failed + migProgress.remaining)) * 100)
                    : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----- Очистка дублей и скрытых ----- */}
      <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <Icon name="Trash2" size={20} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Очистка дублей и скрытых видео</p>
            <p className="text-xs text-white/60">
              Удалит все скрытые видео и оставит только одну копию из каждой группы дублей (по автору + описанию). Сохранится самое старое не-скрытое видео.
            </p>
          </div>
          {!cleanupInfo ? (
            <button
              onClick={previewCleanup}
              disabled={cleanupBusy}
              className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {cleanupBusy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Search" size={16} />}
              Проверить
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={runCleanup}
                disabled={cleanupBusy || cleanupInfo.to_delete === 0}
                className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
              >
                <Icon name="Trash2" size={16} />
                Удалить ({cleanupInfo.to_delete})
              </button>
              <button
                onClick={() => setCleanupInfo(null)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
              >
                Отмена
              </button>
            </div>
          )}
        </div>
        {cleanupInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-white/50">Всего</div>
              <div className="text-white font-semibold text-base">{cleanupInfo.total}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-white/50">Скрытых</div>
              <div className="text-orange-400 font-semibold text-base">{cleanupInfo.hidden}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-white/50">Дублей</div>
              <div className="text-rose-400 font-semibold text-base">{cleanupInfo.duplicates}</div>
            </div>
            <div className="bg-black/30 rounded-lg p-2">
              <div className="text-white/50">Останется</div>
              <div className="text-emerald-400 font-semibold text-base">{cleanupInfo.will_remain}</div>
            </div>
          </div>
        )}
      </div>

      {/* ----- Разведка short-video.ru ----- */}
      <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3 flex-wrap">
          <Icon name="Radar" size={20} className="text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Разведка short-video.ru</p>
            <p className="text-xs text-white/60">Залогинимся на short-video.ru с сохранёнными секретами и узнаем настоящие пути к файлам видео и превью.</p>
          </div>
          <button
            onClick={runProbe}
            disabled={probeBusy}
            className="px-3 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {probeBusy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Play" size={16} />}
            Запустить разведку
          </button>
        </div>
        {!!probeResult && (
          <pre className="bg-black/40 rounded-lg p-3 text-[11px] text-white/80 overflow-auto max-h-80 whitespace-pre-wrap break-all">
            {JSON.stringify(probeResult, null, 2)}
          </pre>
        )}
      </div>

      {/* ----- Импорт ZIP с Яндекс.Диска ----- */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Icon name="Archive" size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Импорт legacy-видео из ZIP-архива (Я.Диск)</p>
            <p className="text-xs text-white/60">
              Загрузи папку с файлами на Я.Диск, опубликуй её и вставь ссылку сюда. Бэкенд распакует архив и обновит ссылки в базе на наш CDN. Имена файлов в архиве должны совпадать с именами в URL базы.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={yadiskUrl}
            onChange={(e) => setYadiskUrl(e.target.value)}
            placeholder="https://disk.yandex.ru/d/..."
            className="flex-1 min-w-[260px] px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white text-sm placeholder:text-white/30"
            disabled={yadiskBusy || yadiskImporting}
          />
          <button
            onClick={yadiskIndex}
            disabled={yadiskBusy || yadiskImporting || !yadiskUrl.trim()}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {yadiskBusy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Search" size={16} />}
            Проверить
          </button>
        </div>
        {yadiskInfo && (
          <div className="bg-black/30 rounded-lg p-3 text-xs space-y-2">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/80">
              <span>Размер: <b className="text-white">{fmtBytes(yadiskInfo.archive_size)}</b></span>
              <span>Файлов в архиве: <b className="text-white">{yadiskInfo.total_files}</b></span>
              <span>Совпало с базой: <b className="text-emerald-400">{yadiskInfo.matched_in_db}</b></span>
            </div>
            {yadiskInfo.sample.length > 0 && (
              <div className="text-white/50 truncate">Примеры: {yadiskInfo.sample.join(", ")}</div>
            )}
            <div className="flex gap-2 pt-1">
              {!yadiskImporting ? (
                <>
                  <button
                    onClick={yadiskImport}
                    disabled={yadiskInfo.matched_in_db === 0}
                    className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    title="Только обновить URL в существующих записях БД"
                  >
                    <Icon name="Play" size={14} />
                    Обновить совпадения ({yadiskInfo.matched_in_db})
                  </button>
                  <button
                    onClick={yadiskImportAll}
                    className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-semibold hover:opacity-90 flex items-center gap-2"
                    title="Залить ВСЕ файлы и создать новые записи в БД"
                  >
                    <Icon name="Upload" size={14} />
                    Залить всё новыми
                  </button>
                </>
              ) : (
                <button
                  onClick={stopYadiskImport}
                  className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/15"
                >
                  Остановить
                </button>
              )}
            </div>
          </div>
        )}
        {yadiskProgress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>
                Обработано: <b>{yadiskProgress.offset}/{yadiskProgress.total}</b> ·
                Перенесено: <b className="text-emerald-400">{yadiskProgress.migrated}</b> ·
                Пропущено: <b>{yadiskProgress.skipped}</b>
              </span>
              {yadiskImporting && <span className="flex items-center gap-1"><Icon name="Loader2" size={12} className="animate-spin" /> идёт</span>}
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${yadiskProgress.total > 0 ? Math.round((yadiskProgress.offset / yadiskProgress.total) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по автору, описанию..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-white/30"
        />
        <button onClick={load} className="px-4 rounded-xl bg-zinc-900 border border-white/10 hover:bg-white/5">
          <Icon name="RefreshCw" size={18} />
        </button>
        <button
          onClick={() => { setSelectMode((s) => !s); clearSel(); }}
          className={`px-4 rounded-xl text-sm font-medium ${selectMode ? "bg-[#fe2c55] text-white" : "bg-zinc-900 border border-white/10 hover:bg-white/5"}`}
        >
          {selectMode ? "Готово" : "Выбрать"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] uppercase tracking-wider text-white/40 mr-1">Тип:</span>
        <Chip active={kindFilter === "all"} onClick={() => setKindFilter("all")}>Все ({counts.all})</Chip>
        <Chip active={kindFilter === "video"} onClick={() => setKindFilter("video")}>
          <span className="flex items-center gap-1"><Icon name="Video" size={12} /> Видео ({counts.video})</span>
        </Chip>
        <Chip active={kindFilter === "image"} onClick={() => setKindFilter("image")}>
          <span className="flex items-center gap-1"><Icon name="Image" size={12} /> Фото ({counts.image})</span>
        </Chip>
        {counts.unknown > 0 && (
          <Chip active={kindFilter === "unknown"} onClick={() => setKindFilter("unknown")}>
            <span className="flex items-center gap-1"><Icon name="HelpCircle" size={12} /> Прочее ({counts.unknown})</span>
          </Chip>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] uppercase tracking-wider text-white/40 mr-1">Статус:</span>
        <Chip active={visFilter === "all"} onClick={() => setVisFilter("all")}>Все</Chip>
        <Chip active={visFilter === "active"} onClick={() => setVisFilter("active")}>Активные ({counts.active})</Chip>
        <Chip active={visFilter === "hidden"} onClick={() => setVisFilter("hidden")}>Скрытые ({counts.hidden})</Chip>
        <span className="text-[11px] uppercase tracking-wider text-white/40 mx-1 ml-auto">Сортировка:</span>
        <Chip active={sortKey === "new"} onClick={() => setSortKey("new")}>Новые</Chip>
        <Chip active={sortKey === "old"} onClick={() => setSortKey("old")}>Старые</Chip>
        <Chip active={sortKey === "likes"} onClick={() => setSortKey("likes")}>По лайкам</Chip>
        <Chip active={sortKey === "comments"} onClick={() => setSortKey("comments")}>По коммент.</Chip>
      </div>

      <p className="text-xs text-white/40">Показано: {filtered.length} из {videos.length}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading && <p className="text-white/50 col-span-full">Загрузка...</p>}
        {!loading && filtered.length === 0 && <p className="text-white/40 col-span-full text-sm">Нет записей под выбранные фильтры</p>}
        {filtered.map((v) => {
          const isSel = selected.has(v.id);
          return (
            <div
              key={v.id}
              className={`bg-zinc-900 border rounded-xl overflow-hidden relative ${isSel ? "border-[#fe2c55] ring-2 ring-[#fe2c55]/40" : "border-white/10"} ${v.hidden ? "opacity-50" : ""}`}
              onClick={selectMode ? () => toggleSel(v.id) : undefined}
              style={selectMode ? { cursor: "pointer" } : undefined}
            >
              {selectMode && (
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: isSel ? "#fe2c55" : "rgba(0,0,0,0.7)", border: isSel ? "none" : "1.5px solid rgba(255,255,255,0.4)" }}>
                  {isSel && <Icon name="Check" size={14} className="text-white" />}
                </div>
              )}
              <VideoPreview url={v.url} thumbnail={v.thumbnail} hidden={v.hidden} />
              <div className="p-2 space-y-1">
                <p className="text-xs font-medium truncate">{v.author} <span className="text-white/30">@{v.handle}</span></p>
                <p className="text-[11px] text-white/40 truncate">{v.description || "—"}</p>
                <p className="text-[11px] text-white/40">♥ {v.likes || 0} · 💬 {v.comments || 0} · #{v.id}</p>
                {!selectMode && (
                  <div className="flex gap-1 pt-1">
                    <a href={v.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] flex items-center" title="Открыть в новой вкладке">
                      <Icon name="ExternalLink" size={12} />
                    </a>
                    <button onClick={() => hide(v.id, !!v.hidden)} className="flex-1 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px]">
                      {v.hidden ? "Показать" : "Скрыть"}
                    </button>
                    <button onClick={() => del(v.id)} className="px-2 py-1 rounded bg-[#fe2c55]/20 hover:bg-[#fe2c55]/30 text-[#fe2c55]">
                      <Icon name="Trash2" size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectMode && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 border border-white/15 rounded-2xl shadow-2xl px-3 py-2 flex items-center gap-2 max-w-[calc(100vw-2rem)] flex-wrap">
          <span className="text-sm font-semibold text-white px-2">{selected.size} выбрано</span>
          <button onClick={selectAllVisible} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs">Выбрать все</button>
          <button onClick={clearSel} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs">Снять</button>
          <div className="w-px h-6 bg-white/10" />
          <button onClick={() => bulk("hide")} disabled={!selected.size} className="px-3 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-medium disabled:opacity-40">Скрыть</button>
          <button onClick={() => bulk("show")} disabled={!selected.size} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium disabled:opacity-40">Показать</button>
          <button onClick={() => bulk("delete")} disabled={!selected.size} className="px-3 py-1.5 rounded-lg bg-[#fe2c55] text-white text-xs font-semibold disabled:opacity-40">Удалить</button>
        </div>
      )}
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