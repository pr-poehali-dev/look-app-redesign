import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import ChatRoom from "./ChatRoom";
import GroupCallScreen from "./GroupCallScreen";
import { Chat } from "./MessagesScreen";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";
const CATEGORIES = ["Все", "Фото", "Путешествия", "Спорт", "Игры", "Еда", "Музыка"];

interface Community {
  id: string;
  name: string;
  description: string;
  type: "open" | "closed";
  category: string;
  img: string;
  members: number;
  joined: boolean;
}

interface Props { onBack: () => void; }

const CommunitiesScreen = ({ onBack }: Props) => {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Все");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"open" | "closed">("open");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("Другое");
  const [creating, setCreating] = useState(false);
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [groupCall, setGroupCall] = useState<{ communityId: string; name: string; mode: "audio" | "video" } | null>(null);

  const loadCommunities = () => {
    if (!user) return;
    fetch(`${API}?module=community&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setCommunities(data.communities || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadCommunities(); }, [user]);

  const handleJoin = async (com: Community) => {
    if (!user) return;
    if (com.type === "closed" && !com.joined) {
      alert("Заявка на вступление отправлена! Администратор рассмотрит её.");
      return;
    }
    const action = com.joined ? "leave" : "join";
    await fetch(`${API}?module=community`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      body: JSON.stringify({ action, community_id: com.id }),
    });
    setCommunities(prev => prev.map(c => c.id === com.id ? { ...c, joined: !c.joined, members: c.members + (c.joined ? -1 : 1) } : c));
  };

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
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
    }
    setCreating(false);
  };

  const openCommunityChat = (com: Community) => {
    const chat: Chat = {
      id: `community_${com.id}`,
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

  const filtered = communities.filter(c => category === "Все" || c.category === category);

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
          className="flex items-center gap-1.5 bg-[#fe2c55] px-3 py-1.5 rounded-full"
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
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${category === cat ? "bg-white text-black" : "bg-white/10 text-white/60"}`}
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
          <div className="flex gap-2">
            {(["open", "closed"] as const).map(t => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all ${newType === t ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/50"}`}
              >
                <Icon name={t === "open" ? "Globe" : "Lock"} size={14} />
                {t === "open" ? "Открытое" : "Закрытое"}
              </button>
            ))}
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="py-2.5 rounded-xl bg-[#fe2c55] text-white font-bold text-sm disabled:opacity-40"
          >
            {creating ? "Создаём..." : "Создать"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-scroll px-4 flex flex-col gap-3 pb-28" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.map(com => (
          <div key={com.id} className="bg-[#111] rounded-2xl overflow-hidden border border-white/8">
            <div className="relative h-24">
              {com.img ? (
                <img src={com.img} className="w-full h-full object-cover opacity-70" alt={com.name} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#fe2c55]/30 to-[#8b5cf6]/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
                <Icon name={com.type === "open" ? "Globe" : "Lock"} size={10} className="text-white/70" />
                <span className="text-white/70 text-[10px]">{com.type === "open" ? "Открытое" : "Закрытое"}</span>
              </div>
              {com.joined && (
                <div className="absolute top-2 left-2 bg-[#fe2c55] px-2 py-0.5 rounded-full">
                  <span className="text-white text-[10px] font-bold">Участник</span>
                </div>
              )}
              <div className="absolute bottom-2 left-3">
                <span className="text-white/50 text-[10px] bg-black/40 px-2 py-0.5 rounded-full">{com.category}</span>
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-white font-bold text-sm">{com.name}</h3>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Icon name="Users" size={11} className="text-white/30" />
                  <span className="text-white/40 text-xs">{com.members >= 1000 ? (com.members / 1000).toFixed(1) + "K" : com.members}</span>
                </div>
              </div>
              <p className="text-white/50 text-xs mb-3 leading-snug">{com.description}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => handleJoin(com)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${com.joined ? "bg-white/10 text-white/60" : "bg-[#fe2c55] text-white"}`}
                >
                  {com.joined ? "Выйти" : com.type === "closed" ? "Подать заявку" : "Вступить"}
                </button>
                {com.joined && (
                  <>
                    <button
                      onClick={() => openCommunityChat(com)}
                      className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
                    >
                      <Icon name="MessageCircle" size={16} className="text-white/60" />
                    </button>
                    <button
                      onClick={() => setGroupCall({ communityId: com.id, name: com.name, mode: "audio" })}
                      className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
                    >
                      <Icon name="Phone" size={16} className="text-green-400" />
                    </button>
                    <button
                      onClick={() => setGroupCall({ communityId: com.id, name: com.name, mode: "video" })}
                      className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"
                    >
                      <Icon name="Video" size={16} className="text-[#00a2ff]" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunitiesScreen;