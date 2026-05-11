import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import ChatRoom from "./ChatRoom";
import CommunitiesScreen from "./CommunitiesScreen";
import CallScreen from "./CallScreen";
import CallHistoryScreen from "./CallHistoryScreen";
import { useAuth } from "@/context/AuthContext";
import { useUnread } from "@/context/UnreadContext";

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
  typing?: string;
}

interface AppUser {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
}

const CHAT_API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

type Tab = "chats" | "communities" | "calls";

interface MessagesScreenProps {
  initialCommunityId?: string | null;
  onCommunityConsumed?: () => void;
  initialDirectHandle?: string | null;
  onDirectConsumed?: () => void;
}

const MessagesScreen = ({ initialCommunityId, onCommunityConsumed, initialDirectHandle, onDirectConsumed }: MessagesScreenProps = {}) => {
  const [tab, setTab] = useState<Tab>(initialCommunityId ? "communities" : "chats");
  const [openChat, setOpenChat] = useState<Chat | null>(null);
  const [search, setSearch] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [creating, setCreating] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [activeCall, setActiveCall] = useState<{ user: { id: string; name: string }; mode: "audio" | "video" } | null>(null);
  const [onlineMenu, setOnlineMenu] = useState<AppUser | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { user } = useAuth();
  const { refresh: refreshUnread } = useUnread();

  const loadChats = () => {
    if (!user) return;
    fetch(`${CHAT_API}?module=chat&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        const dbChats: Chat[] = (data.chats || []).map((c: Chat) => ({
          ...c,
          avatar: c.avatar || "",
          unread: c.unread || 0,
        }));
        setChats(dbChats);
        refreshUnread();
      })
      .catch(() => setChats([]))
      .finally(() => setLoading(false));
  };

  const loadAllUsers = () => {
    if (!user) return;
    fetch(`${CHAT_API}?module=chat&action=all_users`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        setAllUsers(data.users || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadChats();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadAllUsers();
    heartbeatRef.current = setInterval(() => {
      loadAllUsers();
    }, 25000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user]);

  useEffect(() => {
    if (!initialDirectHandle || !user) return;
    let cancelled = false;
    import("@/data/authors").then(({ getAuthor }) => {
      if (cancelled) return;
      const author = getAuthor(initialDirectHandle);
      const peerId = `handle_${initialDirectHandle}`;
      const chat: Chat = {
        id: `dm_${[user.id, peerId].sort().join("_")}`,
        type: "personal",
        name: author.name || initialDirectHandle,
        avatar: author.avatar || "",
        lastMsg: "",
        time: "сейчас",
        unread: 0,
        online: false,
      };
      setTab("chats");
      setOpenChat(chat);
      onDirectConsumed?.();
    });
    return () => { cancelled = true; };
  }, [initialDirectHandle, user]);

  const handleCreateChat = async () => {
    if (!newChatName.trim() || !user) return;
    setCreating(true);
    try {
      const res = await fetch(CHAT_API + "?module=chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
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

  const startCall = async (u: { id: string; name: string }, mode: "audio" | "video") => {
    setOnlineMenu(null);
    if (!user) return;
    const roomId = `call_${[user.id, u.id].sort().join("_")}`;
    await fetch(`${CHAT_API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      body: JSON.stringify({
        room_id: `incoming_${u.id}`,
        to_user: u.id,
        type: "call_invite",
        payload: { callerId: user.id, callerName: user.name, mode, roomId },
      }),
    }).catch(() => {});
    setActiveCall({ user: u, mode });
  };

  if (activeCall) return (
    <CallScreen
      name={activeCall.user.name}
      avatar=""
      mode={activeCall.mode}
      myId={user?.id || "anon"}
      peerId={activeCall.user.id}
      isCaller={true}
      onEnd={() => setActiveCall(null)}
    />
  );

  const openChatWithUser = (u: AppUser) => {
    const chat: Chat = {
      id: `dm_${[user?.id, u.id].sort().join("_")}`,
      type: "personal",
      name: u.name,
      avatar: u.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
      lastMsg: "",
      time: "сейчас",
      unread: 0,
      online: u.online,
    };
    setOnlineMenu(null);
    setOpenChat(chat);
  };

  if (tab === "communities") return (
    <CommunitiesScreen
      onBack={() => setTab("chats")}
      initialCommunityId={initialCommunityId}
      onInitialConsumed={onCommunityConsumed}
    />
  );
  if (tab === "calls") return (
    <CallHistoryScreen
      onBack={() => setTab("chats")}
      onCall={(peer, mode) => { setTab("chats"); startCall(peer, mode); }}
    />
  );

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-black flex md:flex-row flex-col overflow-hidden">
      {/* На мобиле: если открыт чат — показываем только его */}
      {openChat && (
        <div className="md:hidden absolute inset-0 z-40 bg-black">
          <ChatRoom chat={openChat} onBack={() => { setOpenChat(null); loadChats(); }} />
        </div>
      )}

      {/* Sidebar со списком чатов (на десктопе — фиксированная ширина) */}
      <div className="flex flex-col h-full md:w-[380px] md:flex-shrink-0 md:border-r md:border-white/8 w-full overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 md:pt-4 pb-3">
        <h2 className="text-white font-bold text-xl">Чаты</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("calls")}
            className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <Icon name="Phone" size={17} className="text-white" />
          </button>
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
            className="flex-1 bg-transparent text-white text-base outline-none placeholder-white/30"
          />
        </div>
      </div>

      {allUsers.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/40 text-xs font-medium">Пользователи</span>
            <span className="text-white/25 text-xs">{allUsers.filter(u => u.online).length} онлайн · {allUsers.length} всего</span>
          </div>
          <div className="flex gap-3 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
            {allUsers.map((u) => (
              <div
                key={u.id}
                className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer active:scale-95 transition-transform"
                onClick={() => setOnlineMenu(onlineMenu?.id === u.id ? null : u)}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-colors ${onlineMenu?.id === u.id ? "border-[#fe2c55]" : "border-white/10"} ${!u.online ? "opacity-60" : ""}`}>
                    <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
                  </div>
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${u.online ? "bg-green-400" : "bg-white/30"}`} />
                </div>
                <span className={`text-[10px] w-12 text-center truncate ${u.online ? "text-white/70" : "text-white/40"}`}>{u.name.split(" ")[0]}</span>
              </div>
            ))}
          </div>

          {onlineMenu && (
            <div className="mt-3 bg-white/8 rounded-2xl overflow-hidden border border-white/10">
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
                <span className="text-white/60 text-xs">{onlineMenu.name}</span>
                <span className={`text-[10px] ${onlineMenu.online ? "text-green-400" : "text-white/30"}`}>
                  {onlineMenu.online ? "онлайн" : "оффлайн"}
                </span>
              </div>
              <div className="flex">
                <button
                  onClick={() => openChatWithUser(onlineMenu)}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 hover:bg-white/5 transition-colors"
                >
                  <Icon name="MessageCircle" size={20} className="text-[#00a2ff]" />
                  <span className="text-white/60 text-[11px]">Написать</span>
                </button>
                <div className="w-px bg-white/8" />
                <button
                  onClick={() => startCall(onlineMenu, "audio")}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 hover:bg-white/5 transition-colors"
                >
                  <Icon name="Phone" size={20} className="text-green-400" />
                  <span className="text-white/60 text-[11px]">Аудио</span>
                </button>
                <div className="w-px bg-white/8" />
                <button
                  onClick={() => startCall(onlineMenu, "video")}
                  className="flex-1 flex flex-col items-center gap-1.5 py-3 hover:bg-white/5 transition-colors"
                >
                  <Icon name="Video" size={20} className="text-[#fe2c55]" />
                  <span className="text-white/60 text-[11px]">Видео</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/8 transition-colors ${
                openChat && String(openChat.id) === String(chat.id) ? "md:bg-white/10" : ""
              }`}
            >
              <div className="relative flex-shrink-0">
                {chat.type === "group" && chat.avatars ? (
                  <div className="w-12 h-12 relative">
                    <div className="w-9 h-9 rounded-full absolute top-0 left-0 border-2 border-black overflow-hidden">
                      <UserAvatar src={chat.avatars[0]} name={chat.name} alt="" />
                    </div>
                    <div className="w-9 h-9 rounded-full absolute bottom-0 right-0 border-2 border-black overflow-hidden">
                      <UserAvatar src={chat.avatars[1]} name={chat.name + "_2"} alt="" />
                    </div>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <UserAvatar src={chat.avatar} name={chat.name} alt={chat.name} />
                  </div>
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
                  {chat.typing ? (
                    <span className="text-[#61d4f0] text-xs truncate flex items-center gap-1.5">
                      <span>{chat.type === "group" ? `${chat.typing} печатает` : "печатает"}</span>
                      <span className="inline-flex gap-0.5">
                        <span className="w-1 h-1 rounded-full bg-[#61d4f0] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 rounded-full bg-[#61d4f0] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 rounded-full bg-[#61d4f0] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/50 text-xs truncate">{chat.lastMsg || "Нет сообщений"}</span>
                  )}
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
      </div>
      {/* /Sidebar */}

      {/* Десктоп: правая панель с открытым чатом или заглушкой */}
      <div className="hidden md:flex flex-1 h-full bg-[#0a0a0a] flex-col">
        {openChat ? (
          <ChatRoom
            key={String(openChat.id)}
            chat={openChat}
            onBack={() => { setOpenChat(null); loadChats(); }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Icon name="MessageCircle" size={56} className="text-white/30" />
            </div>
            <h3 className="text-white text-2xl font-light mb-3">Look для компьютера</h3>
            <p className="text-white/50 text-sm leading-relaxed max-w-md">
              Выберите чат, чтобы начать общение.<br />
              Сообщения защищены сквозным шифрованием.
            </p>
            <div className="mt-8 flex items-center gap-2 text-white/30 text-xs">
              <Icon name="Lock" size={12} />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
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