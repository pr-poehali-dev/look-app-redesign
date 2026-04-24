import { useState } from "react";
import Icon from "@/components/ui/icon";
import ChatRoom from "./ChatRoom";
import CommunitiesScreen from "./CommunitiesScreen";

const AVATARS = [
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
  "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg",
];

export interface Chat {
  id: number;
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

const CHATS: Chat[] = [
  { id: 1, type: "personal", name: "Аня Смирнова", avatar: AVATARS[0], lastMsg: "Увидимся сегодня вечером?", time: "сейчас", unread: 2, online: true },
  { id: 2, type: "group", name: "Команда проекта", avatar: AVATARS[1], lastMsg: "Макс: Готово, проверяйте!", time: "5 мин", unread: 7, online: false, members: 8, avatars: [AVATARS[0], AVATARS[1], AVATARS[2]] },
  { id: 3, type: "personal", name: "Кофе и Уют", avatar: AVATARS[2], lastMsg: "☕ Новый рецепт уже в ленте", time: "12 мин", unread: 0, online: true },
  { id: 4, type: "group", name: "Друзья 🔥", avatar: AVATARS[3], lastMsg: "Вика: Хаха это лучшее 😂", time: "1 ч", unread: 14, online: false, members: 5, avatars: [AVATARS[3], AVATARS[4], AVATARS[0]] },
  { id: 5, type: "personal", name: "Макс Паркур", avatar: AVATARS[1], lastMsg: "Новое видео вышло!", time: "2 ч", unread: 0, online: false },
  { id: 6, type: "personal", name: "Travel Rus", avatar: AVATARS[4], lastMsg: "📍 Алтай — просто космос", time: "вчера", unread: 1, online: false },
  { id: 7, type: "group", name: "Фотоклуб", avatar: AVATARS[2], lastMsg: "Денис: Смотрите какой кадр!", time: "вчера", unread: 0, online: false, members: 23, avatars: [AVATARS[2], AVATARS[1], AVATARS[4]] },
];

const STORIES = [
  { name: "Аня", avatar: AVATARS[0] },
  { name: "Макс", avatar: AVATARS[1] },
  { name: "Кофе", avatar: AVATARS[2] },
  { name: "Саша", avatar: AVATARS[3] },
  { name: "Алекс", avatar: AVATARS[4] },
];

type Tab = "chats" | "communities";

const MessagesScreen = () => {
  const [tab, setTab] = useState<Tab>("chats");
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [search, setSearch] = useState("");

  if (openChat) return <ChatRoom chat={openChat} onBack={() => setOpenChat(null)} />;
  if (tab === "communities") return <CommunitiesScreen onBack={() => setTab("chats")} />;

  const filtered = CHATS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-black flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-4 pt-14 pb-3">
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



      {/* Stories row */}
      <div className="flex gap-4 px-4 pb-4 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <div className="w-14 h-14 rounded-full bg-white/10 border border-dashed border-white/20 flex items-center justify-center">
            <Icon name="Plus" size={22} className="text-white/50" />
          </div>
          <span className="text-white/40 text-[10px]">Мой статус</span>
        </div>
        {STORIES.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#fe2c55] to-[#61d4f0]">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img src={s.avatar} alt={s.name} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-white/60 text-[10px]">{s.name}</span>
          </div>
        ))}
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
        {filtered.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setOpenChat(chat)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/8 transition-colors"
          >
            {/* Avatar */}
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

            {/* Info */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-white font-semibold text-sm">{chat.name}</span>
                  {chat.type === "group" && <Icon name="Users" size={11} className="text-white/30" />}
                </div>
                <span className="text-white/30 text-xs">{chat.time}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs truncate">{chat.lastMsg}</span>
                {chat.unread > 0 && (
                  <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-[#fe2c55] text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                    {chat.unread > 99 ? "99+" : chat.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
        <div className="pb-28" />
      </div>
    </div>
  );
};

export default MessagesScreen;