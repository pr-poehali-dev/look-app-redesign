import { useState, useEffect } from "react";
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
  peerId?: string;
  peerHandle?: string;
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
  const [searchUsers, setSearchUsers] = useState<{ id: string; name: string; avatar: string; handle: string; phone: string; online: boolean }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeCall, setActiveCall] = useState<{ user: { id: string; name: string }; mode: "audio" | "video" } | null>(null);
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

  useEffect(() => {
    loadChats();
  }, [user]);

  useEffect(() => {
    if (!user || !search.trim()) {
      setSearchUsers([]);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(() => {
      fetch(`${CHAT_API}?module=chat&action=all_users`, {
        headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      })
        .then(r => r.json())
        .then(raw => {
          const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
          setSearchUsers(data.users || []);
        })
        .catch(() => setSearchUsers([]))
        .finally(() => setSearchLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, user]);

  // Авто-обновление списка чатов каждые 5 сек — чтобы удалённые чаты пропадали почти мгновенно
  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !openChat) loadChats();
    }, 5000);
    return () => clearInterval(id);
  }, [user, openChat]);

  useEffect(() => {
    if (!initialDirectHandle || !user) return;
    let cancelled = false;
    setTab("chats");
    (async () => {
      const cleanHandle = initialDirectHandle.replace(/^@/, "").toLowerCase();

      // 1) Запрашиваем реальный профиль из БД, чтобы получить настоящий user_id
      let peerId: string | null = null;
      let name = "";
      let avatar = "";
      try {
        const res = await fetch("https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get_public_profile", handle: cleanHandle }),
        });
        const raw = await res.json();
        const json = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (json?.user?.id) {
          peerId = String(json.user.id);
          name = json.user.name || cleanHandle;
          avatar = json.user.avatar || "";
        }
      } catch { /* ignore */ }

      // 2) Если пользователя в БД нет — пробуем взять из локальных данных авторов (для демо-аккаунтов)
      if (!peerId) {
        try {
          const { getAuthor } = await import("@/data/authors");
          const a = getAuthor(initialDirectHandle);
          if (a && a.name) {
            name = a.name;
            avatar = a.avatar || "";
          }
        } catch { /* ignore */ }
      }

      if (cancelled) return;

      // 3) Если в БД нет — нельзя написать реальному пользователю. Показываем уведомление и выходим.
      if (!peerId) {
        onDirectConsumed?.();
        alert(`Пользователь @${cleanHandle} не зарегистрирован — написать ему нельзя.`);
        return;
      }

      const chatId = `dm_${[user.id, peerId].sort().join("_")}`;

      // 4) Если такой чат уже есть в списке — открываем его (актуальные имя/аватар из БД)
      const existing = chats.find((c) => String(c.id) === chatId);
      if (existing) {
        setOpenChat({ ...existing, name: name || existing.name, avatar: avatar || existing.avatar, peerId, peerHandle: cleanHandle });
        onDirectConsumed?.();
        return;
      }

      const chat: Chat = {
        id: chatId,
        type: "personal",
        name: name || cleanHandle,
        avatar,
        lastMsg: "",
        time: "сейчас",
        unread: 0,
        online: false,
        peerId,
        peerHandle: cleanHandle,
      };
      setChats((prev) => (prev.some((c) => String(c.id) === String(chat.id)) ? prev : [chat, ...prev]));
      setOpenChat(chat);
      onDirectConsumed?.();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDirectHandle, user]);

  const startChatWithUser = (peer: { id: string; name: string; avatar?: string; online?: boolean }) => {
    if (!user) return;
    const chat: Chat = {
      id: `dm_${[user.id, peer.id].sort().join("_")}`,
      type: "personal",
      name: peer.name,
      avatar: peer.avatar || "",
      lastMsg: "",
      time: "сейчас",
      unread: 0,
      online: !!peer.online,
    };
    setChats(prev => prev.some(c => String(c.id) === String(chat.id)) ? prev : [chat, ...prev]);
    setOpenChat(chat);
    setShowNewChat(false);
    setNewChatName("");
  };

  const startCall = async (u: { id: string; name: string }, mode: "audio" | "video") => {
    if (!user) return;
    const roomId = `call_${[user.id, u.id].sort().join("_")}`;
    await fetch(`${CHAT_API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      body: JSON.stringify({
        room_id: `incoming_${u.id}`,
        to_user: u.id,
        type: "call_invite",
        payload: { callerId: user.id, callerName: user.name || user.handle || "Пользователь", mode, roomId },
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
    <div className="h-full flex md:flex-row flex-col overflow-hidden" style={{ backgroundColor: 'var(--look-bg)' }}>
      {/* На мобиле: если открыт чат — показываем только его */}
      {openChat && (
        <div className="md:hidden absolute inset-0 z-40 bg-black">
          <ChatRoom
            chat={openChat}
            onBack={() => { setOpenChat(null); loadChats(); }}
            onDeleted={(deletedId) => {
              const did = String(deletedId);
              setChats(prev => prev.filter(c => String(c.id) !== did));
              setOpenChat(null);
              loadChats();
            }}
          />
        </div>
      )}

      {/* Sidebar со списком чатов (на десктопе — фиксированная ширина) */}
      <div className="flex flex-col h-full md:w-[380px] md:flex-shrink-0 md:border-r md:border-white/8 w-full overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-14 md:pt-4 pb-3">
        <h2 className="text-white font-bold text-xl">Чаты</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("calls")}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title="Звонки"
          >
            <Icon name="Phone" size={17} className="text-white" />
          </button>
          <button
            onClick={() => setTab("communities")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#00d4ff] to-[#8b5cf6] hover:opacity-90 active:scale-95 transition-all cursor-pointer text-white text-sm font-medium"
          >
            <Icon name="Users" size={15} className="text-white" />
            Сообщества
          </button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-2 bg-white/8 border border-white/15 rounded-full px-4 py-2.5 focus-within:border-white/40 transition-colors">
          <Icon name="Search" size={16} className="text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, @нику или номеру"
            className="flex-1 bg-transparent text-white text-base outline-none placeholder-white/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer">
              <Icon name="X" size={14} className="text-white/40" />
            </button>
          )}
        </div>
      </div>

      {search.trim() && (() => {
        const q = search.trim().toLowerCase();
        const qDigits = q.replace(/\D/g, "");
        const existingIds = new Set<string>();
        if (user) {
          for (const c of chats) {
            if (c.type === "personal") {
              const cid = String(c.id);
              if (cid.startsWith("dm_")) {
                const rest = cid.slice(3);
                const parts = rest.startsWith("u_")
                  ? (() => { const sep = rest.indexOf("_u_", 2); return sep > 0 ? [rest.slice(0, sep), rest.slice(sep + 1)] : [rest]; })()
                  : rest.split("_");
                for (const p of parts) if (p && p !== user.id) existingIds.add(p);
              }
            }
          }
        }
        const peopleFiltered = searchUsers
          .filter(u => !existingIds.has(u.id))
          .filter(u => {
            if (u.name.toLowerCase().includes(q)) return true;
            if (u.handle && u.handle.toLowerCase().includes(q.replace(/^@/, ""))) return true;
            if (qDigits.length >= 3 && u.phone && u.phone.replace(/\D/g, "").includes(qDigits)) return true;
            return false;
          });
        if (peopleFiltered.length === 0 && !searchLoading) return null;
        return (
          <div className="px-2 pb-2">
            <div className="px-3 pb-1 text-white/40 text-[11px] font-semibold uppercase tracking-wide">Новый чат</div>
            {searchLoading && peopleFiltered.length === 0 ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              peopleFiltered.slice(0, 20).map(u => (
                <button
                  key={u.id}
                  onClick={() => startChatWithUser(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-colors text-left"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
                    {u.online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{u.name}</p>
                    <p className="text-white/40 text-xs truncate">{u.handle ? `@${u.handle}` : (u.phone || "")}</p>
                  </div>
                  <Icon name="MessageCircle" size={16} className="text-white/30 flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        );
      })()}

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
            onDeleted={(deletedId) => {
              const did = String(deletedId);
              setChats(prev => prev.filter(c => String(c.id) !== did));
              setOpenChat(null);
              loadChats();
            }}
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

    </div>
  );
};

export default MessagesScreen;