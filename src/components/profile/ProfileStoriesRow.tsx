import type { Dispatch, SetStateAction, MutableRefObject, RefObject } from "react";
import Icon from "@/components/ui/icon";
import { useUserMedia } from "@/context/UserMediaContext";
import { VIDEO_CATEGORIES } from "./videoCategories";

type UserMedia = ReturnType<typeof useUserMedia>;

interface ProfileStoriesRowProps {
  stories: UserMedia["userVideos"];
  addMedia: UserMedia["addMedia"];
  removeMedia: UserMedia["removeMedia"];
  storyInputRef: RefObject<HTMLInputElement | null>;
  longPressTimer: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setStoryOrigin: Dispatch<SetStateAction<DOMRect | null>>;
  setViewingStory: Dispatch<SetStateAction<number | null>>;
  deleteStoryId: number | null;
  setDeleteStoryId: Dispatch<SetStateAction<number | null>>;
  categoryEditId: number | null;
  setCategoryEditId: Dispatch<SetStateAction<number | null>>;
  savingCategory: boolean;
  handleChangeCategory: (id: number, category: string) => Promise<void>;
}

const ProfileStoriesRow = ({
  stories, addMedia, removeMedia, storyInputRef, longPressTimer, setStoryOrigin, setViewingStory,
  deleteStoryId, setDeleteStoryId, categoryEditId, setCategoryEditId, savingCategory, handleChangeCategory,
}: ProfileStoriesRowProps) => {
  return (
      <div className="flex gap-4 md:gap-3 px-4 md:px-3 pb-4 md:pb-3 overflow-x-scroll" style={{ scrollbarWidth: "none" }}>
        {/* Add story */}
        <input
          ref={storyInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addMedia(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => storyInputRef.current?.click()}
          className="flex flex-col items-center gap-1 flex-shrink-0"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-16 h-16 md:w-14 md:h-14 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
            <Icon name="Plus" size={22} className="text-gray-400 md:hidden" />
            <Icon name="Plus" size={18} className="text-gray-400 hidden md:block" />
          </div>
          <span className="text-[10px] text-gray-400">Добавить</span>
        </button>
        {/* User stories from uploaded media */}
        {stories.slice(0, 8).map((s, i) => (
          <div key={s.id} className="relative flex flex-col items-center gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                const ring = e.currentTarget.querySelector("[data-story-ring]");
                setStoryOrigin((ring || e.currentTarget).getBoundingClientRect());
                setViewingStory(i);
              }}
              onMouseDown={() => { longPressTimer.current = setTimeout(() => setDeleteStoryId(s.id), 600); }}
              onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              onMouseLeave={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              onTouchStart={() => { longPressTimer.current = setTimeout(() => setDeleteStoryId(s.id), 600); }}
              onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
              className="flex flex-col items-center gap-1"
              style={{ touchAction: "manipulation" }}
            >
              <div data-story-ring className="w-16 h-16 md:w-14 md:h-14 rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white bg-gray-100">
                  {s.type === "video"
                    ? ((s.thumbnail || s.thumb)
                        ? <img loading="lazy" decoding="async" src={s.thumbnail || s.thumb} className="w-full h-full object-cover" alt="" />
                        : <video src={s.url} className="w-full h-full object-cover" muted playsInline preload="metadata" poster={s.thumbnail || s.thumb} />)
                    : <img loading="lazy" decoding="async" src={s.url} className="w-full h-full object-cover" alt="" />
                  }
                </div>
              </div>
              <span className="text-[10px] text-gray-500 w-16 md:w-14 text-center truncate">{s.label || `История ${i + 1}`}</span>
            </button>
          </div>
        ))}

        {/* Подтверждение удаления сторис */}
        {deleteStoryId !== null && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setDeleteStoryId(null)}>
            <div className="bg-white rounded-t-2xl w-full max-w-sm p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              <p className="text-center font-semibold text-gray-800">Удалить историю?</p>
              <button
                className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold"
                onClick={() => { removeMedia(deleteStoryId); setDeleteStoryId(null); }}
              >
                Удалить
              </button>
              <button
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold"
                onClick={() => setDeleteStoryId(null)}
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Выбор категории видео */}
        {categoryEditId !== null && (() => {
          const current = stories.find(s => s.id === categoryEditId)?.category;
          return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => !savingCategory && setCategoryEditId(null)}>
              <div className="bg-white rounded-t-2xl w-full max-w-sm flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
                <p className="text-center font-semibold text-gray-800 py-4 border-b border-gray-100">Категория видео</p>
                <div className="overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
                  {VIDEO_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      disabled={savingCategory}
                      onClick={() => handleChangeCategory(categoryEditId, cat.id)}
                      className={`w-full flex items-center justify-between px-5 py-3 text-left border-b border-gray-50 ${current === cat.id ? "text-[#8b5cf6] font-semibold" : "text-gray-700"}`}
                    >
                      {cat.label}
                      {current === cat.id && <Icon name="Check" size={18} className="text-[#8b5cf6]" />}
                    </button>
                  ))}
                </div>
                <button
                  className="w-full py-3 text-gray-500 font-semibold border-t border-gray-100"
                  onClick={() => setCategoryEditId(null)}
                  disabled={savingCategory}
                >
                  Отмена
                </button>
              </div>
            </div>
          );
        })()}
      </div>
  );
};

export default ProfileStoriesRow;