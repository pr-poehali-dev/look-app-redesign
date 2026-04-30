import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Chat } from "./MessagesScreen";
import CallScreen from "./CallScreen";
import GroupCallScreen from "./GroupCallScreen";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface Message {
  id: number;
  user_id: string;
  user_name: string;
  type: "text" | "voice" | "image";
  content: string;
  time: string;
}

interface ChatRoomProps {
  chat: Chat;
  onBack: () => void;
}

const ChatRoom = ({ chat, onBack }: ChatRoomProps) => {
  const { user } = useAuth();
  const MY_ID = user?.id || "anon";
  const MY_NAME = user?.name || "Пользователь";
  const rawChatId = String(chat.id);
  const chatId = rawChatId.startsWith("mock_") || rawChatId.startsWith("chat_") || rawChatId.startsWith("dm_") || rawChatId.startsWith("community_")
    ? rawChatId
    : `dm_${[MY_ID, rawChatId].sort().join("_")}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [call, setCall] = useState<"audio" | "video" | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [showAttach, setShowAttach] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypingSentRef = useRef(0);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const [reads, setReads] = useState<Record<string, number>>({});
  const readPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentReadRef = useRef(0);
  const [peerInfo, setPeerInfo] = useState<{ name?: string; avatar?: string; online?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [showMute, setShowMute] = useState(false);
  const [showDisappear, setShowDisappear] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState<string>("off");
  const [showTheme, setShowTheme] = useState(false);
  const [chatTheme, setChatTheme] = useState<string>("default");
  const [showMedia, setShowMedia] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [toast, setToast] = useState("");

  const startLongPress = (msgId: number) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setConfirmDelete(msgId), 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 2000);
  };

  const exportChat = () => {
    const lines = messages.map(m => `[${m.time}] ${m.user_name}: ${m.type === "text" ? m.content : `[${m.type}]`}`).join("\n");
    const blob = new Blob([lines || "Чат пуст"], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat_${displayName || chatId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Чат экспортирован");
  };

  const addToHomescreen = () => {
    showToast("Добавь сайт через меню браузера → На главный экран");
  };

  const clearChat = async () => {
    setConfirmClear(false);
    try {
      const res = await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        body: JSON.stringify({ action: "clear_chat", chat_id: chatId }),
      });
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      const cleared = Number(data?.cleared_until || 0);
      setMessages([]);
      lastIdRef.current = cleared;
      lastSentReadRef.current = cleared;
      showToast("Чат очищен");
    } catch {
      showToast("Не удалось очистить");
    }
  };

  const toggleMute = (option: string) => {
    const next = option !== "off";
    setMuted(next);
    saveSetting("muted", next);
    setShowMute(false);
    showToast(next ? `Без звука: ${option}` : "Уведомления включены");
  };

  const toggleBlock = () => {
    const next = !blocked;
    setBlocked(next);
    saveSetting("blocked", next);
    setShowBlock(false);
    showToast(next ? "Контакт заблокирован" : "Контакт разблокирован");
  };

  const setDisappear = (val: string) => {
    setDisappearTimer(val);
    saveSetting("disappear", val);
    setShowDisappear(false);
    showToast(val === "off" ? "Исчезающие выключены" : `Исчезают через ${val}`);
  };

  const applyTheme = (val: string) => {
    setChatTheme(val);
    saveSetting("theme", val);
    setShowTheme(false);
  };

  const themeBg: Record<string, string> = {
    default: "#0a0a0a",
    dark: "#000000",
    blue: "#0b1a2e",
    purple: "#1a0d2e",
    green: "#0d2e1a",
  };

  const deleteMessage = async (msgId: number) => {
    setConfirmDelete(null);
    setMessages((p) => p.filter(m => m.id !== msgId));
    try {
      await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        body: JSON.stringify({ action: "delete_message", message_id: msgId }),
      });
    } catch (e) { void e; }
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}?module=chat&action=messages&chat_id=${chatId}&since_id=${lastIdRef.current}`,
        { headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) } }
      );
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      if (data.messages?.length) {
        const maxId = data.messages.reduce((m: number, x: Message) => Math.max(m, x.id), lastIdRef.current);
        lastIdRef.current = maxId;
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const fresh = (data.messages as Message[]).filter(m => !existingIds.has(m.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }
    } catch (e) { void e; }
  }, [chatId, MY_ID, MY_NAME]);

  const fetchTyping = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}?module=chat&action=typing_get&chat_id=${chatId}`,
        { headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) } }
      );
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      setTypingUsers(data.typing || []);
    } catch (e) { void e; }
  }, [chatId, MY_ID, MY_NAME]);

  const fetchReads = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}?module=chat&action=read_get&chat_id=${chatId}`,
        { headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) } }
      );
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      setReads(data.reads || {});
    } catch (e) { void e; }
  }, [chatId, MY_ID, MY_NAME]);

  const markRead = useCallback((lastId: number) => {
    if (lastId <= lastSentReadRef.current) return;
    lastSentReadRef.current = lastId;
    fetch(`${API}?module=chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
      body: JSON.stringify({ action: "read", chat_id: chatId, last_id: lastId }),
    }).catch(() => {});
  }, [chatId, MY_ID, MY_NAME]);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}?module=chat&action=settings_get&chat_id=${chatId}`,
        { headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) } }
      );
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      const s = data.settings || {};
      setMuted(!!s.muted);
      setBlocked(!!s.blocked);
      setChatTheme(s.theme || "default");
      setDisappearTimer(s.disappear || "off");
    } catch (e) { void e; }
  }, [chatId, MY_ID, MY_NAME]);

  const saveSetting = useCallback((field: string, value: boolean | string) => {
    fetch(`${API}?module=chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
      body: JSON.stringify({ action: "settings_set", chat_id: chatId, field, value }),
    }).catch(() => {});
  }, [chatId, MY_ID, MY_NAME]);

  const sendTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2500) return;
    lastTypingSentRef.current = now;
    fetch(`${API}?module=chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
      body: JSON.stringify({ action: "typing", chat_id: chatId }),
    }).catch(() => {});
  }, [chatId, MY_ID, MY_NAME]);

  useEffect(() => {
    setMessages([]);
    setReads({});
    lastIdRef.current = 0;
    lastSentReadRef.current = 0;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 2000);
    fetchTyping();
    typingPollRef.current = setInterval(fetchTyping, 3000);
    fetchReads();
    readPollRef.current = setInterval(fetchReads, 3000);
    fetchSettings();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (typingPollRef.current) clearInterval(typingPollRef.current);
      if (readPollRef.current) clearInterval(readPollRef.current);
    };
  }, [chatId, fetchMessages, fetchTyping, fetchReads, fetchSettings]);

  useEffect(() => {
    if (!messages.length) return;
    const maxId = messages.reduce((m, x) => x.id > m ? x.id : m, 0);
    if (maxId > 0) markRead(maxId);
  }, [messages, markRead]);

  // Подгружаем актуальное имя/аватар собеседника для DM-чатов
  useEffect(() => {
    const isDM = chatId.startsWith("dm_") && chat.type !== "group";
    if (!isDM) {
      setPeerInfo(null);
      return;
    }
    const peerId = (() => {
      const parts = chatId.slice(3).split("_");
      return parts.find((p) => p && p !== MY_ID) || "";
    })();
    if (!peerId) return;

    const load = async () => {
      try {
        const res = await fetch(`${API}?module=chat&action=all_users`, {
          headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        });
        const raw = await res.json();
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        const found = (data.users || []).find((u: { id: string }) => u.id === peerId);
        if (found) setPeerInfo({ name: found.name, avatar: found.avatar, online: found.online });
      } catch (e) { void e; }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [chatId, chat.type, MY_ID, MY_NAME]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async (content: string, type: Message["type"] = "text") => {
    if (sending) return;
    setSending(true);
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const tempId = -Date.now();
    setMessages((p) => [...p, { id: tempId, user_id: MY_ID, user_name: MY_NAME, type, content, time }]);
    try {
      const res = await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        body: JSON.stringify({ action: "send", chat_id: chatId, content, type }),
      });
      console.log("[ChatRoom] send response status", res.status);
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      console.log("[ChatRoom] send response data", data);
      if (data.id) {
        setMessages((p) => p.map(m => m.id === tempId
          ? { id: data.id, user_id: MY_ID, user_name: MY_NAME, type, content, time: data.time || time }
          : m
        ));
        if (data.id > lastIdRef.current) lastIdRef.current = data.id;
      } else {
        console.warn("[ChatRoom] send failed, no id returned", data);
        setMessages((p) => p.filter(m => m.id !== tempId));
      }
    } catch (e) {
      console.error("[ChatRoom] send error", e);
      setMessages((p) => p.filter(m => m.id !== tempId));
    }
    setSending(false);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMsg(input.trim());
    setInput("");
  };

  const startVoice = () => {
    setRecording(true);
    setRecSecs(0);
    recTimer.current = setInterval(() => setRecSecs((s) => s + 1), 1000);
  };

  const stopVoice = () => {
    setRecording(false);
    if (recTimer.current) clearInterval(recTimer.current);
    sendMsg(`voice:${recSecs || 1}`, "voice");
    setRecSecs(0);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => sendMsg(reader.result as string, "image");
    reader.readAsDataURL(file);
    setShowAttach(false);
  };

  // Максимальный id, который прочитал любой собеседник (не я)
  const peerReadMaxId = Object.entries(reads)
    .filter(([uid]) => uid !== MY_ID)
    .reduce((m, [, id]) => (id > m ? id : m), 0);

  const Ticks = ({ msg }: { msg: Message }) => {
    if (msg.id < 0) {
      return (
        <span className="inline-flex items-center -mr-0.5">
          <Icon name="Clock" size={11} className="text-white/50" />
        </span>
      );
    }
    const isRead = msg.id <= peerReadMaxId;
    return (
      <span className="inline-flex items-center -mr-0.5">
        <Icon name="Check" size={13} className={isRead ? "text-[#61d4f0]" : "text-white/60"} />
        {isRead && <Icon name="Check" size={13} className="text-[#61d4f0] -ml-2" />}
      </span>
    );
  };

  const renderMsg = (msg: Message) => {
    const isMe = msg.user_id === MY_ID;
    if (msg.type === "image") {
      return (
        <div className={`max-w-[70%] rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
          <img src={msg.content} className="w-full object-cover max-h-56" alt="img" />
          <div className="bg-[#1a1a1a] px-3 py-1.5 flex justify-end items-center gap-1.5">
            <span className="text-white/30 text-[10px]">{msg.time}</span>
            {isMe && <Ticks msg={msg} />}
          </div>
        </div>
      );
    }
    if (msg.type === "voice") {
      const dur = msg.content.replace("voice:", "");
      return (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl max-w-[65%] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
          <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon name="Play" size={14} className="text-white ml-0.5" />
          </button>
          <div className="flex items-center gap-0.5 flex-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="w-0.5 bg-white/50 rounded-full" style={{ height: `${Math.random() * 16 + 4}px` }} />
            ))}
          </div>
          <span className="text-white/70 text-xs flex-shrink-0">{dur}с</span>
          {isMe && <Ticks msg={msg} />}
        </div>
      );
    }
    return (
      <div className={`px-4 py-2.5 rounded-2xl max-w-[78%] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
        <p className="text-white text-sm leading-snug">{msg.content}</p>
        <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
          <span className="text-white/40 text-[10px]">{msg.time}</span>
          {isMe && <Ticks msg={msg} />}
        </div>
      </div>
    );
  };

  const isGroup = chat.type === "group" || String(chat.id).startsWith("community_");
  const displayName = !isGroup && peerInfo?.name ? peerInfo.name : chat.name;
  const displayAvatar = !isGroup && peerInfo?.avatar ? peerInfo.avatar : chat.avatar;
  const displayOnline = !isGroup && peerInfo ? !!peerInfo.online : chat.online;

  // Извлечь peerId для DM-чата формата dm_<id1>_<id2>
  const getPeerId = (): string => {
    const cid = String(chat.id);
    if (cid.startsWith("dm_")) {
      const parts = cid.slice(3).split("_");
      return parts.find(p => p && p !== MY_ID) || cid;
    }
    return cid;
  };

  const startCall = async (mode: "audio" | "video") => {
    if (!isGroup) {
      const peerId = getPeerId();
      const roomId = `call_${[MY_ID, peerId].sort().join("_")}`;
      try {
        await fetch(`${API}?module=signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
          body: JSON.stringify({
            room_id: `incoming_${peerId}`,
            to_user: peerId,
            type: "call_invite",
            payload: { callerId: MY_ID, callerName: MY_NAME, mode, roomId },
          }),
        });
      } catch (e) { void e; }
    }
    setCall(mode);
  };

  if (call && isGroup) {
    return (
      <GroupCallScreen
        roomId={`gcall_${String(chat.id)}`}
        roomName={chat.name}
        mode={call}
        myId={MY_ID}
        myName={MY_NAME}
        onEnd={() => setCall(null)}
      />
    );
  }

  if (call) {
    return (
      <CallScreen
        name={displayName}
        avatar={displayAvatar}
        mode={call}
        myId={MY_ID}
        peerId={getPeerId()}
        isCaller={true}
        onEnd={() => setCall(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: themeBg[chatTheme] || themeBg.default }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-14 pb-3 border-b border-white/8 bg-black">
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={26} className="text-white" />
        </button>
        <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 relative">
          <UserAvatar src={displayAvatar} name={displayName} alt={displayName} />
          {displayOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{displayName}</p>
          {typingUsers.length > 0 ? (
            <p className="text-[#61d4f0] text-xs flex items-center gap-1">
              <span>{isGroup ? `${typingUsers[0].name} печатает` : "печатает"}</span>
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[#61d4f0] animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-[#61d4f0] animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1 h-1 rounded-full bg-[#61d4f0] animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </p>
          ) : (
            <p className="text-white/40 text-xs">{displayOnline ? "в сети" : "был(а) недавно"}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => startCall("video")} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <Icon name="Video" size={17} className="text-white" />
          </button>
          <button onClick={() => startCall("audio")} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <Icon name="Phone" size={17} className="text-white" />
          </button>
          <div className="relative">
            <button onClick={() => { setMenuOpen(v => !v); setSubmenuOpen(false); }} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
              <Icon name="MoreVertical" size={17} className="text-white" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setMenuOpen(false); setSubmenuOpen(false); }} />
                <div className="absolute right-0 top-11 z-50 w-60 bg-[#1c1c1e] rounded-xl shadow-2xl border border-white/8 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                  {!submenuOpen ? (
                    <>
                      <button onClick={() => { setMenuOpen(false); setShowProfile(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Просмотр контакта</button>
                      <button onClick={() => { setMenuOpen(false); setShowSearch(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Поиск</button>
                      <button onClick={() => { setMenuOpen(false); setShowReport(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Пожаловаться</button>
                      <button onClick={() => { setMenuOpen(false); setShowBlock(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">{blocked ? "Разблокировать" : "Заблокировать"}</button>
                      <button onClick={() => { setMenuOpen(false); setShowMute(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Без звука</button>
                      <button onClick={() => { setMenuOpen(false); setShowDisappear(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Исчезающие сообщения</button>
                      <button onClick={() => { setMenuOpen(false); setShowTheme(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Тема чата</button>
                      <button onClick={() => setSubmenuOpen(true)} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5 flex items-center justify-between">
                        <span>Ещё</span>
                        <Icon name="ChevronRight" size={16} className="text-white/50" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setSubmenuOpen(false)} className="w-full text-left px-4 py-3 text-white/60 text-xs hover:bg-white/5 flex items-center gap-2 border-b border-white/8">
                        <Icon name="ChevronLeft" size={14} />
                        <span>Назад</span>
                      </button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); setShowMedia(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Медиа, ссылки и докум.</button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); setConfirmClear(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Очистить чат</button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); exportChat(); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Экспорт чата</button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); addToHomescreen(); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Добавить иконку на экран</button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border-b border-white/8">
          <Icon name="Search" size={16} className="text-white/40" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по сообщениям..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
          />
          <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-white/60 text-xs">
            <Icon name="X" size={18} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-scroll px-3 py-4 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/20 text-sm">Начни общение первым!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMatch = !!searchQuery.trim() && msg.type === "text" && msg.content.toLowerCase().includes(searchQuery.toLowerCase());
          if (searchQuery.trim() && !isMatch) return null;
          void isMatch;
          const isMe = msg.user_id === MY_ID;
          const prev = messages[i - 1];
          const isFirstInGroup = !isMe && (!prev || prev.user_id !== msg.user_id);
          const showName = isGroup && isFirstInGroup;
          const longPressProps = isMe && msg.id > 0 ? {
            onPointerDown: () => startLongPress(msg.id),
            onPointerUp: cancelLongPress,
            onPointerLeave: cancelLongPress,
            onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); setConfirmDelete(msg.id); },
          } : {};
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-7 h-7 flex-shrink-0">
                  <UserAvatar name={msg.user_name} />
                </div>
              )}
              <div className="flex flex-col max-w-[78%]" {...longPressProps}>
                {showName && (
                  <span className="text-white/50 text-[11px] font-medium ml-3 mb-0.5">{msg.user_name}</span>
                )}
                {renderMsg(msg)}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Attach panel */}
      {showAttach && (
        <div className="bg-[#111] border-t border-white/8 px-4 py-4 grid grid-cols-4 gap-4">
          {[
            { icon: "Image", label: "Фото", action: () => fileRef.current?.click() },
            { icon: "FileText", label: "Файл", action: () => {} },
            { icon: "MapPin", label: "Геолокация", action: () => {} },
            { icon: "Contact", label: "Контакт", action: () => {} },
          ].map((item) => (
            <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Icon name={item.icon as "Image"} size={22} className="text-white" />
              </div>
              <span className="text-white/50 text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 pb-24 pt-3 bg-black border-t border-white/8 relative z-40">
        <button
          onClick={() => setShowAttach((v) => !v)}
          className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 mb-0.5"
        >
          <Icon name="Plus" size={18} className="text-white/60" />
        </button>

        {recording ? (
          <div className="flex-1 flex items-center gap-3 bg-[#1a1a1a] rounded-3xl px-4 py-3">
            <div className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse" />
            <span className="text-white/60 text-sm flex-1">
              {String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}
            </span>
            <button onPointerUp={stopVoice} className="text-[#fe2c55]">
              <Icon name="Send" size={20} />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-end gap-2 bg-[#1a1a1a] rounded-3xl px-4 py-2.5 min-h-[44px]">
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); if (e.target.value.trim()) sendTyping(); }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm outline-none resize-none placeholder-white/30 max-h-32 leading-snug"
              style={{ scrollbarWidth: "none" }}
            />
            <button className="text-white/40 flex-shrink-0 mb-0.5">
              <Icon name="Smile" size={20} />
            </button>
          </div>
        )}

        {input.trim() ? (
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-10 h-10 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0 shadow-[0_0_16px_rgba(254,44,85,0.4)] disabled:opacity-50"
          >
            <Icon name="Send" size={17} className="text-white" />
          </button>
        ) : (
          <button
            onPointerDown={startVoice}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0"
          >
            <Icon name="Mic" size={19} className="text-white/70" />
          </button>
        )}
      </div>

      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-2">Удалить сообщение?</p>
            <p className="text-white/50 text-sm mb-5">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm">Отмена</button>
              <button onClick={() => deleteMessage(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Просмотр контакта */}
      {showProfile && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center" onClick={() => setShowProfile(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4">
                <UserAvatar src={displayAvatar} name={displayName} alt={displayName} />
              </div>
              <p className="text-white text-xl font-semibold">{displayName}</p>
              <p className="text-white/40 text-sm mt-1">{displayOnline ? "в сети" : "был(а) недавно"}</p>
              <div className="grid grid-cols-3 gap-3 mt-6 w-full">
                <button onClick={() => { setShowProfile(false); startCall("audio"); }} className="flex flex-col items-center gap-1 py-3 bg-white/5 rounded-xl">
                  <Icon name="Phone" size={20} className="text-white" />
                  <span className="text-white/70 text-xs">Звонок</span>
                </button>
                <button onClick={() => { setShowProfile(false); startCall("video"); }} className="flex flex-col items-center gap-1 py-3 bg-white/5 rounded-xl">
                  <Icon name="Video" size={20} className="text-white" />
                  <span className="text-white/70 text-xs">Видео</span>
                </button>
                <button onClick={() => { setShowProfile(false); setShowMute(true); }} className="flex flex-col items-center gap-1 py-3 bg-white/5 rounded-xl">
                  <Icon name={muted ? "BellOff" : "Bell"} size={20} className="text-white" />
                  <span className="text-white/70 text-xs">{muted ? "Без звука" : "Звук"}</span>
                </button>
              </div>
              <button onClick={() => setShowProfile(false)} className="mt-5 w-full py-3 rounded-xl bg-white/10 text-white text-sm">Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Пожаловаться */}
      {showReport && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center px-4" onClick={() => setShowReport(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-1">Пожаловаться</p>
            <p className="text-white/50 text-sm mb-4">Выбери причину жалобы</p>
            {["Спам", "Мошенничество", "Оскорбления", "Неприемлемый контент", "Другое"].map(r => (
              <button key={r} onClick={() => { setShowReport(false); showToast("Жалоба отправлена"); }} className="w-full text-left px-3 py-3 text-white text-sm hover:bg-white/5 rounded-lg">{r}</button>
            ))}
            <button onClick={() => setShowReport(false)} className="mt-3 w-full py-2.5 rounded-xl bg-white/10 text-white text-sm">Отмена</button>
          </div>
        </div>
      )}

      {/* Заблокировать */}
      {showBlock && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-6" onClick={() => setShowBlock(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-2">{blocked ? "Разблокировать?" : "Заблокировать?"}</p>
            <p className="text-white/50 text-sm mb-5">{blocked ? `${displayName} снова сможет писать тебе.` : `${displayName} не сможет писать и звонить тебе.`}</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBlock(false)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm">Отмена</button>
              <button onClick={toggleBlock} className="flex-1 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold">{blocked ? "Разблокировать" : "Заблокировать"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Без звука */}
      {showMute && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center px-4" onClick={() => setShowMute(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-4">Отключить уведомления</p>
            {[
              { v: "8 часов", l: "На 8 часов" },
              { v: "1 неделя", l: "На неделю" },
              { v: "Всегда", l: "Навсегда" },
              { v: "off", l: "Включить уведомления" },
            ].map(o => (
              <button key={o.v} onClick={() => toggleMute(o.v)} className="w-full text-left px-3 py-3 text-white text-sm hover:bg-white/5 rounded-lg">{o.l}</button>
            ))}
            <button onClick={() => setShowMute(false)} className="mt-3 w-full py-2.5 rounded-xl bg-white/10 text-white text-sm">Отмена</button>
          </div>
        </div>
      )}

      {/* Исчезающие сообщения */}
      {showDisappear && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center px-4" onClick={() => setShowDisappear(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-1">Исчезающие сообщения</p>
            <p className="text-white/50 text-sm mb-4">Текущая настройка: {disappearTimer === "off" ? "выключено" : disappearTimer}</p>
            {[
              { v: "off", l: "Выключено" },
              { v: "24 часа", l: "24 часа" },
              { v: "7 дней", l: "7 дней" },
              { v: "90 дней", l: "90 дней" },
            ].map(o => (
              <button key={o.v} onClick={() => setDisappear(o.v)} className={`w-full text-left px-3 py-3 text-sm hover:bg-white/5 rounded-lg flex items-center justify-between ${disappearTimer === o.v ? "text-[#fe2c55]" : "text-white"}`}>
                <span>{o.l}</span>
                {disappearTimer === o.v && <Icon name="Check" size={16} />}
              </button>
            ))}
            <button onClick={() => setShowDisappear(false)} className="mt-3 w-full py-2.5 rounded-xl bg-white/10 text-white text-sm">Закрыть</button>
          </div>
        </div>
      )}

      {/* Тема чата */}
      {showTheme && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center px-4" onClick={() => setShowTheme(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-4">Тема чата</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "default", l: "Стандарт" },
                { v: "dark", l: "Чёрный" },
                { v: "blue", l: "Синий" },
                { v: "purple", l: "Фиолет" },
                { v: "green", l: "Зелёный" },
              ].map(t => (
                <button key={t.v} onClick={() => applyTheme(t.v)} className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 ${chatTheme === t.v ? "border-[#fe2c55]" : "border-transparent"}`}>
                  <div className="w-full h-16 rounded-lg" style={{ backgroundColor: themeBg[t.v] }} />
                  <span className="text-white/70 text-xs">{t.l}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTheme(false)} className="mt-4 w-full py-2.5 rounded-xl bg-white/10 text-white text-sm">Закрыть</button>
          </div>
        </div>
      )}

      {/* Медиа, ссылки и документы */}
      {showMedia && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center px-4" onClick={() => setShowMedia(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-md rounded-3xl p-5 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-4">Медиа, ссылки и документы</p>
            {(() => {
              const imgs = messages.filter(m => m.type === "image");
              const links = messages.filter(m => m.type === "text" && /(https?:\/\/[^\s]+)/i.test(m.content));
              return (
                <>
                  <p className="text-white/50 text-xs mb-2 uppercase">Медиа ({imgs.length})</p>
                  {imgs.length === 0 ? (
                    <p className="text-white/30 text-sm mb-4">Нет медиафайлов</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-1 mb-4">
                      {imgs.map(m => (
                        <img key={m.id} src={m.content} alt="" className="w-full aspect-square object-cover rounded-md" />
                      ))}
                    </div>
                  )}
                  <p className="text-white/50 text-xs mb-2 uppercase">Ссылки ({links.length})</p>
                  {links.length === 0 ? (
                    <p className="text-white/30 text-sm">Нет ссылок</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {links.map(m => {
                        const match = m.content.match(/(https?:\/\/[^\s]+)/i);
                        const url = match ? match[1] : "";
                        return <a key={m.id} href={url} target="_blank" rel="noreferrer" className="text-[#61d4f0] text-sm break-all hover:underline">{url}</a>;
                      })}
                    </div>
                  )}
                </>
              );
            })()}
            <button onClick={() => setShowMedia(false)} className="mt-5 w-full py-2.5 rounded-xl bg-white/10 text-white text-sm">Закрыть</button>
          </div>
        </div>
      )}

      {/* Очистить чат */}
      {confirmClear && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-6" onClick={() => setConfirmClear(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-5 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-2">Очистить чат?</p>
            <p className="text-white/50 text-sm mb-5">Все сообщения будут скрыты на этом устройстве.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm">Отмена</button>
              <button onClick={clearChat} className="flex-1 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold">Очистить</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-32 z-[70] bg-black/90 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
};

export default ChatRoom;