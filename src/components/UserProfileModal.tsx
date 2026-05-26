import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { getAuthor } from "@/data/authors";
import { useFollowing, useFollowerCount } from "@/hooks/useFollowing";

interface Props {
  handle: string;
  onClose: () => void;
}

const PROFILE_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const GENDER_LABELS: Record<string, string> = {
  male: "Мужской",
  female: "Женский",
  other: "Другой",
  м: "Мужской",
  ж: "Женский",
};

const UserProfileModal = ({ handle, onClose }: Props) => {
  const data = getAuthor(handle);
  const { following, toggle: toggleFollow } = useFollowing(handle);
  const realFollowers = useFollowerCount(handle);
  const [tab, setTab] = useState<"media" | "files" | "links">("media");
  const [openedItem, setOpenedItem] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_public_profile", handle }),
    })
      .then((r) => r.json())
      .then((raw) => {
        const json = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (!cancelled) setGender(json?.user?.gender || null);
      })
      .catch(() => { if (!cancelled) setGender(null); });
    return () => { cancelled = true; };
  }, [handle]);

  const genderLabel = gender ? (GENDER_LABELS[gender.toLowerCase()] || gender) : "Не указан";

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

  const openMessage = () => {
    onClose();
    window.dispatchEvent(new CustomEvent("open-direct-message", { detail: { handle } }));
  };

  const opened = openedItem !== null ? data.gallery[openedItem] : null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-12 md:pt-4 pb-2 bg-white border-b border-gray-100 z-10">
        <button onClick={onClose} className="p-2 -ml-1">
          <Icon name="ArrowLeft" size={24} className="text-[#2AABEE]" />
        </button>
        <span className="text-black font-semibold text-base">Профиль</span>
        <button className="p-2 -mr-1">
          <Icon name="MoreVertical" size={22} className="text-[#2AABEE]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="md:max-w-2xl md:mx-auto">
          {/* Large avatar header — Telegram style */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-white">
            <button
              onClick={() => data.gallery[0] && setOpenedItem(0)}
              className="w-28 h-28 rounded-full overflow-hidden active:opacity-80"
            >
              <UserAvatar src={data.avatar} name={data.name} alt={data.name} />
            </button>
            <div className="mt-4 text-center flex items-center gap-1.5">
              <h1 className="text-black font-bold text-2xl leading-tight">{data.name}</h1>
              {data.verified && <Icon name="BadgeCheck" size={20} className="text-[#2AABEE]" />}
            </div>
            <p className="text-gray-500 text-sm mt-1">был(а) недавно</p>
          </div>

          {/* Action buttons — Telegram style round */}
          <div className="flex justify-center gap-3 px-6 pb-6 bg-white">
            <button
              onClick={toggleFollow}
              className="flex flex-col items-center gap-1.5 active:opacity-70"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${following ? "bg-gray-100" : "bg-[#2AABEE]"}`}>
                <Icon name={following ? "Check" : "UserPlus"} size={20} className={following ? "text-[#2AABEE]" : "text-white"} />
              </div>
              <span className="text-[#2AABEE] text-xs font-medium">{following ? "Вы подписаны" : "Подписаться"}</span>
            </button>
            <button
              onClick={openMessage}
              className="flex flex-col items-center gap-1.5 active:opacity-70"
            >
              <div className="w-12 h-12 rounded-full bg-[#2AABEE] flex items-center justify-center">
                <Icon name="MessageCircle" size={20} className="text-white" />
              </div>
              <span className="text-[#2AABEE] text-xs font-medium">Сообщение</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 active:opacity-70">
              <div className="w-12 h-12 rounded-full bg-[#2AABEE] flex items-center justify-center">
                <Icon name="Bell" size={20} className="text-white" />
              </div>
              <span className="text-[#2AABEE] text-xs font-medium">Уведомл.</span>
            </button>
            <button className="flex flex-col items-center gap-1.5 active:opacity-70">
              <div className="w-12 h-12 rounded-full bg-[#2AABEE] flex items-center justify-center">
                <Icon name="MoreHorizontal" size={20} className="text-white" />
              </div>
              <span className="text-[#2AABEE] text-xs font-medium">Ещё</span>
            </button>
          </div>

          {/* Info section — Telegram style rows */}
          <div className="bg-[#f4f4f5] py-2">
            <div className="bg-white">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-black text-base leading-snug">{genderLabel}</p>
                <p className="text-gray-500 text-xs mt-1">пол</p>
              </div>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[#2AABEE] text-base">@{data.handle}</p>
                  <p className="text-gray-500 text-xs mt-0.5">username</p>
                </div>
                <Icon name="QrCode" size={20} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Stats — Telegram style */}
          <div className="bg-[#f4f4f5] pb-2">
            <div className="bg-white grid grid-cols-3 divide-x divide-gray-100">
              <button className="py-3 active:bg-gray-50">
                <p className="text-black font-bold text-lg">{data.posts}</p>
                <p className="text-gray-500 text-xs">постов</p>
              </button>
              <button className="py-3 active:bg-gray-50">
                <p className="text-black font-bold text-lg">{realFollowers > 0 ? realFollowers : data.followers}</p>
                <p className="text-gray-500 text-xs">подписчиков</p>
              </button>
              <button className="py-3 active:bg-gray-50">
                <p className="text-black font-bold text-lg">{data.following}</p>
                <p className="text-gray-500 text-xs">подписок</p>
              </button>
            </div>
          </div>

          {/* Tabs — Telegram style underlined */}
          <div className="bg-white border-b border-gray-100 flex sticky top-0 z-[1]">
            <button
              onClick={() => setTab("media")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                tab === "media" ? "border-[#2AABEE] text-[#2AABEE]" : "border-transparent text-gray-500"
              }`}
            >
              Медиа
            </button>
            <button
              onClick={() => setTab("files")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                tab === "files" ? "border-[#2AABEE] text-[#2AABEE]" : "border-transparent text-gray-500"
              }`}
            >
              Файлы
            </button>
            <button
              onClick={() => setTab("links")}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all ${
                tab === "links" ? "border-[#2AABEE] text-[#2AABEE]" : "border-transparent text-gray-500"
              }`}
            >
              Ссылки
            </button>
          </div>

          {tab === "media" ? (
            data.gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-px bg-gray-100">
                {data.gallery.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setOpenedItem(i)}
                    className="relative aspect-square overflow-hidden bg-gray-200 active:opacity-80"
                  >
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                    {item.isVideo && (
                      <div className="absolute top-1.5 right-1.5 bg-black/40 rounded-full p-1">
                        <Icon name="Play" size={10} className="text-white" />
                      </div>
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
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
                <Icon name="Image" size={48} className="text-gray-300" />
                <p className="text-gray-400 text-sm">Пока нет медиа</p>
              </div>
            )
          ) : tab === "files" ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
              <Icon name="File" size={48} className="text-gray-300" />
              <p className="text-gray-400 text-sm">Нет файлов</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
              <Icon name="Link" size={48} className="text-gray-300" />
              <p className="text-gray-400 text-sm">Нет ссылок</p>
            </div>
          )}
          <div className="pb-24 bg-white" />
        </div>
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