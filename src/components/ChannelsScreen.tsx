import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import ChannelView from "./channels/ChannelView";
import { Channel } from "./channels/types";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface Props {
  onBack: () => void;
  initialChannelId?: string | null;
  onInitialConsumed?: () => void;
}

const ChannelsScreen = ({ onBack, initialChannelId, onInitialConsumed }: Props) => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState<"open" | "closed">("open");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initialChannelId || null);

  const headers = {
    "Content-Type": "application/json",
    "X-User-Id": user?.id || "anon",
    "X-User-Name": encodeURIComponent(user?.name || ""),
  };

  const load = () => {
    if (!user) return;
    fetch(`${API}?module=community&action=list`, { headers })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setChannels((data.communities || []).filter((c: Channel) => c.kind === "channel"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);
  useEffect(() => { if (initialChannelId) onInitialConsumed?.(); }, []);

  const create = async () => {
    if (!name.trim() || !user) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST", headers,
        body: JSON.stringify({ action: "create", kind: "channel", name: name.trim(), description: desc, type, category: "Другое" }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        setShowCreate(false);
        setName("");
        setDesc("");
        await load();
      } else {
        alert(data.error === "login required" ? "Нужно войти в аккаунт" : "Не удалось создать канал");
      }
    } catch {
      alert("Не удалось создать канал. Проверь интернет.");
    }
    setCreating(false);
  };

  const patch = (id: string, p: Partial<Channel>) =>
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, ...p } : c)));

  const current = channels.find(c => c.id === openId);
  if (current) {
    return (
      <ChannelView
        channel={current}
        onBack={() => { setOpenId(null); load(); }}
        onChanged={(p) => patch(current.id, p)}
        onDeleted={() => { setChannels(prev => prev.filter(c => c.id !== current.id)); setOpenId(null); }}
      />
    );
  }

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()));
  const mine = filtered.filter(c => c.joined || c.is_admin);
  const others = filtered.filter(c => !(c.joined || c.is_admin));

  const Row = ({ c }: { c: Channel }) => (
    <button onClick={() => setOpenId(c.id)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#111] border border-white/8 text-left active:scale-[0.99] transition-transform">
      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
        {c.img ? <img src={c.img} className="w-full h-full object-cover" alt="" /> : <Icon name="Megaphone" size={20} className="text-white" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-white font-semibold text-sm truncate">{c.name}</p>
          {c.type === "closed" && <Icon name="Lock" size={11} className="text-white/40" />}
          {c.is_admin && <Icon name="Crown" size={11} className="text-amber-400" />}
        </div>
        <p className="text-white/40 text-xs truncate">{c.description || "Канал"}</p>
      </div>
      <div className="flex items-center gap-1 text-white/40 text-xs flex-shrink-0">
        <Icon name="Users" size={11} />
        {c.members}
      </div>
    </button>
  );

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack}><Icon name="ChevronLeft" size={24} className="text-white" /></button>
          <h2 className="text-white font-bold text-xl">Каналы</h2>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-[#fe2c55] hover:bg-[#e0264c] active:scale-95 transition-all px-3 py-1.5 rounded-full">
          <Icon name="Plus" size={14} className="text-white" />
          <span className="text-white text-xs font-bold">Создать канал</span>
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-2.5">
          <Icon name="Search" size={16} className="text-white/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск каналов" className="flex-1 bg-transparent text-white text-base outline-none placeholder-white/30" />
        </div>
      </div>

      {showCreate && (
        <div className="mx-4 mb-4 bg-[#111] rounded-2xl border border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm">Новый канал</span>
            <button onClick={() => setShowCreate(false)}><Icon name="X" size={18} className="text-white/40" /></button>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Название канала..." className="bg-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-500 border border-white/10" />
          <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Описание (необязательно)..." className="bg-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-500 border border-white/10" />
          <div className="flex gap-2">
            {(["open", "closed"] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold border ${type === t ? "bg-[#fe2c55] text-white border-[#fe2c55]" : "bg-white/8 text-white/50 border-white/15"}`}
              >
                <Icon name={t === "open" ? "Globe" : "Lock"} size={14} />
                {t === "open" ? "Публичный" : "Закрытый"}
              </button>
            ))}
          </div>
          <button onClick={create} disabled={!name.trim() || creating} className="py-2.5 rounded-xl bg-[#fe2c55] text-white font-bold text-sm disabled:opacity-40">
            {creating ? "Создаём..." : "Создать"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 flex flex-col gap-2 pb-28" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <Icon name="Megaphone" size={36} className="text-white/20" />
            <p className="text-white/40 text-sm">Каналов пока нет. Создай первый.</p>
          </div>
        ) : (
          <>
            {mine.length > 0 && <p className="text-white/40 text-xs font-semibold uppercase mt-1">Мои каналы</p>}
            {mine.map(c => <Row key={c.id} c={c} />)}
            {others.length > 0 && <p className="text-white/40 text-xs font-semibold uppercase mt-3">Все каналы</p>}
            {others.map(c => <Row key={c.id} c={c} />)}
          </>
        )}
      </div>
    </div>
  );
};

export default ChannelsScreen;
