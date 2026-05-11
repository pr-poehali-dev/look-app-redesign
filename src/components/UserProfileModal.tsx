import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";

interface Props {
  handle: string;
  onClose: () => void;
}

const MOCK_BIO: Record<string, { name: string; bio: string; followers: string; following: string; posts: string; avatar?: string }> = {};

const UserProfileModal = ({ handle, onClose }: Props) => {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const data = MOCK_BIO[handle] || {
    name: handle,
    bio: "Привет! Делюсь моментами из жизни ✨",
    followers: "12.4K",
    following: "342",
    posts: "87",
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-white overflow-y-auto">
      <div className="md:max-w-2xl md:mx-auto">
        <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <button onClick={onClose} className="p-1">
            <Icon name="ArrowLeft" size={22} className="text-black" />
          </button>
          <span className="flex-1 text-center text-black font-bold text-base pr-7">@{handle}</span>
        </div>

        <div className="px-5 pt-5 pb-3 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0">
            <UserAvatar src={data.avatar} name={data.name} alt={data.name} />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-black font-bold text-base">{data.posts}</p>
              <p className="text-gray-500 text-xs">постов</p>
            </div>
            <div>
              <p className="text-black font-bold text-base">{data.followers}</p>
              <p className="text-gray-500 text-xs">подписчиков</p>
            </div>
            <div>
              <p className="text-black font-bold text-base">{data.following}</p>
              <p className="text-gray-500 text-xs">подписок</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-3">
          <p className="text-black font-semibold text-sm">{data.name}</p>
          <p className="text-gray-700 text-sm leading-snug mt-0.5 whitespace-pre-line">{data.bio}</p>
        </div>

        <div className="px-5 pb-4 flex gap-2">
          <button
            onClick={() => setFollowing(v => !v)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${following ? "bg-gray-100 text-black" : "bg-[#fe2c55] text-white"}`}
          >
            {following ? "Вы подписаны" : "Подписаться"}
          </button>
          <button className="flex-1 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-black">
            Сообщение
          </button>
          <button className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Icon name="UserPlus" size={18} className="text-black" />
          </button>
        </div>

        <div className="border-t border-gray-100">
          <div className="flex items-center justify-center py-3 border-b-2 border-black">
            <Icon name="Grid3x3" size={20} className="text-black" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-gray-200">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-100 flex items-center justify-center">
              <Icon name="Image" size={28} className="text-gray-300" />
            </div>
          ))}
        </div>
        <div className="pb-20" />
      </div>
    </div>,
    document.body
  );
};

export default UserProfileModal;
