import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import { Chat } from "./MessagesScreen";
import CallScreen from "./CallScreen";

const API = "https://functions.poehali.dev/86962a84-c16a-4104-9fd1-3bb76958389c";

const MY_ID = (() => {
  let id = localStorage.getItem("chat_user_id");
  if (!id) { id = "u_" + Math.random().toString(36).slice(2, 10); localStorage.setItem("chat_user_id", id); }
  return id;
})();
const MY_NAME = (() => {
  let n = localStorage.getItem("chat_user_name");
  if (!n) { n = "Пользователь"; localStorage.setItem("chat_user_name", n); }
  return n;
})();

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
  const chatId = `chat_${Math.min(parseInt(MY_ID.slice(2), 36), chat.id)}_${Math.max(parseInt(MY_ID.slice(2), 36), chat.id)}`;
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

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}?module=chat&action=messages&chat_id=${chatId}&since_id=${lastIdRef.current}`,
        { headers: { "X-User-Id": MY_ID, "X-User-Name": MY_NAME } }
      );
      const data = await res.json();
      if (data.messages?.length) {
        lastIdRef.current = data.messages[data.messages.length - 1].id;
        setMessages((prev) => [...prev, ...data.messages]);
      }
    } catch (e) { void e; }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = async (content: string, type: Message["type"] = "text") => {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}?module=chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": MY_ID, "X-User-Name": MY_NAME },
        body: JSON.stringify({ chat_id: chatId, content, type }),
      });
      const data = await res.json();
      if (data.ok) {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        setMessages((p) => [...p, { id: data.id, user_id: MY_ID, user_name: MY_NAME, type, content, time: data.time || time }]);
        lastIdRef.current = data.id;
      }
    } catch (e) { void e; }
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

  const renderMsg = (msg: Message) => {
    const isMe = msg.user_id === MY_ID;
    if (msg.type === "image") {
      return (
        <div className={`max-w-[70%] rounded-2xl overflow-hidden ${isMe ? "rounded-br-sm" : "rounded-bl-sm"}`}>
          <img src={msg.content} className="w-full object-cover max-h-56" alt="img" />
          <div className="bg-[#1a1a1a] px-3 py-1.5 flex justify-end">
            <span className="text-white/30 text-[10px]">{msg.time}</span>
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
        </div>
      );
    }
    return (
      <div className={`px-4 py-2.5 rounded-2xl max-w-[78%] ${isMe ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
        <p className="text-white text-sm leading-snug">{msg.content}</p>
        <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
          <span className="text-white/40 text-[10px]">{msg.time}</span>
        </div>
      </div>
    );
  };

  if (call) {
    return (
      <CallScreen
        name={chat.name}
        avatar={chat.avatar}
        mode={call}
        myId={MY_ID}
        peerId={String(chat.id)}
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
          <img src={chat.avatar} className="w-full h-full object-cover" alt={chat.name} />
          {chat.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">{chat.name}</p>
          <p className="text-white/40 text-xs">{chat.online ? "в сети" : "был(а) недавно"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCall("video")} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
            <Icon name="Video" size={17} className="text-white" />
          </button>
          <button onClick={() => setCall("audio")} className="w-9 h-9 rounded-full bg-white/8 flex items-center justify-center">
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
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.user_id === MY_ID ? "justify-end" : "justify-start"}`}>
            {renderMsg(msg)}
          </div>
        ))}
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
      <div className="flex items-end gap-2 px-3 pb-8 pt-3 bg-black border-t border-white/8">
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
              onChange={(e) => setInput(e.target.value)}
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