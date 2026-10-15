import { createPortal } from "react-dom";
import { toast } from "sonner";
import Icon from "@/components/ui/icon";
import { promptAuth } from "@/lib/promptAuth";
import { markNotInterested, markMoreLikeThis, hideAuthor } from "@/hooks/useFeedSignals";
import type { VideoData } from "../VideoCard";

interface Props {
  video: VideoData;
  user: object | null | undefined;
  saved: boolean;
  isSelf: boolean;
  toggleSaved: () => void;
  setShowMore: (v: boolean) => void;
  setShowAddToBoard: (v: boolean) => void;
  setShowReport: (v: boolean) => void;
}

const VideoMoreSheet = ({ video, user, saved, isSelf, toggleSaved, setShowMore, setShowAddToBoard, setShowReport }: Props) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end md:flex-row md:justify-end md:items-center md:bg-black/40"
      onClick={() => setShowMore(false)}
    >
      <div
        className="sheet-theme rounded-t-3xl px-4 pt-5 pb-10 md:rounded-2xl md:pb-5 md:mr-6 md:w-[320px] md:shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <span className="text-white font-bold text-base">Ещё</span>
          <button onClick={() => setShowMore(false)}>
            <Icon name="X" size={20} className="text-white/60" />
          </button>
        </div>

        {/* Сохранить в коллекцию */}
        <button
          onClick={() => {
            toggleSaved();
            setShowMore(false);
          }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3 md:hidden"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon
              name="Bookmark"
              size={20}
              className={saved ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"}
            />
          </div>
          <span className="text-white text-sm font-medium">
            {saved ? "Убрать из коллекции" : "Сохранить в коллекцию"}
          </span>
        </button>

        {/* Добавить на доску */}
        <button
          onClick={() => {
            setShowMore(false);
            if (!user) { promptAuth(); return; }
            setShowAddToBoard(true);
          }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Layers" size={20} className="text-white" />
          </div>
          <span className="text-white text-sm font-medium">Добавить на доску</span>
        </button>

        {/* Перейти в профиль */}
        <button
          onClick={() => {
            setShowMore(false);
            window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { handle: video.handle } }));
          }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon name="User" size={20} className="text-white" />
          </div>
          <span className="text-white text-sm font-medium">Перейти в профиль</span>
        </button>

        {/* Показать больше такого */}
        <button
          onClick={() => {
            setShowMore(false);
            markMoreLikeThis(video.dbId ?? video.id);
            toast.success("Будем чаще показывать похожий контент");
          }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon name="ThumbsUp" size={20} className="text-white" />
          </div>
          <span className="text-white text-sm font-medium">Показать больше такого</span>
        </button>

        {/* Не интересно */}
        <button
          onClick={() => {
            setShowMore(false);
            markNotInterested(video.dbId ?? video.id);
            toast.success("Учли — покажем меньше такого контента");
          }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon name="ThumbsDown" size={20} className="text-white" />
          </div>
          <span className="text-white text-sm font-medium">Не интересно</span>
        </button>

        {/* Скрыть автора */}
        {!isSelf && (
          <button
            onClick={() => {
              setShowMore(false);
              hideAuthor(video.handle);
              toast.success(`Больше не будем показывать @${video.handle}`);
            }}
            className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3 mb-3"
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Icon name="EyeOff" size={20} className="text-white" />
            </div>
            <span className="text-white text-sm font-medium">Скрыть автора</span>
          </button>
        )}

        {/* Жалоба */}
        <button
          onClick={() => { setShowMore(false); if (!user) { promptAuth(); return; } setShowReport(true); }}
          className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3"
        >
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon name="Flag" size={20} className="text-[#fe2c55]" />
          </div>
          <span className="text-white text-sm font-medium">Пожаловаться</span>
        </button>
      </div>
    </div>,
    document.body
  );
};

export default VideoMoreSheet;
