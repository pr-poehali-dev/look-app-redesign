import { useState, useEffect, useCallback, useRef } from "react";
import Icon from "@/components/ui/icon";

const API = "https://functions.poehali.dev/c578b52c-b9b6-47b3-9bcf-b6ab8405c4d7";
const TOKEN_KEY = "admin_token_v1";

type Section = "dashboard" | "users" | "videos" | "photos" | "comments" | "chats" | "reports" | "streams" | "broadcast" | "email_stats" | "support" | "privacy" | "terms";

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
  { id: "photos", label: "Фото", icon: "Image" },
  { id: "comments", label: "Комментарии", icon: "MessageSquare" },
  { id: "streams", label: "Стримы", icon: "Radio" },
  { id: "reports", label: "Жалобы", icon: "Flag" },
  { id: "broadcast", label: "Рассылки", icon: "Send" },
  { id: "email_stats", label: "Метрики писем", icon: "Mail" },
  { id: "support", label: "Поддержка", icon: "LifeBuoy" },
  { id: "privacy", label: "Политика конф.", icon: "ShieldCheck" },
  { id: "terms", label: "Условия использ.", icon: "FileText" },
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
          {section === "videos" && <Videos token={token!} mediaType="video" />}
              {section === "photos" && <Videos token={token!} mediaType="image" />}
          {section === "comments" && <Comments token={token!} />}
          {section === "chats" && <Chats token={token!} />}
          {section === "streams" && <Streams token={token!} />}
          {section === "reports" && <Reports token={token!} />}
          {section === "broadcast" && <Broadcast token={token!} />}
          {section === "email_stats" && <EmailStats />}
          {section === "support" && <SupportAdmin />}
          {section === "privacy" && <DocEditor token={token!} settingKey="privacy_policy" title="Политика конфиденциальности" />}
          {section === "terms" && <DocEditor token={token!} settingKey="terms_of_use" title="Условия использования" />}
        </div>
      </main>
    </div>
  );
}

const SUPPORT_EMAIL = "support@visov.ru";

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [login, setLogin] = useState(SUPPORT_EMAIL);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState(SUPPORT_EMAIL);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

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

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api("forgot_password", { email: forgotEmail.trim() });
    } catch { /* молча — не раскрываем детали */ }
    setForgotLoading(false);
    setForgotSent(true);
  };

  if (forgot) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <form onSubmit={submitForgot} className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center">
              <Icon name="KeyRound" size={26} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-lg">Восстановление пароля</p>
              <p className="text-white/40 text-xs">Инструкция придёт на почту администратора</p>
            </div>
          </div>
          {forgotSent ? (
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <Icon name="MailCheck" size={18} className="text-emerald-400" />
                <span className="text-emerald-300 text-sm">Запрос отправлен на {SUPPORT_EMAIL}</span>
              </div>
              <button
                type="button"
                onClick={() => { setForgot(false); setForgotSent(false); }}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold"
              >
                Назад ко входу
              </button>
            </div>
          ) : (
            <>
              <input
                autoFocus
                type="email"
                value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="Email администратора"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-[#fe2c55]"
              />
              <button
                type="submit" disabled={forgotLoading || !forgotEmail.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-bold disabled:opacity-50"
              >
                {forgotLoading ? "Отправляем..." : "Отправить инструкцию"}
              </button>
              <button
                type="button"
                onClick={() => setForgot(false)}
                className="w-full text-white/40 text-sm font-medium"
              >
                Назад ко входу
              </button>
            </>
          )}
        </form>
      </div>
    );
  }

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
          type="email"
          value={login} onChange={(e) => setLogin(e.target.value)}
          placeholder="support@visov.ru"
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
        <button
          type="button"
          onClick={() => { setForgot(true); setForgotSent(false); setForgotEmail(login || SUPPORT_EMAIL); }}
          className="w-full text-center text-white/40 text-sm font-medium hover:text-white/70 transition"
        >
          Забыли пароль?
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

function Videos({ token, mediaType = "video" }: { token: string; mediaType?: "video" | "image" }) {
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<KindFilter>(mediaType);
  const [visFilter, setVisFilter] = useState<VisFilter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("new");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [brokenCount, setBrokenCount] = useState(0);
  const [migrating, setMigrating] = useState(false);
  const [migProgress, setMigProgress] = useState<{ migrated: number; failed: number; remaining: number } | null>(null);
  const migAbortRef = useRef(false);

  // При переключении секции (Видео/Фото) сбрасываем фильтр типа и показываем только активные
  useEffect(() => { setKindFilter(mediaType); setVisFilter("active"); }, [mediaType]);

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
    // Счётчики статуса считаем только в рамках текущего фильтра по типу
    if (kindFilter === "all" || k === kindFilter) {
      if (v.hidden) counts.hidden++; else counts.active++;
    }
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
      <h2 className="text-2xl font-bold hidden md:block">{mediaType === "image" ? "Фото" : "Видео"}</h2>

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

      <p className="text-xs text-white/40">Показано: {filtered.length} из {kindFilter === "all" ? videos.length : (kindFilter === "video" ? counts.video : kindFilter === "image" ? counts.image : counts.unknown)}</p>

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

function DocEditor({ token, settingKey, title }: { token: string; settingKey: "privacy_policy" | "terms_of_use"; title: string }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api("settings_get", {}, token);
      setValue(d.settings?.[settingKey] || "");
    } catch (e) {
      alert("Ошибка загрузки: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setLoading(false);
    }
  }, [token, settingKey]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api("settings_save", { key: settingKey, value }, token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      alert("Ошибка сохранения: " + (e instanceof Error ? e.message : "неизвестная"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <button
          onClick={save}
          disabled={saving || loading}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#fe2c55] to-[#8b5cf6] text-white font-semibold text-sm disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Save" size={16} />}
          {saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
      <p className="text-xs text-white/40">
        Этот текст увидят пользователи в приложении в разделе «{title}». Поддерживается обычный текст и переносы строк.
      </p>
      {loading ? (
        <p className="text-white/50">Загрузка...</p>
      ) : (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={24}
          placeholder={`Введите текст «${title.toLowerCase()}»…`}
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder:text-white/30 text-sm resize-y min-h-[400px] font-mono"
        />
      )}
      <p className="text-xs text-white/40">Символов: {value.length}</p>
    </div>
  );
}

const PASSWORD_RESET_URL = "https://functions.poehali.dev/050dfa15-1d92-4aaf-9b87-55d04c9affa7";
const SUPPORT_URL = "https://functions.poehali.dev/c799ab49-0e91-4b94-8ec4-4325db5e1c73";

interface EmailStatsData {
  total: number;
  sent: number;
  failed: number;
  sent_24h: number;
  failed_24h: number;
  by_kind: { kind: string; sent: number; failed: number }[];
  recent: { id: number; to_email: string; subject: string; kind: string; success: boolean; error_msg: string | null; created_at: string }[];
}

function EmailStats() {
  const [data, setData] = useState<EmailStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(PASSWORD_RESET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "email_stats" }),
      });
      const raw = await res.json();
      const json = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading || !data) {
    return <div className="text-white/60">Загружаем метрики...</div>;
  }

  const successRate = data.total > 0 ? Math.round((data.sent / data.total) * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Метрики отправки писем</h2>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm flex items-center gap-2"
        >
          <Icon name="RefreshCw" size={14} />
          Обновить
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat title="Всего" value={data.total} color="text-white" />
        <Stat title="Доставлено" value={data.sent} color="text-green-400" />
        <Stat title="Ошибки" value={data.failed} color="text-red-400" />
        <Stat title="За 24 часа" value={data.sent_24h} color="text-blue-400" />
        <Stat title="Успешность" value={`${successRate}%`} color="text-purple-400" />
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
        <h3 className="font-semibold mb-3">По типу писем</h3>
        <div className="space-y-2">
          {data.by_kind.length === 0 && <p className="text-white/40 text-sm">Пока нет данных</p>}
          {data.by_kind.map((k) => (
            <div key={k.kind} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
              <span className="font-medium">{k.kind}</span>
              <div className="flex gap-4">
                <span className="text-green-400">✓ {k.sent}</span>
                <span className="text-red-400">✗ {k.failed}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
        <h3 className="font-semibold mb-3">Последние письма</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {data.recent.length === 0 && <p className="text-white/40 text-sm">Журнал пуст</p>}
          {data.recent.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 text-sm py-2 border-b border-white/5 last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                    {r.success ? "OK" : "FAIL"}
                  </span>
                  <span className="text-white/80 truncate">{r.to_email}</span>
                </div>
                <p className="text-white/50 text-xs truncate">{r.subject}</p>
                {r.error_msg && <p className="text-red-400 text-xs truncate">{r.error_msg}</p>}
              </div>
              <span className="text-white/40 text-xs whitespace-nowrap">
                {new Date(r.created_at).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{title}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  );
}

interface Ticket {
  id: number;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  subject: string;
  message: string;
  attachment_url: string | null;
  status: string;
  category: string;
  created_at: string;
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string }> = {
  bug: { label: "Баг", icon: "Bug", color: "bg-red-500/20 text-red-400" },
  payment: { label: "Оплата", icon: "CreditCard", color: "bg-emerald-500/20 text-emerald-400" },
  account: { label: "Аккаунт", icon: "UserCog", color: "bg-blue-500/20 text-blue-400" },
  idea: { label: "Идея", icon: "Lightbulb", color: "bg-yellow-500/20 text-yellow-400" },
  suggestion: { label: "Предложение", icon: "MessageSquarePlus", color: "bg-purple-500/20 text-purple-400" },
  content: { label: "Контент", icon: "Flag", color: "bg-orange-500/20 text-orange-400" },
  other: { label: "Другое", icon: "HelpCircle", color: "bg-white/10 text-white/70" },
};

function SupportAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(SUPPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      });
      const raw = await res.json();
      const json = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      setTickets(json.tickets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filteredTickets = categoryFilter === "all"
    ? tickets
    : tickets.filter((t) => (t.category || "other") === categoryFilter);

  const categoryCounts = tickets.reduce<Record<string, number>>((acc, t) => {
    const key = t.category || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const updateStatus = async (id: number, status: string) => {
    await fetch(SUPPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_status", id, status }),
    });
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    if (selected?.id === id) setSelected({ ...selected, status });
  };

  if (loading) return <div className="text-white/60">Загружаем тикеты...</div>;

  const statusColor: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400",
    in_progress: "bg-yellow-500/20 text-yellow-400",
    done: "bg-green-500/20 text-green-400",
  };
  const statusLabel: Record<string, string> = {
    new: "Новый",
    in_progress: "В работе",
    done: "Решён",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Обращения в поддержку ({filteredTickets.length}/{tickets.length})</h2>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm flex items-center gap-2">
          <Icon name="RefreshCw" size={14} /> Обновить
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            categoryFilter === "all" ? "bg-[#fe2c55] text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          Все ({tickets.length})
        </button>
        {Object.entries(CATEGORY_META).map(([id, meta]) => {
          const count = categoryCounts[id] || 0;
          if (count === 0 && categoryFilter !== id) return null;
          const active = categoryFilter === id;
          return (
            <button
              key={id}
              onClick={() => setCategoryFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                active ? "bg-[#fe2c55] text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <Icon name={meta.icon} size={12} />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {filteredTickets.length === 0 ? (
        <div className="text-white/40 text-sm bg-zinc-900 border border-white/10 rounded-xl p-8 text-center">
          {tickets.length === 0 ? "Пока нет обращений" : "Нет обращений в этой категории"}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-xl divide-y divide-white/5">
          {filteredTickets.map((t) => {
            const cat = CATEGORY_META[t.category || "other"] || CATEGORY_META.other;
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor[t.status] || "bg-white/10"}`}>
                      {statusLabel[t.status] || t.status}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${cat.color}`}>
                      <Icon name={cat.icon} size={10} />
                      {cat.label}
                    </span>
                    <p className="font-semibold truncate">{t.subject}</p>
                  </div>
                  <p className="text-white/60 text-sm truncate">
                    {t.user_name || "Аноним"} {t.user_email && `· ${t.user_email}`}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{new Date(t.created_at).toLocaleString("ru-RU")}</p>
                </div>
                {t.attachment_url && <Icon name="Paperclip" size={16} className="text-white/40 mt-1" />}
                <Icon name="ChevronRight" size={18} className="text-white/30" />
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-white/10 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const cat = CATEGORY_META[selected.category || "other"] || CATEGORY_META.other;
                    return (
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 ${cat.color}`}>
                        <Icon name={cat.icon} size={11} />
                        {cat.label}
                      </span>
                    );
                  })()}
                </div>
                <h3 className="font-bold text-lg">{selected.subject}</h3>
                <p className="text-white/50 text-sm mt-1">
                  {selected.user_name || "Аноним"} {selected.user_email && `· ${selected.user_email}`}
                </p>
                <p className="text-white/40 text-xs mt-0.5">{new Date(selected.created_at).toLocaleString("ru-RU")}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-white/40 text-xs font-semibold uppercase mb-2">Сообщение</p>
                <p className="bg-white/5 rounded-xl p-3 text-sm whitespace-pre-wrap">{selected.message}</p>
              </div>

              {selected.attachment_url && (
                <div>
                  <p className="text-white/40 text-xs font-semibold uppercase mb-2">Файл</p>
                  <a
                    href={selected.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-white/5 rounded-xl p-3 text-sm text-blue-400 hover:bg-white/10"
                  >
                    <Icon name="Paperclip" size={16} />
                    Открыть прикреплённый файл
                  </a>
                </div>
              )}

              <div>
                <p className="text-white/40 text-xs font-semibold uppercase mb-2">Статус</p>
                <div className="flex gap-2">
                  {(["new", "in_progress", "done"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => updateStatus(selected.id, st)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                        selected.status === st ? statusColor[st] : "bg-white/5 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      {statusLabel[st]}
                    </button>
                  ))}
                </div>
              </div>

              {selected.user_email && (
                <a
                  href={`mailto:${selected.user_email}?subject=Re:%20${encodeURIComponent(selected.subject)}`}
                  className="block w-full py-3 rounded-xl bg-[#fe2c55] text-white font-bold text-sm text-center"
                >
                  Ответить на email
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}