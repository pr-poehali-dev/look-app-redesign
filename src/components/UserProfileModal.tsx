import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { getAuthor } from "@/data/authors";

interface Props {
  handle: string;
  onClose: () => void;
}

const FOLLOWING_KEY = "following_handles_v1";

const readFollowing = (): string[] => {
  try {
    const raw = localStorage.getItem(FOLLOWING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeFollowing = (list: string[]) => {
  try {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("following-change"));
  } catch {
    // ignore
  }
};

const UserProfileModal = ({ handle, onClose }: Props) => {
  const data = getAuthor(handle);
  const [following, setFollowing] = useState(() => readFollowing().includes(handle));
  const [tab, setTab] = useState<"grid" | "tagged">("grid");
  const [openedItem, setOpenedItem] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (openedItem !== null) setOpenedItem(null);
        else onClose();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, openedItem]);

  const toggleFollow = () => {
    const list = readFollowing();
    if (list.includes(handle)) {
      writeFollowing(list.filter(h => h !== handle));
      setFollowing(false);
    } else {
      writeFollowing([handle, ...list]);
      setFollowing(true);
    }
  };

  const openMessage = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("open-direct-message", { detail: { handle } }));
  };

  const opened = openedItem !== null ? data.gallery[openedItem] : null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 px-4 pt-12 md:pt-6 pb-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <button onClick={onClose} className="p-1">
            <Icon name="ArrowLeft" size={22} className="text-black" />
          </button>
          <div className="flex-1 flex items-center justify-center gap-1.5 pr-7">
            <span className="text-black font-bold text-base">@{data.handle}</span>
            {data.verified && <Icon name="BadgeCheck" size={14} className="text-[#0095f6]" />}
          </div>
        </div>

        <div className="px-5 pt-5 pb-3 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-[#fe2c55] ring-offset-2 ring-offset-white">
            <UserAvatar src={data.avatar} name={data.name} alt={data.name} />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <button className="active:opacity-60">
              <p className="text-black font-bold text-base">{data.posts}</p>
              <p className="text-gray-500 text-xs">постов</p>
            </button>
            <button className="active:opacity-60">
              <p className="text-black font-bold text-base">{data.followers}</p>
              <p className="text-gray-500 text-xs">подписчиков</p>
            </button>
            <button className="active:opacity-60">
              <p className="text-black font-bold text-base">{data.following}</p>
              <p className="text-gray-500 text-xs">подписок</p>
            </button>
          </div>
        </div>

        <div className="px-5 pb-3">
          <p className="text-black font-semibold text-sm">{data.name}</p>
          <p className="text-gray-700 text-sm leading-snug mt-0.5 whitespace-pre-line">{data.bio}</p>
        </div>

        <div className="px-5 pb-4 flex gap-2">
          <button
            onClick={toggleFollow}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${
              following ? "bg-gray-100 text-black" : "bg-[#fe2c55] text-white"
            }`}
          >
            {following ? "Вы подписаны" : "Подписаться"}
          </button>
          <button
            onClick={openMessage}
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-black active:scale-95"
          >
            Сообщение
          </button>
          <button className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center active:scale-95">
            <Icon name="UserPlus" size={18} className="text-black" />
          </button>
        </div>

        <div className="border-t border-gray-100 flex">
          <button
            onClick={() => setTab("grid")}
            className={`flex-1 flex items-center justify-center py-3 ${tab === "grid" ? "border-b-2 border-black" : "border-b-2 border-transparent"}`}
          >
            <Icon name="Grid3x3" size={20} className={tab === "grid" ? "text-black" : "text-gray-400"} />
          </button>
          <button
            onClick={() => setTab("tagged")}
            className={`flex-1 flex items-center justify-center py-3 ${tab === "tagged" ? "border-b-2 border-black" : "border-b-2 border-transparent"}`}
          >
            <Icon name="UserSquare" size={20} className={tab === "tagged" ? "text-black" : "text-gray-400"} />
          </button>
        </div>

        {tab === "grid" ? (
          data.gallery.length > 0 ? (
            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {data.gallery.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setOpenedItem(i)}
                  className="relative aspect-square overflow-hidden bg-gray-100 active:opacity-80"
                >
                  <img src={item.image} alt="" className="w-full h-full object-cover" />
                  {item.isVideo && (
                    <Icon name="Play" size={14} className="absolute top-1.5 right-1.5 text-white drop-shadow" />
                  )}
                  {item.views && (
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5">
                      <Icon name="Play" size={10} className="text-white drop-shadow" />
                      <span className="text-white text-[10px] font-semibold drop-shadow">{item.views}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Icon name="Camera" size={48} className="text-gray-300" />
              <p className="text-gray-400 text-sm">Пока нет публикаций</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Icon name="UserSquare" size={48} className="text-gray-300" />
            <p className="text-gray-400 text-sm">Нет отметок</p>
          </div>
        )}
        <div className="pb-24" />
      </div>

      {opened && (
        <div
          className="fixed inset-0 z-[10001] bg-black flex flex-col"
          onClick={() => setOpenedItem(null)}
        >
          <div className="flex items-center justify-between px-4 pt-12 pb-3">
            <button onClick={() => setOpenedItem(null)} className="p-2 -ml-2">
              <Icon name="ArrowLeft" size={24} className="text-white" />
            </button>
            <span className="text-white font-semibold text-sm">@{data.handle}</span>
            <div className="w-10" />
          </div>
          <div className="flex-1 flex items-center justify-center overflow-hidden" onClick={e => e.stopPropagation()}>
            {opened.isVideo ? (
              <video src={opened.image} className="max-h-full max-w-full object-contain" controls autoPlay playsInline loop />
            ) : (
              <img src={opened.image} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
          {opened.views && (
            <div className="px-5 py-3 text-white/70 text-sm">{opened.views} просмотров</div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
};

export default UserProfileModal;
