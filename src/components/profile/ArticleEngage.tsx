import { useMemo, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useLikes } from "@/hooks/useLikes";
import { useComments, CommentItem } from "@/hooks/useComments";
import { useSavedItem } from "@/hooks/useSaved";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import ArticleShareSheet from "@/components/profile/ArticleShareSheet";

const EMOJIS = ["😀", "😍", "🔥", "👏", "😮", "😢", "🙏", "👍", "❤️", "🏔️", "🌊", "📸"];

interface Props {
  articleId: number;
  title: string;
  cover: string | null;
  authorName: string;
  authorHandle?: string | null;
}

const ArticleEngage = ({ articleId, title, cover, authorName, authorHandle }: Props) => {
  const { user } = useAuth();
  const guest = !user;
  const needAuth = () => toast("Зарегистрируйтесь, чтобы ставить лайки, комментировать и сохранять");
  const likes = useLikes("article", articleId);
  const { comments, count, send, toggleLike } = useComments("article", articleId, true);
  const payload = useMemo(() => ({ image: cover || "", title, handle: authorHandle || undefined }), [cover, title, authorHandle]);
  const save = useSavedItem("article", articleId, payload);
  const [text, setText] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: number | string; name: string } | null>(null);
  const [openReplies, setOpenReplies] = useState<Set<number | string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const tops = comments.filter((c) => !c.parentId);
  const repliesOf = (id: number | string) => comments.filter((c) => c.parentId === id);
  const isAuthor = (c: CommentItem) => (authorHandle && c.handle === authorHandle) || (!c.handle && c.name === authorName);

  const toggleReplies = (id: number | string) =>
    setOpenReplies((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async () => {
    if (guest) { needAuth(); return; }
    if (!text.trim()) return;
    const t = text;
    const parent = replyTo?.id ?? null;
    setText("");
    setReplyTo(null);
    setShowEmoji(false);
    if (parent) setOpenReplies((prev) => new Set(prev).add(parent));
    await send(t, user?.name, parent);
  };

  const reply = (c: CommentItem) => {
    setReplyTo({ id: c.parentId || c.id, name: c.name });
    inputRef.current?.focus();
  };

  const renderComment = (c: CommentItem, isReply = false) => (
    <div key={c.id} className="flex gap-3">
      <div className={`${isReply ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"} rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-gray-600`}>
        {(c.name || "?").charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <span className="font-semibold text-black">{c.name}</span>
          {isAuthor(c) && <span className="px-1.5 py-px rounded bg-[#fe2c55]/10 text-[#fe2c55] text-[10px] font-bold">Автор</span>}
        </p>
        <p className="text-black text-sm whitespace-pre-wrap break-words">{c.text}</p>
        <p className="text-gray-400 text-xs mt-0.5 flex gap-3">
          <span>{c.time}</span>
          <button onClick={() => (guest ? needAuth() : reply(c))} className="font-semibold">Ответить</button>
        </p>
      </div>
      <button onClick={() => (guest ? needAuth() : toggleLike(c.id))} className="flex flex-col items-center gap-0.5 self-start pt-1">
        <Icon name="Heart" size={16} className={c.liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-gray-400"} />
        <span className="text-gray-400 text-[10px]">{c.likes}</span>
      </button>
    </div>
  );

  return (
    <>
      <div ref={listRef} className="px-5 pt-6 flex flex-col gap-4 border-t border-gray-100 mt-6">
        <p className="text-black font-bold text-sm">Комментарии · {count}</p>
        {tops.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Комментариев пока нет. Будь первым!</p>
        ) : tops.map((c) => {
          const replies = repliesOf(c.id);
          const open = openReplies.has(c.id);
          return (
            <div key={c.id} className="flex flex-col gap-3">
              {renderComment(c)}
              {replies.length > 0 && (
                <div className="ml-11 flex flex-col gap-3">
                  {open && replies.map((r) => renderComment(r, true))}
                  <button onClick={() => toggleReplies(c.id)} className="text-gray-400 text-xs font-semibold text-left flex items-center gap-1">
                    <span className="w-5 h-px bg-gray-300" />
                    {open ? "Скрыть ответы" : `Показать ответы (${replies.length})`}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-20 bg-white border-t border-gray-100 px-3 pt-2 pb-3 mt-4">
        {replyTo && (
          <div className="flex items-center justify-between text-xs text-gray-500 px-2 pb-1.5">
            <span>Ответ для {replyTo.name}</span>
            <button onClick={() => setReplyTo(null)}><Icon name="X" size={14} /></button>
          </div>
        )}
        {showEmoji && (
          <div className="flex gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {EMOJIS.map((e) => (
              <button key={e} onClick={() => setText((t) => t + e)} className="text-2xl px-1.5 py-0.5 rounded-lg active:scale-90 transition-transform">{e}</button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center rounded-full bg-gray-100 pl-4 pr-1.5">
            <input
              ref={inputRef}
              readOnly={guest}
              onFocus={() => { if (guest) { inputRef.current?.blur(); needAuth(); } }}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Напиши комментарий..."
              maxLength={2000}
              className="flex-1 min-w-0 bg-transparent py-2.5 text-black text-sm outline-none"
            />
            {text.trim() ? (
              <button onClick={submit} className="px-3 py-1 rounded-full bg-[#fe2c55] text-white text-xs font-semibold">Отправить</button>
            ) : (
              <button onClick={() => (guest ? needAuth() : setShowEmoji((v) => !v))} className="p-1.5"><Icon name="Smile" size={20} className="text-gray-500" /></button>
            )}
          </div>
          <button onClick={guest ? needAuth : likes.toggle} className="flex items-center gap-1 active:scale-95 transition-transform">
            <Icon name="Heart" size={24} className={likes.liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-black"} />
            <span className="text-black text-xs font-semibold">{likes.count}</span>
          </button>
          <button onClick={guest ? needAuth : save.toggle} className="active:scale-95 transition-transform">
            <Icon name="Bookmark" size={24} className={save.saved ? "text-[#fe2c55] fill-[#fe2c55]" : "text-black"} />
          </button>
          <button onClick={() => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="flex items-center gap-1 active:scale-95 transition-transform">
            <Icon name="MessageCircle" size={24} className="text-black" />
            <span className="text-black text-xs font-semibold">{count}</span>
          </button>
          <button onClick={() => setShowShare(true)} className="active:scale-95 transition-transform">
            <Icon name="ShareForward" size={24} className="text-black" />
          </button>
        </div>
      </div>
      {showShare && <ArticleShareSheet articleId={articleId} title={title} authorName={authorName} onClose={() => setShowShare(false)} />}
    </>
  );
};

export default ArticleEngage;
