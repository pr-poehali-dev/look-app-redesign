import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ChatRoom from "./ChatRoom";
import CommunitiesScreen from "./CommunitiesScreen";
import { useAuth } from "@/context/AuthContext";

const AVATARS = [
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg",
];

export interface Chat {
  id: string | number;
  type: "personal" | "group";
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  members?: number;
  avatars?: string[];
}

const MOCK_CHATS: Chat[] = [
  { id: "mock_1", type: "personal", name: "Аня Смирнова", avatar: AVATARS[0], lastMsg: "Увидимся сегодня вечером?", time: "сейчас", unread: 2, online: true },
  { id: "mock_2", type: "group", name: "Команда проекта", avatar: AVATARS[1], lastMsg: "Макс: Готово, проверяйте!", time: "5 мин", unread: 7, online: false, members: 8, avatars: [AVATARS[0], AVATARS[1], AVATARS[2]] },
  { id: "mock_3", type: "personal", name: "Кофе и Уют", avatar: AVATARS[2], lastMsg: "☕ Новый рецепт уже в ленте", time: "12 мин", unread: 0, online: true },
  { id: "mock_4", type: "group", name: "Друзья 🔥", avatar: AVATARS[3], lastMsg: "Вика: Хаха это лучшее 😂", time: "1 ч", unread: 14, online: false, members: 5, avatars: [AVATARS[3], AVATARS[4], AVATARS[0]] },
  { id: "mock_5", type: "personal", name: "Макс Паркур", avatar: AVATARS[1], lastMsg: "Новое видео вышло!", time: "2 ч", unread: 0, online: false },
];

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

type Tab = "chats" | "communities";

const MessagesScreen = () => {
  const [tab, setTab] = useState<Tab>("chats");
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  const loadChats = () => {
    if (!user) return;
    fetch(`${CHAT_API}?module=chat&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": user.name },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        const dbChats: Chat[] = (data.chats || []).map((c: Chat) => ({
          ...c,
          avatar: c.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
          unread: 0,
        }));
        setChats([...dbChats, ...MOCK_CHATS]);
      })
      .catch(() => setChats(MOCK_CHATS))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadChats();
  }, [user]);

  const handleCreateChat = async () => {
    if (!newChatName.trim() || !user) return;
    setCreating(true);
    try {
      const res = await fetch(CHAT_API + "?module=chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": user.name },
        body: JSON.stringify({ action: "create_chat", name: newChatName.trim(), chat_type: "personal" }),
      });
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      if (data.chat_id) {
        const newChat: Chat = {
          id: data.chat_id,
          type: "personal",
          name: newChatName.trim(),
          avatar: user.avatar || AVATARS[0],
          lastMsg: "",
          time: "сейчас",
          unread: 0,
          online: true,
        };
        setChats(prev => [newChat, ...prev]);
        setOpenChat(newChat);
      }
    } catch (e) { console.error(e); }
    setCreating(false);
    setShowNewChat(false);
    setNewChatName("");
  };

  if (openChat) return <ChatRoom chat={openChat} onBack={() => { setOpenChat(null); loadChats(); }} />;
  if (tab === "communities") return <CommunitiesScreen onBack={() => setTab("chats")} />;

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 pb-3">
        <h2 className="text-white font-bold text-xl">Чаты</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewChat(true)}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Icon name="Plus" size={18} className="text-white" />
          </button>
          <button
            onClick={() => setTab("communities")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] text-white text-sm font-medium"
          >
            <Icon name="Users" size={15} className="text-white" />
            Сообщества
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white/8 rounded-full px-4 py-2.5">
          <Icon name="Search" size={16} className="text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
          />
        </div>
      </div>

      <div className="flex gap-4 px-4 pb-4 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0" onClick={() => setShowNewChat(true)}>
          <div className="w-14 h-14 rounded-full bg-white/10 border border-dashed border-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition-transform">
            <Icon name="Plus" size={22} className="text-white/50" />
          </div>
          <span className="text-white/40 text-[10px]">Мой статус</span>
        </div>
        {filtered.slice(0, 6).map((s) => (
          <div key={String(s.id)} className="flex flex-col items-center gap-1.5 flex-shrink-0" onClick={() => setOpenChat(s)}>
            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#fe2c55] to-[#61d4f0] cursor-pointer active:scale-95 transition-transform">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-white/60 text-[10px] w-14 text-center truncate">{s.name.split(" ")[0]}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          filtered.map((chat) => (
            <button
              key={String(chat.id)}
              onClick={() => setOpenChat(chat)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/8 transition-colors"
            >
              <div className="relative flex-shrink-0">
                {chat.type === "group" && chat.avatars ? (
                  <div className="w-12 h-12 relative">
                    <img src={chat.avatars[0]} className="w-9 h-9 rounded-full absolute top-0 left-0 border-2 border-black object-cover" alt="" />
                    <img src={chat.avatars[1]} className="w-9 h-9 rounded-full absolute bottom-0 right-0 border-2 border-black object-cover" alt="" />
                  </div>
                ) : (
                  <img src={chat.avatar} className="w-12 h-12 rounded-full object-cover" alt={chat.name} />
                )}
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-black" />
                )}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-white font-semibold text-sm">{chat.name}</span>
                    {chat.type === "group" && <Icon name="Users" size={11} className="text-white/30" />}
                  </div>
                  <span className="text-white/30 text-xs">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/50 text-xs truncate">{chat.lastMsg || "Нет сообщений"}</span>
                  {chat.unread > 0 && (
                    <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-[#fe2c55] text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                      {chat.unread > 99 ? "99+" : chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
        <div className="pb-28" />
      </div>

      {showNewChat && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-end justify-center">
          <div className="bg-zinc-900 rounded-t-3xl w-full p-6 pb-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-white font-bold text-lg">Новый чат</span>
              <button onClick={() => setShowNewChat(false)}>
                <Icon name="X" size={22} className="text-white/60" />
              </button>
            </div>
            <input
              value={newChatName}
              onChange={e => setNewChatName(e.target.value)}
              placeholder="Название чата..."
              className="w-full bg-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-white/30 mb-4"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleCreateChat()}
            />
            <button
              onClick={handleCreateChat}
              disabled={!newChatName.trim() || creating}
              className="w-full py-3.5 rounded-xl bg-[#fe2c55] text-white font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Создать
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesScreen;