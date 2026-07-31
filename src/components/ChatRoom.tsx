import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Chat } from "./MessagesScreen";
import CallScreen from "./CallScreen";
import GroupCallScreen from "./GroupCallScreen";
import PollsPanel from "./community/PollsPanel";
import PollMessage from "./community/PollMessage";
import MembersScreen from "./community/MembersScreen";
import { useAuth } from "@/context/AuthContext";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

interface Message {
  id: number;
  user_id: string;
  user_name: string;
  type: "text" | "voice" | "image" | "file" | "location" | "contact" | "poll" | "sticker";
  content: string;
  time: string;
}

const EMOJI_CATEGORIES: { id: string; icon: string; emojis: string[] }[] = [
  {
    id: "smileys",
    icon: "Smile",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","🫠","😉","😊","😇","🥰","😍",
      "🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🫣",
      "🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔",
      "😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","😵‍💫","🤯","🤠",
      "🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦",
      "😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡",
      "😠","🤬","😈","👿","💀","💩","🤡","👻","👽","🤖"
    ],
  },
  {
    id: "gestures",
    icon: "Hand",
    emojis: [
      "👍","👎","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","🫵","🫱","🫲","🫳","🫴",
      "👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👋","🤝","🙏","🫶","🤲","👐","🙌",
      "👏","💪","🦾","✍️","💅","🤳","👀","👁️","🫦","👄","💋","🧠","🦷","🦴","👶","🧑",
      "👨","👩","🧔","👴","👵","🙆","🙅","🙋","🤦","🤷","💁","🕺","💃","🧎","🚶","🏃"
    ],
  },
  {
    id: "hearts",
    icon: "Heart",
    emojis: [
      "❤️","🧡","💛","💚","💙","🩵","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","💕","💞","💓",
      "💗","💖","💘","💝","💟","♥️","💋","💯","💢","💥","💫","💦","💨","🕳️","💬","💭",
      "🌸","🌹","🥀","🌺","🌻","🌼","🌷","🌱","🍀","🌿","⭐","🌟","✨","⚡","🔥","🌈"
    ],
  },
  {
    id: "animals",
    icon: "Cat",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
      "🙈","🙉","🙊","🐒","🦄","🐴","🦓","🦌","🐗","🐺","🦇","🐢","🐍","🦎","🐙","🦑",
      "🦐","🦀","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🦖","🦕","🐔","🐓","🐣","🐥","🦆",
      "🦅","🦉","🦩","🦚","🦜","🕊️","🐝","🦋","🐌","🐞","🐜","🦗","🕷️","🦂","🌵","🎄"
    ],
  },
  {
    id: "food",
    icon: "Pizza",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥",
      "🥝","🍅","🥑","🥦","🥬","🥒","🌶️","🫑","🌽","🥕","🧄","🧅","🥔","🍠","🥐","🥯",
      "🍞","🥖","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🍔","🍟","🍕","🌭","🥪","🌮","🌯",
      "🫔","🥙","🧆","🍝","🍜","🍲","🍣","🍱","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🍡",
      "🍦","🍰","🎂","🧁","🍫","🍬","🍭","🍩","🍪","☕","🍵","🧃","🥤","🧋","🍺","🍷"
    ],
  },
  {
    id: "activity",
    icon: "Rocket",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🥅","🏒","🥍","🏏",
      "🎳","🎯","🪀","🎮","🕹️","🎲","♟️","🎰","🧩","🎨","🎭","🎬","🎤","🎧","🎼","🎹",
      "🥁","🎸","🎺","🎻","🚗","✈️","🚀","🛸","🚁","⛵","🏝️","🗺️","🎆","🎇","🎉","🎊",
      "🎈","🎁","🏆","🥇","🥈","🥉","🏅","🎗️","💰","💎","👑","🔮","💡","📱","💻","⌚"
    ],
  },
];

const STICKERS: string[] = [
  "🔥","💯","👑","🎉","😂","😍","🥺","😎","🤩","👍","❤️","💔","🙏","💪","✨","🚀",
  "🎁","🌈","⭐","💥","🥳","🤯","👻","💀","🤖","👽","🦄","🐱","🐶","🍕","☕","🍺",
];

interface ChatRoomProps {
  chat: Chat;
  onBack: () => void;
  onDeleted?: (deletedChatId: string | number) => void;
}

const ChatRoom = ({ chat, onBack, onDeleted }: ChatRoomProps) => {
  const { user } = useAuth();
  const MY_ID = user?.id || "anon";
  const MY_NAME = user?.name || user?.handle || "Пользователь";
  const rawChatId = String(chat.id);
  const chatId = rawChatId.startsWith("mock_") || rawChatId.startsWith("chat_") || rawChatId.startsWith("dm_") || rawChatId.startsWith("community_") || rawChatId.startsWith("com_")
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
  const docRef = useRef<HTMLInputElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "stickers" | "gif">("emoji");
  const [emojiCat, setEmojiCat] = useState(EMOJI_CATEGORIES[0].id);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<{ id: string; url: string; preview: string }[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactList, setContactList] = useState<{ id: string; name: string; avatar?: string }[]>([]);
  const lastIdRef = useRef(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypingSentRef = useRef(0);
  const [typingUsers, setTypingUsers] = useState<{ id: string; name: string }[]>([]);
  const [reads, setReads] = useState<Record<string, number>>({});
  const readPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSentReadRef = useRef(0);
  const [peerInfo, setPeerInfo] = useState<{ id?: string; name?: string; avatar?: string; online?: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showReport, setShowReport] = useState(false);
  const [showBlock, setShowBlock] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [addMembersSearch, setAddMembersSearch] = useState("");
  const [addMembersList, setAddMembersList] = useState<{ id: string; name: string; avatar: string; handle: string; phone: string }[]>([]);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [blocked, setBlocked] = useState<boolean>(false);
  const [showMute, setShowMute] = useState(false);
  const [showDisappear, setShowDisappear] = useState(false);
  const [disappearTimer, setDisappearTimer] = useState<string>("off");
  const [showTheme, setShowTheme] = useState(false);
  const [chatTheme, setChatTheme] = useState<string>("default");
  const [showMedia, setShowMedia] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteChat, setConfirmDeleteChat] = useState(false);
  const [toast, setToast] = useState("");
  const [communityIsAdmin, setCommunityIsAdmin] = useState(false);
  const [communityCreatorId, setCommunityCreatorId] = useState<string>("");
  const [showPolls, setShowPolls] = useState(false);
  const [showMembersScreen, setShowMembersScreen] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<{ message_id: number; content: string; author_name: string; type: string } | null>(null);

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

  const markAllRead = () => {
    const maxId = messages.reduce((m, msg) => msg.id > m ? msg.id : m, 0);
    if (maxId > 0) {
      markRead(maxId);
      showToast("Все сообщения прочитаны");
    } else {
      showToast("Нет сообщений");
    }
  };

  const deleteChat = async () => {
    setConfirmDeleteChat(false);
    try {
      // Удаляем чат у всех участников. Шлём оба возможных ID — сырой (как в списке) и нормализованный (как в БД для DM)
      await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        body: JSON.stringify({ action: "delete_chat", chat_id: chatId, for_all: true }),
      }).catch(() => {});
      if (String(chat.id) !== chatId) {
        await fetch(`${API}?module=chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
          body: JSON.stringify({ action: "delete_chat", chat_id: String(chat.id), for_all: true }),
        }).catch(() => {});
      }
      showToast("Чат удалён");
      setTimeout(() => {
        if (onDeleted) onDeleted(chat.id);
        else onBack();
      }, 400);
    } catch {
      showToast("Не удалось удалить");
    }
  };

  const clearChat = async (forAll: boolean = false) => {
    setConfirmClear(false);
    try {
      const res = await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        body: JSON.stringify({ action: "clear_chat", chat_id: chatId, for_all: forAll }),
      });
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      const cleared = Number(data?.cleared_until || 0);
      setMessages([]);
      lastIdRef.current = cleared;
      lastSentReadRef.current = cleared;
      showToast(forAll ? "Чат очищен у всех" : "Чат очищен");
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
    default: "var(--look-bg)",
    dark: "var(--look-bg)",
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
    const safeRun = (fn: () => void) => {
      if (typeof document !== "undefined" && document.hidden) return;
      fn();
    };
    pollRef.current = setInterval(() => safeRun(fetchMessages), 4000);
    fetchTyping();
    typingPollRef.current = setInterval(() => safeRun(fetchTyping), 6000);
    fetchReads();
    readPollRef.current = setInterval(() => safeRun(fetchReads), 6000);
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
      const rest = chatId.slice(3);
      if (rest.startsWith(MY_ID + "_")) return rest.slice(MY_ID.length + 1);
      if (rest.endsWith("_" + MY_ID)) return rest.slice(0, rest.length - MY_ID.length - 1);
      return "";
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
        if (found) setPeerInfo({ id: found.id, name: found.name, avatar: found.avatar, online: found.online });
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
        body: JSON.stringify({
          action: "send",
          chat_id: chatId,
          content,
          type,
          // Передаём данные собеседника, чтобы backend смог корректно сохранить имя/аватар чата
          // и добавить нужного user_id в участники (актуально для чатов, открытых из профиля)
          peer_id: chat.peerId || undefined,
          peer_name: chat.type === "personal" ? chat.name : undefined,
          peer_avatar: chat.type === "personal" ? chat.avatar : undefined,
        }),
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
    e.target.value = "";
  };

  const handleDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX = 8 * 1024 * 1024;
    if (file.size > MAX) {
      showToast("Файл слишком большой (макс. 8 МБ)");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const payload = JSON.stringify({
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        data: reader.result as string,
      });
      sendMsg(payload, "file");
    };
    reader.readAsDataURL(file);
    setShowAttach(false);
    e.target.value = "";
  };

  const sendLocation = () => {
    setShowAttach(false);
    if (!navigator.geolocation) {
      showToast("Геолокация недоступна");
      return;
    }
    showToast("Определяем местоположение...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendMsg(JSON.stringify({ lat: latitude, lng: longitude }), "location");
      },
      () => showToast("Не удалось получить координаты"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const openContactPicker = async () => {
    setShowAttach(false);
    try {
      const res = await fetch(`${API}?module=chat&action=all_users`, {
        headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
      });
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      const users = (data.users || []).filter((u: { id: string }) => u.id !== MY_ID);
      setContactList(users);
      setShowContactPicker(true);
    } catch {
      showToast("Не удалось загрузить контакты");
    }
  };

  const sendContact = (c: { id: string; name: string; avatar?: string }) => {
    sendMsg(JSON.stringify({ id: c.id, name: c.name, avatar: c.avatar || "" }), "contact");
    setShowContactPicker(false);
  };

  const insertEmoji = (e: string) => {
    setInput((v) => v + e);
  };

  const sendSticker = (sticker: string) => {
    setShowEmoji(false);
    sendMsg(sticker, "sticker");
  };

  const sendGif = (url: string) => {
    setShowEmoji(false);
    sendMsg(url, "image");
  };

  const loadGifs = useCallback(async (q: string) => {
    setGifLoading(true);
    try {
      const key = "LIVDSRZULELA";
      const base = q.trim()
        ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(q.trim())}&key=${key}&limit=24&media_filter=minimal`
        : `https://g.tenor.com/v1/trending?key=${key}&limit=24&media_filter=minimal`;
      const res = await fetch(base);
      const data = await res.json();
      const items = (data.results || []).map((r: { id: string; media?: { tinygif?: { url: string }; gif?: { url: string } }[] }) => {
        const m = r.media?.[0] || {};
        return { id: r.id, url: m.gif?.url || m.tinygif?.url || "", preview: m.tinygif?.url || m.gif?.url || "" };
      }).filter((x: { url: string }) => x.url);
      setGifResults(items);
    } catch (e) { void e; }
    setGifLoading(false);
  }, []);

  useEffect(() => {
    if (showEmoji && emojiTab === "gif") {
      const t = setTimeout(() => loadGifs(gifQuery), gifQuery ? 400 : 0);
      return () => clearTimeout(t);
    }
  }, [showEmoji, emojiTab, gifQuery, loadGifs]);

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
    if (msg.type === "poll") {
      let pollData: { poll_id?: number } = {};
      try { pollData = JSON.parse(msg.content); } catch { void 0; }
      if (pollData.poll_id && communityId) {
        return <PollMessage pollId={pollData.poll_id} communityId={communityId} isMe={isMe} time={msg.time} />;
      }
      return (
        <div className={`px-4 py-2.5 rounded-2xl max-w-[78%] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
          <p className="text-white text-sm">📊 Опрос</p>
          <div className="text-white/40 text-[10px] mt-1 text-right">{msg.time}</div>
        </div>
      );
    }
    if (msg.type === "sticker") {
      const isImg = /^https?:\/\//.test(msg.content) || msg.content.startsWith("data:");
      return (
        <div className="max-w-[45%] flex flex-col">
          {isImg ? (
            <img src={msg.content} className="w-32 h-32 object-contain drop-shadow-lg" alt="sticker" />
          ) : (
            <span className="text-[76px] leading-none select-none">{msg.content}</span>
          )}
          <div className={`flex items-center gap-1.5 mt-0.5 ${isMe ? "justify-end" : "justify-start"}`}>
            <span className="text-white/40 text-[10px]">{msg.time}</span>
            {isMe && <Ticks msg={msg} />}
          </div>
        </div>
      );
    }
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
    if (msg.type === "file") {
      let info: { name?: string; size?: number; mime?: string; data?: string } = {};
      try { info = JSON.parse(msg.content); } catch { void 0; }
      const sizeKb = info.size ? Math.max(1, Math.round(info.size / 1024)) : 0;
      return (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl max-w-[78%] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
          <a
            href={info.data || "#"}
            download={info.name || "file"}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0"
            onClick={(e) => { if (!info.data) e.preventDefault(); }}
          >
            <Icon name="FileText" size={18} className="text-white" />
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{info.name || "Файл"}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-white/60 text-[11px]">{sizeKb} КБ</span>
              <span className="text-white/40 text-[10px]">·</span>
              <span className="text-white/40 text-[10px]">{msg.time}</span>
              {isMe && <Ticks msg={msg} />}
            </div>
          </div>
        </div>
      );
    }
    if (msg.type === "location") {
      let loc: { lat?: number; lng?: number } = {};
      try { loc = JSON.parse(msg.content); } catch { void 0; }
      const url = loc.lat && loc.lng ? `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}#map=16/${loc.lat}/${loc.lng}` : "#";
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`block max-w-[70%] rounded-2xl overflow-hidden ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
          <div className="h-28 bg-[#2a2a2a] flex items-center justify-center relative">
            <Icon name="MapPin" size={32} className="text-[#fe2c55]" />
          </div>
          <div className="px-3 py-2">
            <p className="text-white text-sm font-medium">Геолокация</p>
            <p className="text-white/60 text-[11px]">{loc.lat?.toFixed(4)}, {loc.lng?.toFixed(4)}</p>
            <div className="flex items-center justify-end gap-1.5 mt-1">
              <span className="text-white/40 text-[10px]">{msg.time}</span>
              {isMe && <Ticks msg={msg} />}
            </div>
          </div>
        </a>
      );
    }
    if (msg.type === "contact") {
      let info: { id?: string; name?: string; avatar?: string } = {};
      try { info = JSON.parse(msg.content); } catch { void 0; }
      return (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl max-w-[78%] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <UserAvatar src={info.avatar} name={info.name || "?"} alt={info.name || ""} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{info.name || "Контакт"}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-white/60 text-[11px]">Контакт</span>
              <span className="text-white/40 text-[10px]">·</span>
              <span className="text-white/40 text-[10px]">{msg.time}</span>
              {isMe && <Ticks msg={msg} />}
            </div>
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

  const isGroup = chat.type === "group" || String(chat.id).startsWith("community_") || String(chat.id).startsWith("com_");
  const communityId = isGroup ? chatId : "";

  // Проверка: текущий пользователь — админ сообщества + creator_id + pinned message
  useEffect(() => {
    if (!isGroup || !communityId || !user) {
      setCommunityIsAdmin(false);
      setPinnedMessage(null);
      setCommunityCreatorId("");
      return;
    }
    let cancelled = false;
    // Роль через members (api отдаёт role: 'owner' | 'admin' | 'member')
    fetch(`${API}?module=community&action=members&community_id=${encodeURIComponent(communityId)}`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const me = (data.members || []).find((m: { id: string; role?: string }) => m.id === user.id);
        if (!cancelled) setCommunityIsAdmin(!!(me && (me.role === "admin" || me.role === "owner")));
      })
      .catch(() => {
        if (!cancelled) setCommunityIsAdmin(false);
      });

    // creator_id (для передачи владельца)
    fetch(`${API}?module=community&action=list`, {
      headers: { "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const com = (data.communities || []).find((c: { id: string }) => c.id === communityId);
        if (!cancelled && com) setCommunityCreatorId(com.creator_id || "");
      })
      .catch(() => {});

    // pinned message
    fetch(`${API}?module=community`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
      body: JSON.stringify({ action: "get_pinned", community_id: communityId }),
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (!cancelled) setPinnedMessage(data.pinned || null);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [isGroup, communityId, user]);

  const pinMessage = async (msgId: number) => {
    if (!user || !communityId) return;
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action: "pin_message", community_id: communityId, message_id: msgId }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        // обновим pinned
        const r2 = await fetch(`${API}?module=community`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
          body: JSON.stringify({ action: "get_pinned", community_id: communityId }),
        });
        const raw2 = await r2.json();
        const d2 = typeof raw2.body === "string" ? JSON.parse(raw2.body) : raw2;
        setPinnedMessage(d2.pinned || null);
      } else {
        alert("Не удалось закрепить");
      }
    } catch {
      alert("Не удалось закрепить");
    }
  };

  const unpinMessage = async () => {
    if (!user || !communityId) return;
    if (!confirm("Открепить сообщение?")) return;
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action: "unpin_message", community_id: communityId }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) setPinnedMessage(null);
    } catch {
      // тихо
    }
  };

  const leaveGroup = async () => {
    if (!user || !communityId) return;
    if (!confirm("Покинуть группу?")) return;
    try {
      const res = await fetch(`${API}?module=community`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": encodeURIComponent(user.name) },
        body: JSON.stringify({ action: "leave", community_id: communityId }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        onDeleted?.(chat.id);
        onBack();
      } else {
        alert("Не удалось покинуть группу");
      }
    } catch {
      alert("Не удалось покинуть группу");
    }
  };

  const cleanName = (n?: string) => (n && n !== "Гость" ? n : "");
  const displayName = !isGroup
    ? (cleanName(peerInfo?.name) || cleanName(chat.name) || "Собеседник")
    : chat.name;
  const displayAvatar = !isGroup && peerInfo?.avatar ? peerInfo.avatar : chat.avatar;
  const displayOnline = !isGroup && peerInfo ? !!peerInfo.online : chat.online;

  // Извлечь peerId для DM-чата (используем нормализованный chatId, не сырой chat.id)
  const getPeerId = (): string => {
    if (peerInfo?.id) return peerInfo.id;
    const cid = chatId;
    if (cid.startsWith("dm_")) {
      const rest = cid.slice(3);
      if (rest.startsWith(MY_ID + "_")) return rest.slice(MY_ID.length + 1);
      if (rest.endsWith("_" + MY_ID)) return rest.slice(0, rest.length - MY_ID.length - 1);
      return cid;
    }
    return cid;
  };

  const startCall = async (mode: "audio" | "video") => {
    if (isGroup) {
      setCall(mode);
      return;
    }
    const peerId = getPeerId();
    if (!peerId || peerId === MY_ID || peerId === chatId) {
      alert("Не удалось определить собеседника для звонка");
      return;
    }
    const roomId = `call_${[MY_ID, peerId].sort().join("_")}`;
    fetch(`${API}?module=signal`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
      body: JSON.stringify({
        room_id: `incoming_${peerId}`,
        to_user: peerId,
        type: "call_invite",
        payload: { callerId: MY_ID, callerName: MY_NAME, mode, roomId },
      }),
    }).catch((e) => { console.error("[ChatRoom] call_invite failed", e); });
    setCall(mode);
  };

  useEffect(() => {
    if (!showAddMembers) return;
    fetch(`${API}?module=chat&action=all_users`, {
      headers: { "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
    })
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        setAddMembersList(data.users || []);
      })
      .catch(() => setAddMembersList([]));
  }, [showAddMembers, MY_ID, MY_NAME]);

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;
    setAddingMembers(true);
    try {
      const res = await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": encodeURIComponent(MY_NAME) },
        body: JSON.stringify({ action: "add_members", chat_id: chatId, user_ids: selectedNewMembers }),
      });
      const raw = await res.json();
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      if (data.ok) {
        setToast(data.converted ? "Создан групповой чат" : `Добавлено: ${data.added}`);
        setShowAddMembers(false);
        setSelectedNewMembers([]);
        setAddMembersSearch("");
        if (data.converted && data.chat_id && onDeleted) {
          onDeleted(chat.id);
        }
      } else {
        setToast(data.error || "Не удалось добавить");
      }
    } catch {
      setToast("Ошибка сети");
    } finally {
      setAddingMembers(false);
      setTimeout(() => setToast(""), 2500);
    }
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
      <input ref={docRef} type="file" className="hidden" onChange={handleDoc} />

      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-14 md:pt-3 pb-3 border-b border-white/8" style={{ background: "var(--look-sidebar-bg)" }}>
        <button onClick={onBack} className="text-white/60 hover:text-white transition-colors flex-shrink-0" title="Назад">
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
          <button onClick={() => setShowAddMembers(true)} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center" title="Добавить участников">
            <Icon name="UserPlus" size={17} className="text-white" />
          </button>
          {isGroup && (
            <button
              onClick={() => setShowPolls(true)}
              className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center"
              title={communityIsAdmin ? "Создать опрос" : "Опросы"}
            >
              <Icon name="BarChart3" size={17} className="text-white" />
            </button>
          )}
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
                      {isGroup ? (
                        <button onClick={() => { setMenuOpen(false); setShowMembersScreen(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5 flex items-center gap-2">
                          <Icon name="Users" size={15} className="text-white/60" />
                          <span>Участники группы</span>
                        </button>
                      ) : (
                        <button onClick={() => { setMenuOpen(false); setShowProfile(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Просмотр контакта</button>
                      )}
                      <button onClick={() => { setMenuOpen(false); setShowSearch(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Поиск</button>
                      <button onClick={() => { setMenuOpen(false); setShowReport(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Пожаловаться</button>
                      {!isGroup && (
                        <button onClick={() => { setMenuOpen(false); setShowBlock(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">{blocked ? "Разблокировать" : "Заблокировать"}</button>
                      )}
                      <button onClick={() => { setMenuOpen(false); setShowMute(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Без звука</button>
                      <button onClick={() => { setMenuOpen(false); setShowDisappear(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Исчезающие сообщения</button>
                      <button onClick={() => { setMenuOpen(false); setShowTheme(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Тема чата</button>
                      {isGroup && (
                        <button onClick={() => { setMenuOpen(false); leaveGroup(); }} className="w-full text-left px-4 py-3 text-[#fe2c55] text-sm hover:bg-white/5 flex items-center gap-2">
                          <Icon name="LogOut" size={15} />
                          <span>Покинуть группу</span>
                        </button>
                      )}
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
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); markAllRead(); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Отметить как прочитанное</button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); setConfirmClear(true); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Очистить чат</button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); exportChat(); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Экспорт чата</button>
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); addToHomescreen(); }} className="w-full text-left px-4 py-3 text-white text-sm hover:bg-white/5">Добавить иконку на экран</button>
                      <div className="my-1 h-px bg-white/8" />
                      <button onClick={() => { setMenuOpen(false); setSubmenuOpen(false); setConfirmDeleteChat(true); }} className="w-full text-left px-4 py-3 text-[#fe2c55] text-sm hover:bg-white/5 flex items-center gap-2">
                        <Icon name="Trash2" size={15} />
                        <span>Удалить чат</span>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pinned message bar (для группы) */}
      {isGroup && pinnedMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0c1318] border-b border-white/8">
          <div className="w-1 h-9 rounded bg-[#61d4f0]" />
          <div className="flex-1 min-w-0">
            <div className="text-[#61d4f0] text-xs font-medium">Закреплённое сообщение</div>
            <div className="text-white/70 text-xs truncate">
              {pinnedMessage.type === "image" ? "📷 Фото" :
                pinnedMessage.type === "voice" ? "🎤 Голосовое" :
                pinnedMessage.type === "file" ? "📎 Файл" :
                pinnedMessage.type === "sticker" ? "🎨 Стикер" :
                pinnedMessage.content || ""}
            </div>
          </div>
          {communityIsAdmin && (
            <button onClick={unpinMessage} className="text-white/50 hover:text-white p-1">
              <Icon name="X" size={16} />
            </button>
          )}
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border-b border-white/8">
          <Icon name="Search" size={16} className="text-white/40" />
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по сообщениям..."
            className="flex-1 bg-transparent text-white text-base outline-none placeholder-white/30"
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
          const canActOnMsg = msg.id > 0 && (isMe || (isGroup && communityIsAdmin));
          const longPressProps = canActOnMsg ? {
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

      {/* Emoji / Stickers / GIF panel */}
      {showEmoji && (
        <div className="bg-[#111] border-t border-white/8 flex flex-col">
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-2.5">
            {([
              { id: "emoji", label: "Эмодзи", icon: "Smile" },
              { id: "stickers", label: "Стикеры", icon: "Sticker" },
              { id: "gif", label: "GIF", icon: "Film" },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setEmojiTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${emojiTab === t.id ? "bg-[#fe2c55] text-white" : "bg-white/8 text-white/60 hover:bg-white/15"}`}
              >
                <Icon name={t.icon} size={15} />
                {t.label}
              </button>
            ))}
          </div>

          {emojiTab === "emoji" && (
            <>
              <div className="flex items-center gap-1 px-3 pt-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {EMOJI_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEmojiCat(c.id)}
                    className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${emojiCat === c.id ? "bg-white/15 text-[#fe2c55]" : "text-white/50 hover:bg-white/10"}`}
                  >
                    <Icon name={c.icon} size={18} />
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                <div className="grid grid-cols-8 gap-1">
                  {(EMOJI_CATEGORIES.find((c) => c.id === emojiCat)?.emojis || []).map((e, i) => (
                    <button
                      key={i}
                      onClick={() => insertEmoji(e)}
                      className="w-9 h-9 flex items-center justify-center text-2xl rounded-lg hover:bg-white/10 active:bg-white/20"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {emojiTab === "stickers" && (
            <div className="px-3 py-3 max-h-56 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              <div className="grid grid-cols-4 gap-2">
                {STICKERS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendSticker(s)}
                    className="aspect-square flex items-center justify-center text-5xl rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {emojiTab === "gif" && (
            <div className="flex flex-col">
              <div className="px-3 pt-2">
                <div className="flex items-center gap-2 bg-white/8 rounded-full px-3.5 py-2">
                  <Icon name="Search" size={15} className="text-white/40" />
                  <input
                    value={gifQuery}
                    onChange={(e) => setGifQuery(e.target.value)}
                    placeholder="Поиск GIF..."
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
                  />
                </div>
              </div>
              <div className="px-3 py-2 max-h-52 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                {gifLoading && gifResults.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-white/40 text-sm">Загрузка...</div>
                ) : gifResults.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-white/40 text-sm">Ничего не найдено</div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {gifResults.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => sendGif(g.url)}
                        className="aspect-square rounded-xl overflow-hidden bg-white/5 active:scale-95 transition-transform"
                      >
                        <img src={g.preview} className="w-full h-full object-cover" alt="gif" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Attach panel */}
      {showAttach && (
        <div className="bg-[#111] border-t border-white/8 px-4 py-4 grid grid-cols-4 gap-4">
          {[
            { icon: "Image", label: "Фото", action: () => fileRef.current?.click(), show: true },
            { icon: "FileText", label: "Файл", action: () => docRef.current?.click(), show: true },
            { icon: "MapPin", label: "Геолокация", action: sendLocation, show: true },
            { icon: "Contact", label: "Контакт", action: openContactPicker, show: true },
            { icon: "BarChart3", label: "Опрос", action: () => { setShowAttach(false); setShowPolls(true); }, show: isGroup && communityIsAdmin },
            { icon: "ListChecks", label: "Опросы", action: () => { setShowAttach(false); setShowPolls(true); }, show: isGroup && !communityIsAdmin },
          ].filter(item => item.show).map((item) => (
            <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                <Icon name={item.icon as "Image"} size={22} className="text-white" />
              </div>
              <span className="text-white/50 text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Polls modal */}
      {showPolls && isGroup && (
        <PollsPanel
          communityId={communityId}
          isAdmin={communityIsAdmin}
          onClose={() => setShowPolls(false)}
        />
      )}

      {showMembersScreen && isGroup && (
        <MembersScreen
          communityId={communityId}
          communityName={chat.name}
          creatorId={communityCreatorId}
          onBack={() => setShowMembersScreen(false)}
        />
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
              className="flex-1 bg-transparent text-white text-base outline-none resize-none placeholder-white/30 max-h-32 leading-snug"
              style={{ scrollbarWidth: "none" }}
            />
            <button onClick={() => setShowEmoji((v) => !v)} className={`flex-shrink-0 mb-0.5 transition-colors ${showEmoji ? "text-[#fe2c55]" : "text-white/40"}`}>
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

      {showContactPicker && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center" onClick={() => setShowContactPicker(false)}>
          <div className="bg-[#1a1a1a] w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-base font-semibold">Выбери контакт</p>
              <button onClick={() => setShowContactPicker(false)} className="text-white/60">
                <Icon name="X" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto -mx-2" style={{ scrollbarWidth: "none" }}>
              {contactList.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">Контактов нет</p>
              ) : (
                contactList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => sendContact(c)}
                    className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/5 text-left"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <UserAvatar src={c.avatar} name={c.name} alt={c.name} />
                    </div>
                    <span className="text-white text-sm truncate">{c.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[#1a1a1a] rounded-t-2xl sm:rounded-2xl p-2 w-full sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
            {isGroup && communityIsAdmin && (
              <button
                onClick={() => { const id = confirmDelete!; setConfirmDelete(null); pinMessage(id); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white text-sm hover:bg-white/5 rounded-lg"
              >
                <Icon name="Pin" size={18} className="text-[#61d4f0]" />
                <span>Закрепить сообщение</span>
              </button>
            )}
            <button
              onClick={() => deleteMessage(confirmDelete!)}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#fe2c55] text-sm hover:bg-white/5 rounded-lg"
            >
              <Icon name="Trash2" size={18} />
              <span>Удалить сообщение</span>
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="w-full px-4 py-3 text-white/60 text-sm hover:bg-white/5 rounded-lg"
            >
              Отмена
            </button>
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
          <div className="bg-[#1a1a1a] rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <p className="text-white text-base font-semibold mb-2">Очистить чат?</p>
            <p className="text-white/50 text-sm mb-5">Выбери, как очистить переписку.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => clearChat(false)} className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15">
                Очистить только у меня
              </button>
              <button onClick={() => clearChat(true)} className="w-full py-3 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold hover:opacity-90">
                Очистить у всех
              </button>
              <button onClick={() => setConfirmClear(false)} className="w-full py-2.5 rounded-xl text-white/60 text-sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Удалить чат */}
      {confirmDeleteChat && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-6" onClick={() => setConfirmDeleteChat(false)}>
          <div className="bg-[#1a1a1a] rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Trash2" size={18} className="text-[#fe2c55]" />
              <p className="text-white text-base font-semibold">Удалить чат?</p>
            </div>
            <p className="text-white/50 text-sm mb-5">Чат «{displayName}» исчезнет у всех участников вместе со всей перепиской. Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteChat(false)} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white text-sm">Отмена</button>
              <button onClick={deleteChat} className="flex-1 py-2.5 rounded-xl bg-[#fe2c55] text-white text-sm font-semibold">Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Добавить участников */}
      {showAddMembers && (() => {
        const q = addMembersSearch.trim().toLowerCase();
        const qDigits = q.replace(/\D/g, "");
        const filtered = addMembersList.filter(u => {
          if (u.id === MY_ID) return false;
          if (!q) return true;
          if (u.name.toLowerCase().includes(q)) return true;
          if (u.handle && u.handle.toLowerCase().includes(q.replace(/^@/, ""))) return true;
          if (qDigits.length >= 3 && u.phone && u.phone.replace(/\D/g, "").includes(qDigits)) return true;
          return false;
        });
        return (
          <div className="fixed inset-0 z-[60] bg-black/80 flex items-end sm:items-center justify-center" onClick={() => setShowAddMembers(false)}>
            <div className="bg-[#1a1a1a] w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold text-lg">Добавить участников</span>
                  <button onClick={() => setShowAddMembers(false)}>
                    <Icon name="X" size={22} className="text-white/60" />
                  </button>
                </div>
                {!isGroup && (
                  <p className="text-white/50 text-xs mb-3">Чат станет групповым после добавления</p>
                )}
                <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                  <Icon name="Search" size={16} className="text-white/40" />
                  <input
                    value={addMembersSearch}
                    onChange={e => setAddMembersSearch(e.target.value)}
                    placeholder="Имя, @ник или номер"
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30"
                    autoFocus
                  />
                </div>
                {selectedNewMembers.length > 0 && (
                  <div className="mt-3 text-white/60 text-xs">Выбрано: {selectedNewMembers.length}</div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2" style={{ scrollbarWidth: "none" }}>
                {filtered.length === 0 ? (
                  <div className="text-center text-white/40 text-sm py-8">Никого не нашли</div>
                ) : (
                  filtered.map(u => {
                    const selected = selectedNewMembers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedNewMembers(prev => selected ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl text-left"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold text-sm truncate">{u.name}</p>
                          <p className="text-white/40 text-xs truncate">{u.handle ? `@${u.handle}` : (u.phone || "")}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected ? "bg-[#fe2c55] border-[#fe2c55]" : "border-white/30"}`}>
                          {selected && <Icon name="Check" size={12} className="text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-4 border-t border-white/8">
                <button
                  onClick={handleAddMembers}
                  disabled={selectedNewMembers.length === 0 || addingMembers}
                  className="w-full py-3.5 rounded-xl bg-[#fe2c55] text-white font-bold text-base disabled:opacity-40"
                >
                  {addingMembers ? "Добавляем..." : `Добавить${selectedNewMembers.length > 0 ? ` (${selectedNewMembers.length})` : ""}`}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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