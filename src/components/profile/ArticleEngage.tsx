import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useLikes } from "@/hooks/useLikes";
import { useComments } from "@/hooks/useComments";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const EMOJIS = ["😀", "😍", "🔥", "👏", "😮", "😢", "🙏", "👍", "❤️", "🏔️", "🌊", "📸"];

const ArticleEngage = ({ articleId, title }: { articleId: number; title: string }) => {
  const { user } = useAuth();
  const likes = useLikes("article", articleId);
  const { comments, count, send, toggleLike } = useComments("article", articleId, true);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: number | string; name: string } | null>(null);

  const submit = async () => {
    if (!text.trim()) return;
    const t = text;
    setText("");
    await send(t, user?.name, replyTo?.id ?? null);
    setReplyTo(null);
  };

  const share = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* отмена */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    }
  };

  return (
    <div className="px-5 pt-4 flex flex-col gap-4">
      <div className="flex items-center gap-5 py-3 border-y border-gray-100">
        <button onClick={likes.toggle} className="flex items-center gap-1.5 active:scale-95 transition-transform">
          <Icon name="Heart" size={24} className={likes.liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-black"} />
          <span className="text-black text-sm font-semibold">{likes.count}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <Icon name="MessageCircle" size={24} className="text-black" />
          <span className="text-black text-sm font-semibold">{count}</span>
        </div>
        <button onClick={share} className="flex items-center gap-1.5 ml-auto active:scale-95 transition-transform">
          <Icon name="Share2" size={22} className="text-black" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {EMOJIS.map((e) => (
          <button key={e} onClick={() => setText((t) => t + e)} className="text-2xl px-1.5 py-1 rounded-lg hover:bg-gray-100 active:scale-90 transition-transform">{e}</button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Ответ для {replyTo.name}</span>
            <button onClick={() => setReplyTo(null)}><Icon name="X" size={14} /></button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Напиши комментарий..."
            maxLength={2000}
            className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-gray-100 text-black text-sm outline-none"
          />
          <button onClick={submit} disabled={!text.trim()} className="px-4 rounded-full bg-black text-white text-sm font-semibold disabled:opacity-40">Отправить</button>
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-6">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Комментариев пока нет. Будь первым!</p>
        ) : comments.map((c) => (
          <div key={c.id} className={`flex gap-3 ${c.parentId ? "ml-10" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600">
              {(c.name || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500"><span className="font-semibold text-black">{c.name}</span> · {c.time}</p>
              <p className="text-black text-sm whitespace-pre-wrap break-words">{c.text}</p>
              <button onClick={() => setReplyTo({ id: c.parentId || c.id, name: c.name })} className="text-gray-400 text-xs font-semibold mt-0.5">Ответить</button>
            </div>
            <button onClick={() => toggleLike(c.id)} className="flex flex-col items-center gap-0.5 self-start pt-1">
              <Icon name="Heart" size={16} className={c.liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-gray-400"} />
              <span className="text-gray-400 text-[10px]">{c.likes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArticleEngage;
