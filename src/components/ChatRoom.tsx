import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { Chat } from "./MessagesScreen";
import CallScreen from "./CallScreen";

interface Message {
  id: number;
  from: "me" | "them";
  type: "text" | "voice" | "image" | "emoji";
  text?: string;
  duration?: number;
  imageUrl?: string;
  time: string;
  read: boolean;
}

const INIT_MESSAGES: Message[] = [
  { id: 1, from: "them", type: "text", text: "Привет! Как дела? 👋", time: "10:12", read: true },
  { id: 2, from: "me", type: "text", text: "Всё отлично! Смотрел твоё последнее видео — огонь 🔥", time: "10:13", read: true },
  { id: 3, from: "them", type: "text", text: "Спасибо! Сегодня выложу ещё одно. Будешь смотреть?", time: "10:14", read: true },
  { id: 4, from: "me", type: "voice", duration: 12, time: "10:15", read: true },
  { id: 5, from: "them", type: "image", imageUrl: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg", time: "10:16", read: true },
  { id: 6, from: "them", type: "text", text: "Вот превью нового видео 🎬", time: "10:16", read: true },
];

const AUTO_REPLIES = [
  "Понял, окей 👍",
  "Круто! 🔥",
  "Давай сегодня вечером?",
  "Согласен полностью",
  "😂😂😂",
  "Отличная идея!",
  "Скоро отвечу",
];

interface ChatRoomProps {
  chat: Chat;
  onBack: () => void;
}

const ChatRoom = ({ chat, onBack }: ChatRoomProps) => {
  const [messages, setMessages] = useState<Message[]>(INIT_MESSAGES);
  const [input, setInput] = useState("");
  const [call, setCall] = useState<"audio" | "video" | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [showAttach, setShowAttach] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMsg = (text: string, type: Message["type"] = "text", extra?: Partial<Message>) => {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const msg: Message = { id: Date.now(), from: "me", type, text, time, read: false, ...extra };
    setMessages((p) => [...p, msg]);
    setTimeout(() => {
      const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
      setMessages((p) => [...p, { id: Date.now() + 1, from: "them", type: "text", text: reply, time, read: true }]);
    }, 1000 + Math.random() * 1000);
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
    sendMsg("", "voice", { duration: recSecs || 1 });
    setRecSecs(0);
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    sendMsg("", "image", { imageUrl: url });
    setShowAttach(false);
  };

  if (call) {
    return <CallScreen name={chat.name} avatar={chat.avatar} mode={call} onEnd={() => setCall(null)} />;
  }

  return (
    <div className="h-full bg-[#0a0a0a] flex flex-col overflow-hidden">
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImage} />

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
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
            {msg.type === "image" && msg.imageUrl ? (
              <div className={`max-w-[70%] rounded-2xl overflow-hidden ${msg.from === "me" ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                <img src={msg.imageUrl} className="w-full object-cover max-h-56" alt="img" />
                <div className="bg-[#1a1a1a] px-3 py-1.5 flex justify-end">
                  <span className="text-white/30 text-[10px]">{msg.time}</span>
                </div>
              </div>
            ) : msg.type === "voice" ? (
              <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl max-w-[65%] ${msg.from === "me" ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
                <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Icon name="Play" size={14} className="text-white ml-0.5" />
                </button>
                <div className="flex items-center gap-0.5 flex-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="w-0.5 bg-white/50 rounded-full" style={{ height: `${Math.random() * 16 + 4}px` }} />
                  ))}
                </div>
                <span className="text-white/70 text-xs flex-shrink-0">{msg.duration}с</span>
              </div>
            ) : (
              <div className={`px-4 py-2.5 rounded-2xl max-w-[78%] ${msg.from === "me" ? "bg-[#fe2c55] rounded-br-sm" : "bg-[#1e1e1e] rounded-bl-sm"}`}>
                <p className="text-white text-sm leading-snug">{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                  <span className="text-white/40 text-[10px]">{msg.time}</span>
                  {msg.from === "me" && (
                    <Icon name="CheckCheck" size={12} className={msg.read ? "text-[#61d4f0]" : "text-white/30"} />
                  )}
                </div>
              </div>
            )}
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
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${showAttach ? "bg-[#fe2c55]" : "bg-white/10"}`}
        >
          <Icon name="Plus" size={18} className="text-white" />
        </button>

        <div className="flex-1 flex items-end bg-white/8 rounded-2xl px-3 py-2 min-h-[40px]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Сообщение..."
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/30 resize-none"
          />
          <button className="ml-2 flex-shrink-0">
            <Icon name="Smile" size={18} className="text-white/40" />
          </button>
        </div>

        {input.trim() ? (
          <button
            onClick={handleSend}
            className="w-9 h-9 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0"
          >
            <Icon name="Send" size={16} className="text-white" />
          </button>
        ) : (
          <button
            onMouseDown={startVoice}
            onMouseUp={stopVoice}
            onTouchStart={startVoice}
            onTouchEnd={stopVoice}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${recording ? "bg-[#fe2c55] scale-125" : "bg-white/10"}`}
          >
            <Icon name={recording ? "Square" : "Mic"} size={18} className="text-white" />
          </button>
        )}
      </div>

      {recording && (
        <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center z-10">
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-[#fe2c55] animate-pulse" />
            <span className="text-white text-sm font-mono">
              {String(Math.floor(recSecs / 60)).padStart(2, "0")}:{String(recSecs % 60).padStart(2, "0")}
            </span>
            <span className="text-white/50 text-xs">Запись голосового...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;
