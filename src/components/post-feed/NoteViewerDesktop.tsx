import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { Post, formatLikes } from "./PostFeedTypes";
import { useComments, CommentItem } from "@/hooks/useComments";
import { useLikes } from "@/hooks/useLikes";
import { useSavedItem } from "@/hooks/useSaved";
import { useFollowing } from "@/hooks/useFollowing";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const CommentRow = ({
  c,
  isReply,
  onReply,
  onLike,
}: {
  c: CommentItem;
  isReply?: boolean;
  onReply: (c: CommentItem) => void;
  onLike: (id: number | string) => void;
}) => (
  <div className={`flex gap-2.5 ${isReply ? "ml-10 mt-3" : "mt-5"}`}>
    <div className={`${isReply ? "w-6 h-6" : "w-8 h-8"} rounded-full overflow-hidden flex-shrink-0`}>
      <UserAvatar name={c.name} alt={c.name} />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[13px] text-neutral-500 truncate">{c.name}</p>
      <p className="text-[14px] text-neutral-900 leading-snug break-words">{c.text}</p>
      <div className="flex items-center gap-4 mt-1 text-[12px] text-neutral-400">
        <span>{c.time}</span>
        <button onClick={() => onLike(c.id)} className="flex items-center gap-1 hover:text-neutral-700">
          <Icon name="Heart" size={13} className={c.liked ? "text-[#fe2c55] fill-[#fe2c55]" : ""} />
          {c.likes > 0 && <span>{c.likes}</span>}
        </button>
        <button onClick={() => onReply(c)} className="hover:text-neutral-700">Ответить</button>
      </div>
    </div>
  </div>
);

const NoteViewerDesktop = ({ post, onClose }: { post: Post; onClose: () => void }) => {
  const { user } = useAuth();
  const { liked, count: likes, toggle: toggleLike } = useLikes("post", post.id, post.likes);
  const { saved, toggle: toggleSaved } = useSavedItem("post", post.id, {
    image: post.image,
    title: post.caption,
    handle: post.handle,
  });
  const { following, toggle: toggleFollow, isSelf } = useFollowing(post.handle);
  const { comments, count: commentCount, send, toggleLike: toggleCommentLike } = useComments("post", post.id, true, post.comments || 0);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: number | string) => comments.filter((c) => c.parentId != null && String(c.parentId) === String(id));

  const submit = () => {
    if (!text.trim()) return;
    send(text, undefined, replyTo?.id ?? null);
    setText("");
    setReplyTo(null);
  };

  const startReply = (c: CommentItem) => {
    setReplyTo(c);
    setText(`@${c.name} `);
    inputRef.current?.focus();
  };

  const share = async () => {
    const url = `${window.location.origin}/?post=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  const openProfile = () =>
    window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: post.handle } }));

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        aria-label="Закрыть"
      >
        <Icon name="X" size={20} className="text-white" />
      </button>

      <div
        className="flex w-[min(1100px,92vw)] h-[min(88vh,820px)] rounded-2xl overflow-hidden bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center">
          {post.isVideo ? (
            <video
              src={post.image}
              className="max-w-full max-h-full w-full h-full object-contain"
              controls
              autoPlay
              loop
              playsInline
            />
          ) : (
            <img src={post.image} alt={post.caption} className="max-w-full max-h-full w-full h-full object-contain" />
          )}
        </div>

        <div className="w-[400px] flex-shrink-0 flex flex-col bg-white text-neutral-900">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-100">
            <button onClick={openProfile} className="flex items-center gap-3 min-w-0 text-left">
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <UserAvatar src={post.avatar} name={post.author || post.handle} alt={post.author} />
              </div>
              <span className="text-[15px] font-semibold truncate">{post.author || post.handle}</span>
            </button>
            {!isSelf && (
              <button
                onClick={toggleFollow}
                className={`px-5 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                  following ? "bg-neutral-100 text-neutral-700 hover:bg-neutral-200" : "bg-[#fe2c55] text-white hover:bg-[#e8294d]"
                }`}
              >
                {following ? "Вы подписаны" : "Подписаться"}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin" }}>
            {post.caption && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{post.caption}</p>}
            {post.hashtags?.length > 0 && (
              <p className="mt-2 text-[14px] text-[#2b6cb0] break-words">
                {post.hashtags.map((h) => `#${h}`).join(" ")}
              </p>
            )}
            <p className="mt-3 text-[12px] text-neutral-400">{post.time}</p>

            <div className="mt-5 pt-4 border-t border-neutral-100">
              <p className="text-[13px] text-neutral-500">Комментарии: {commentCount}</p>
              {topLevel.length === 0 && (
                <p className="text-center text-sm text-neutral-400 py-10">Пока нет комментариев. Будьте первым!</p>
              )}
              {topLevel.map((c) => (
                <div key={c.id}>
                  <CommentRow c={c} onReply={startReply} onLike={toggleCommentLike} />
                  {repliesOf(c.id).map((r) => (
                    <CommentRow key={r.id} c={r} isReply onReply={startReply} onLike={toggleCommentLike} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-100 px-5 py-3 flex-shrink-0">
            {replyTo && (
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                <span>Ответ для {replyTo.name}</span>
                <button onClick={() => { setReplyTo(null); setText(""); }} className="hover:text-neutral-800">
                  <Icon name="X" size={14} />
                </button>
              </div>
            )}
            <div className="flex items-center gap-4">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder={user ? "Оставить комментарий" : "Войдите, чтобы комментировать"}
                disabled={!user}
                className="flex-1 min-w-0 h-10 px-4 rounded-full bg-neutral-100 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none disabled:opacity-60"
              />
              {text.trim() ? (
                <button onClick={submit} className="text-[#fe2c55] text-sm font-semibold flex-shrink-0">
                  Отправить
                </button>
              ) : (
                <div className="flex items-center gap-4 flex-shrink-0 text-neutral-700">
                  <button onClick={toggleLike} className="flex items-center gap-1.5 hover:text-neutral-900">
                    <Icon name="Heart" size={22} className={liked ? "text-[#fe2c55] fill-[#fe2c55]" : ""} />
                    <span className="text-sm">{formatLikes(likes)}</span>
                  </button>
                  <button onClick={toggleSaved} className="flex items-center gap-1.5 hover:text-neutral-900">
                    <Icon name="Star" size={22} className={saved ? "text-amber-400 fill-amber-400" : ""} />
                  </button>
                  <button onClick={() => inputRef.current?.focus()} className="flex items-center gap-1.5 hover:text-neutral-900">
                    <Icon name="MessageCircle" size={22} />
                    <span className="text-sm">{commentCount}</span>
                  </button>
                  <button onClick={share} className="hover:text-neutral-900">
                    <Icon name="Share2" size={22} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteViewerDesktop;
