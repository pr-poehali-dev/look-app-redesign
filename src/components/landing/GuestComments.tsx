import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import LinkifiedText from "@/components/ui/linkified-text";
import UserAvatar from "@/components/ui/user-avatar";
import { useComments } from "@/hooks/useComments";

interface GuestCommentsProps {
  videoId: number;
  initialCount?: number;
  onClose: () => void;
  onLogin: () => void;
}

const GuestComments = ({ videoId, initialCount = 0, onClose, onLogin }: GuestCommentsProps) => {
  const { comments, count, loading } = useComments("video", videoId, true, initialCount);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:bg-black/40"
      onPointerDown={onClose}
    >
      <div
        className="sheet-theme flex max-h-[70%] flex-col rounded-t-3xl animate-in slide-in-from-bottom duration-300 md:ml-auto md:h-full md:max-h-none md:w-[400px] md:rounded-l-3xl md:rounded-t-none md:shadow-2xl"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-4">
          <span className="text-base font-bold text-white">{count} комментариев</span>
          <button onClick={onClose} aria-label="Закрыть">
            <Icon name="X" size={20} className="text-white/60" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
          {loading && comments.length === 0 && (
            <div className="py-6 text-center text-sm text-white/50">Загрузка...</div>
          )}
          {!loading && comments.length === 0 && (
            <div className="py-6 text-center text-sm text-white/50">Комментариев пока нет</div>
          )}
          {comments.map((c) => (
            <div key={c.id} className={`flex items-start gap-3 ${c.parentId ? "pl-9" : ""}`}>
              <div className="h-8 w-8 flex-shrink-0">
                <UserAvatar name={c.name} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">{c.name}</span>
                  <span className="text-xs text-white/30">{c.time}</span>
                </div>
                <p className="break-words text-sm text-white/80"><LinkifiedText text={c.text} /></p>
              </div>
              <div className="mt-1 flex flex-shrink-0 flex-col items-center gap-0.5 p-1">
                <Icon name="Heart" size={14} className="text-white/40" />
                {c.likes > 0 && <span className="text-[10px] text-white/30">{c.likes}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 px-4 py-3 pb-8 md:pb-3">
          <button
            onClick={onLogin}
            className="w-full rounded-full bg-white/10 px-4 py-2.5 text-center text-sm text-white/60"
          >
            <span className="font-bold text-[#fe2c55]">Войти</span>, чтобы прокомментировать
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GuestComments;