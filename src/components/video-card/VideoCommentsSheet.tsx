import type { RefObject } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import LinkifiedText from "@/components/ui/linkified-text";
import UserAvatar from "@/components/ui/user-avatar";
import ReportButton from "@/components/ReportButton";
import { promptAuth } from "@/lib/promptAuth";
import type { useComments } from "@/hooks/useComments";

interface Props {
  user: object | null | undefined;
  commentCount: number;
  allComments: ReturnType<typeof useComments>["comments"];
  setShowComments: (v: boolean) => void;
  startReply: (id: number | string, name: string) => void;
  toggleCommentLike: ReturnType<typeof useComments>["toggleLike"];
  replyingTo: { id: number | string; name: string } | null;
  setReplyingTo: (v: { id: number | string; name: string } | null) => void;
  commentText: string;
  setCommentText: (v: string) => void;
  commentInputRef: RefObject<HTMLInputElement | null>;
  handleSendComment: () => void;
}

const VideoCommentsSheet = ({ user, commentCount, allComments, setShowComments, startReply, toggleCommentLike, replyingTo, setReplyingTo, commentText, setCommentText, commentInputRef, handleSendComment }: Props) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:bg-black/40"
      onPointerDown={() => setShowComments(false)}
    >
      <div
        className="sheet-theme rounded-t-3xl flex flex-col max-h-[70%] md:rounded-t-none md:rounded-l-3xl md:max-h-none md:h-full md:w-[400px] md:ml-auto md:shadow-2xl animate-in slide-in-from-bottom md:slide-in-from-right duration-300"
        onPointerDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
          <span className="text-white font-bold text-base">{commentCount} комментариев</span>
          <button onPointerDown={() => setShowComments(false)}>
            <Icon name="X" size={20} className="text-white/60" />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
          {allComments.map(c => (
            <div key={c.id} className={`flex items-start gap-3 ${c.parentId ? "pl-9" : ""}`}>
              <div className="w-8 h-8 flex-shrink-0">
                <UserAvatar name={c.name} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-semibold text-sm">{c.name}</span>
                  <span className="text-white/30 text-xs">{c.time}</span>
                </div>
                <p className="text-white/80 text-sm break-words"><LinkifiedText text={c.text} /></p>
                <button
                  type="button"
                  onClick={() => startReply(c.id, c.name)}
                  className="text-white/40 text-xs font-semibold mt-1"
                >
                  Ответить
                </button>
              </div>
              <div className="flex-shrink-0 mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleCommentLike(c.id); }}
                  className="p-1 flex flex-col items-center gap-0.5"
                >
                  <Icon name="Heart" size={14} className={c.liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white/40"} />
                  {c.likes > 0 && <span className="text-white/30 text-[10px]">{c.likes}</span>}
                </button>
                <ReportButton
                  targetType="comment"
                  targetId={c.id}
                  className="p-1 text-white/40 hover:text-[#fe2c55]"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex flex-col border-t border-white/10 pb-8 md:pb-3">
          {replyingTo && (
            <div className="flex items-center justify-between px-4 pt-2 text-xs text-white/50">
              <span>Ответ для <span className="text-white/80 font-semibold">{replyingTo.name}</span></span>
              <button onClick={() => { setReplyingTo(null); setCommentText(""); }}>
                <Icon name="X" size={14} className="text-white/40" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
              <input
                ref={commentInputRef}
                readOnly={!user}
                onFocus={() => { if (!user) { commentInputRef.current?.blur(); promptAuth(); } }}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={user ? "Написать комментарий..." : "Войдите, чтобы комментировать"}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
                onKeyDown={e => e.key === "Enter" && handleSendComment()}
                autoComplete="off"
                autoFocus={!!user}
              />
            </div>
            <button
              onClick={handleSendComment}
              disabled={!commentText.trim()}
              className="w-9 h-9 rounded-full bg-[#fe2c55] flex items-center justify-center disabled:opacity-40"
            >
              <Icon name="Send" size={16} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoCommentsSheet;