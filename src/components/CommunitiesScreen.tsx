import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import LinkifiedText from "@/components/ui/linkified-text";
import { useAuth } from "@/context/AuthContext";
import ChatRoom from "./ChatRoom";
import GroupCallScreen from "./GroupCallScreen";
import CommunitySettingsScreen from "./CommunitySettingsScreen";
import { Chat } from "./MessagesScreen";
import CircleHub from "./community/CircleHub";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const TOPICS = ["Мода", "Красота", "Путешествия", "Еда", "Интерьер", "Спорт", "Хобби", "Фото", "Игры", "Музыка", "Другое"];
const CATEGORIES = ["Все", ...TOPICS];

interface Community {
  id: string;
  name: string;
  description: string;
  type: "open" | "closed";
  category: string;
  img: string;
  members: number;
  joined: boolean;
  is_admin?: boolean;
  creator_id?: string;
  kind?: string;
}

interface Props {
  onBack: () => void;
  initialCommunityId?: string | null;
  onInitialConsumed?: () => void;
}

const CommunitiesScreen = ({ onBack, initialCommunityId, onInitialConsumed }: Props) => {
  const { user } = useAuth();
  const cacheKey = `communities_cache_v1_${user?.id || "anon"}`;
  const [communities, setCommunities] = useState<Community[]>(() => {
    try {
      const arr = JSON.parse(localStorage.getItem(cacheKey) || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  const [loading, setLoading] = useState(() => {
    try { return !localStorage.getItem(cacheKey); } catch { return true; }
  });
  const [category, setCategory] = useState("Все");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"open" | "closed">("open");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Другое");
  const [creating, setCreating] = useState(false);
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [groupCall, setGroupCall] = useState<{ communityId: string; name: string; mode: "audio" | "video" } | null>(null);
  const [settingsCom, setSettingsCom] = useState<Community | null>(null);
  const [freshLoaded, setFreshLoaded] = useState(false);
  const [hubCom, setHubCom] = useState<Community | null>(null);
  const [query, setQuery] = useState("");
  const [justJoined, setJustJoined] = useState<Set<string>>(new Set());

  const loadCommunities = () => {
    if (!user) return;
    fetch(`${API}?module=community&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const list = (data.communities || []).filter((c: Community) => c.kind !== "channel");
        setCommunities(list);
        setFreshLoaded(true);
        try { localStorage.setItem(cacheKey, JSON.stringify(list)); } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCommunities(); }, [user]);

  const [invitedConsumed, setInvitedConsumed] = useState(false);
  useEffect(() => {
    if (!initialCommunityId || invitedConsumed || loading || !freshLoaded || !user) return;
    const com = communities.find(c => c.id === initialCommunityId);
    if (!com) {
      // Сообщество не найдено или скрыто
      setInvitedConsumed(true);
      onInitialConsumed?.();
      alert("Сообщество не найдено или больше недоступно");
      return;
    }
    setInvitedConsumed(true);
    onInitialConsumed?.();

    const enterChat = (target: Community) => {
      setOpenChat({
        id: target.id,
        type: "group",
        name: target.name,
        avatar: target.img || "",
        lastMsg: "",
        time: "сейчас",
        unread: 0,
        online: false,
      });
    };

    if (com.joined) {
      enterChat(com);
      return;
    }

    if (com.type === "open") {
      // Авто-вступление в открытое сообщество
      fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action: "join", community_id: com.id }),
      })
        .then(() => {
          setCommunities(prev => prev.map(c => c.id === com.id ? { ...c, joined: true, members: c.members + 1 } : c));
          enterChat({ ...com, joined: true });
        })
        .catch(() => {
          alert("Не удалось присоединиться. Попробуй ещё раз.");
        });
    } else {
      // Закрытое — открываем настройки/инфо, где можно подать заявку
      setSettingsCom(com);
      alert(`«${com.name}» — закрытое сообщество. Подай заявку на вступление.`);
    }
  }, [initialCommunityId, communities, loading, user, invitedConsumed, onInitialConsumed]);

  const handleJoin = async (com: Community) => {
    if (!user) return;
    const action = com.joined ? "leave" : "join";
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action, community_id: com.id }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.pending) {
        alert("Заявка отправлена. Админ её рассмотрит.");
        return;
      }
      if (data.ok) {
        setCommunities(prev => prev.map(c => c.id === com.id ? { ...c, joined: !c.joined, members: c.members + (c.joined ? -1 : 1) } : c));
      }
    } catch {
      alert("Не удалось выполнить действие. Проверь интернет.");
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action: "create", name: newName.trim(), description: newDesc, type: newType, category: newCategory }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        await loadCommunities();
        setShowCreate(false);
        setNewName("");
        setNewDesc("");
      } else {
        const errMsg = data.error === "login required"
          ? "Нужно войти в аккаунт, чтобы создать сообщество"
          : data.error === "name required"
          ? "Укажи название сообщества"
          : "Не удалось создать сообщество. Попробуй ещё раз.";
        alert(errMsg);
      }
    } catch (e) {
      console.error("[Communities] create failed", e);
      alert("Не удалось создать сообщество. Проверь интернет.");
    } finally {
      setCreating(false);
    }
  };

  const openCommunityChat = (com: Community) => {
    const chat: Chat = {
      id: com.id,
      type: "group",
      name: com.name,
      avatar: com.img || "",
      lastMsg: "",
      time: "сейчас",
      unread: 0,
      online: false,
    };
    setOpenChat(chat);
  };

  if (groupCall) return (
    <GroupCallScreen
      roomId={`gcall_${groupCall.communityId}`}
      roomName={groupCall.name}
      mode={groupCall.mode}
      myId={user?.id || "anon"}
      myName={user?.name || "Пользователь"}
      onEnd={() => setGroupCall(null)}
    />
  );

  if (openChat) return (
    <ChatRoom chat={openChat} onBack={() => { setOpenChat(null); }} />
  );

  if (hubCom) return (
    <CircleHub
      communityId={hubCom.id}
      name={hubCom.name}
      description={hubCom.description}
      img={hubCom.img}
      members={hubCom.members}
      creatorId={hubCom.creator_id || ""}
      isMember={hubCom.joined}
      isAdmin={!!hubCom.is_admin}
      onChat={() => { const c = hubCom; setHubCom(null); openCommunityChat(c); }}
      onCall={(mode) => { const c = hubCom; setHubCom(null); setGroupCall({ communityId: c.id, name: c.name, mode }); }}
      onSettings={() => { const c = hubCom; setHubCom(null); setSettingsCom(c); }}
      onClose={() => setHubCom(null)}
    />
  );

  if (settingsCom) return (
    <CommunitySettingsScreen
      community={settingsCom}
      onBack={() => setSettingsCom(null)}
      onUpdated={(patch) => {
        setCommunities(prev => prev.map(c => c.id === settingsCom.id ? { ...c, ...patch } : c));
        setSettingsCom(prev => prev ? { ...prev, ...patch } : prev);
      }}
      onDeleted={() => {
        setCommunities(prev => prev.filter(c => c.id !== settingsCom.id));
        setSettingsCom(null);
      }}
    />
  );

  const q = query.trim().toLowerCase();
  const filtered = communities.filter(c =>
    (category === "Все" || c.category === category) &&
    (!q || c.name.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q))
  );
  const mine = filtered.filter(c => c.joined);
  const recommended = filtered.filter(c => !c.joined || justJoined.has(c.id));

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={onBack}>
            <Icon name="ChevronLeft" size={24} className="text-white" />
          </button>
          <h2 className="text-white font-bold text-xl">Сообщества</h2>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-[#FF5A3C] hover:bg-[#e0264c] active:scale-95 transition-all cursor-pointer px-3 py-1.5 rounded-full"
        >
          <Icon name="Plus" size={14} className="text-white" />
          <span className="text-white text-xs font-bold">Создать</span>
        </button>
      </div>

      <div className="flex gap-2 px-4 pb-3 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${category === cat ? "bg-white text-black" : "bg-white/10 text-white/60 hover:bg-white/20"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {showCreate && (
        <div className="mx-4 mb-4 bg-[#111] rounded-2xl border border-white/10 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-sm">Новое сообщество</span>
            <button onClick={() => setShowCreate(false)}>
              <Icon name="X" size={18} className="text-white/40" />
            </button>
          </div>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Название сообщества..."
            className="bg-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-500 border border-white/10"
          />
          <input
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            placeholder="Описание (необязательно)..."
            className="bg-zinc-800 rounded-xl px-3 py-2.5 text-white text-sm outline-none placeholder-zinc-500 border border-white/10"
          />
          <div className="flex flex-wrap gap-1.5">
            {TOPICS.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setNewCategory(t)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${newCategory === t ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-zinc-800 border-white/10 text-white/70"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(["open", "closed"] as const).map(t => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${newType === t ? "bg-[#FF5A3C] text-white border-[#FF5A3C]" : "bg-white/8 text-white/50 border-white/15 hover:bg-white/15"}`}
              >
                <Icon name={t === "open" ? "Globe" : "Lock"} size={14} />
                {t === "open" ? "Открытое" : "Закрытое"}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="py-2.5 rounded-xl bg-[#FF5A3C] hover:bg-[#e0264c] active:scale-[0.99] transition-all cursor-pointer text-white font-bold text-sm disabled:opacity-40 disabled:hover:bg-[#FF5A3C]"
          >
            {creating ? "Создаём..." : "Создать"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-scroll px-4 flex flex-col gap-5 pb-28" style={{ scrollbarWidth: "none" }}>
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск кружков…"
            className="w-full h-11 rounded-[18px] border border-white/15 bg-transparent pl-10 pr-4 text-sm text-white outline-none placeholder-white/40 focus:border-[#FF5A3C]"
          />
        </div>

        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton-box w-11 h-11 !rounded-full flex-shrink-0" />)}</div>
            {[0, 1, 2].map((i) => <div key={i} className="skeleton-box h-14" />)}
          </div>
        ) : (
          <>
            {mine.length > 0 && (
              <section>
                <h3 className="text-white font-semibold text-[15px] mb-3">Мои кружки</h3>
                <div className="flex gap-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {mine.map((com) => (
                    <button key={com.id} onClick={() => setHubCom(com)} className="flex flex-col items-center gap-1.5 w-16 flex-shrink-0">
                      <span className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-[#FFE9E3] text-[#FF5A3C] font-bold text-lg ${com.is_admin ? "ring-2 ring-[#FF5A3C] ring-offset-2 ring-offset-black" : ""}`}>
                        {com.img ? <img src={com.img} alt="" className="w-full h-full object-cover" loading="lazy" /> : (com.name[0] || "?").toUpperCase()}
                      </span>
                      <span className="text-white/60 text-[11px] leading-tight w-full truncate text-center">{com.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <h3 className="text-white font-semibold text-[15px] mb-3">Рекомендуем</h3>
              {recommended.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">{query ? "Ничего не нашли" : "Пока нет кружков. Создайте первый."}</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {recommended.map((com) => (
                    <div key={com.id} className="flex items-center gap-3">
                      <button onClick={() => (com.joined ? setHubCom(com) : setSettingsCom(com))} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <span className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center bg-[#FFE9E3] text-[#FF5A3C] font-bold flex-shrink-0">
                          {com.img ? <img src={com.img} alt="" className="w-full h-full object-cover" loading="lazy" /> : (com.name[0] || "?").toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-white font-semibold text-[13px] truncate">{com.name}</span>
                          <span className="block text-white/50 text-[11px]">{com.members >= 1000 ? (com.members / 1000).toFixed(1) + "K" : com.members} участников · {com.category}</span>
                        </span>
                      </button>
                      {com.joined ? (
                        <button onClick={() => setHubCom(com)} className="h-6 w-[88px] flex-shrink-0 rounded-full border border-[#2E9E6B] text-[#2E9E6B] text-[11px] font-semibold flex items-center justify-center gap-1">
                          <Icon name="Check" size={11} />Вы в кружке
                        </button>
                      ) : (
                        <button onClick={() => { setJustJoined((p) => new Set(p).add(com.id)); handleJoin(com); }} className="h-6 w-[74px] flex-shrink-0 rounded-full bg-[#FF5A3C] text-white text-[11px] font-semibold">
                          {com.type === "closed" ? "Заявка" : "Войти"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default CommunitiesScreen;
