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
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (typingPollRef.current) clearInterval(typingPollRef.current);
      if (readPollRef.current) clearInterval(readPollRef.current);
    };
  }, [chatId, fetchMessages, fetchTyping, fetchReads]);

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
    <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden">
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
          <button className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <Icon name="MoreVertical" size={17} className="text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-scroll px-3 py-4 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/20 text-sm">Начни общение первым!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.user_id === MY_ID;
          const prev = messages[i - 1];
          const isFirstInGroup = !isMe && (!prev || prev.user_id !== msg.user_id);
          const showName = isGroup && isFirstInGroup;
          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
              {!isMe && (
                <div className="w-7 h-7 flex-shrink-0">
                  <UserAvatar name={msg.user_name} />
                </div>
              )}
              <div className="flex flex-col max-w-[78%]">
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
    </div>
  );
};

export default ChatRoom;