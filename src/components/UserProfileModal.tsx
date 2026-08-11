import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { getAuthor } from "@/data/authors";
import { useFollowing, useFollowerCount } from "@/hooks/useFollowing";
import { useShopProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import ProductMasonryCard from "@/components/products/ProductMasonryCard";

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
  const { following, toggle: toggleFollow, isSelf } = useFollowing(handle);
  const realFollowers = useFollowerCount(handle);
  const [tab, setTab] = useState<"media" | "shop" | "files" | "links">("media");
  const [openedItem, setOpenedItem] = useState<number | null>(null);
  const [gender, setGender] = useState<string | null>(null);
  const [realUser, setRealUser] = useState<{ id: string; name: string; handle: string; avatar: string | null } | null>(null);
  const { products: shopProducts, loading: shopLoading } = useShopProducts(realUser?.id);
  const { addToCart } = useCart();
  const [addingId, setAddingId] = useState<number | null>(null);
  const handleAddToCart = async (id: number) => {
    setAddingId(id);
    await addToCart(id);
    setAddingId(null);
  };
  const [userMedia, setUserMedia] = useState<{ id: number; image: string; isVideo: boolean }[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [notifMenu, setNotifMenu] = useState(false);
  const [moreMenu, setMoreMenu] = useState(false);
  const [notifMode, setNotifMode] = useState<"on" | "off" | "muted">(() => {
    try { return (localStorage.getItem(`notif:${handle}`) as "on" | "off" | "muted") || "on"; } catch { return "on"; }
  });
  const [muted, setMuted] = useState<boolean>(() => {
    try { return localStorage.getItem(`muted:${handle}`) === "1"; } catch { return false; }
  });
  const [blocked, setBlocked] = useState<boolean>(() => {
    try { return localStorage.getItem(`blocked:${handle}`) === "1"; } catch { return false; }
  });

  const setNotif = (mode: "on" | "off" | "muted") => {
    setNotifMode(mode);
    try { localStorage.setItem(`notif:${handle}`, mode); } catch { /* ignore */ }
    setNotifMenu(false);
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try { localStorage.setItem(`muted:${handle}`, next ? "1" : "0"); } catch { /* ignore */ }
    setMoreMenu(false);
  };
  const toggleBlock = () => {
    const next = !blocked;
    setBlocked(next);
    try { localStorage.setItem(`blocked:${handle}`, next ? "1" : "0"); } catch { /* ignore */ }
    setMoreMenu(false);
  };
  const sharePofile = async () => {
    const url = `${window.location.origin}/?user=${handle}`;
    try {
      if (navigator.share) await navigator.share({ title: `@${handle}`, url });
      else { await navigator.clipboard.writeText(url); }
    } catch { /* ignore */ }
    setMoreMenu(false);
  };
  const copyHandle = async () => {
    try { await navigator.clipboard.writeText(`@${handle}`); } catch { /* ignore */ }
    setMoreMenu(false);
  };
  const reportUser = () => {
    setMoreMenu(false);
    window.dispatchEvent(new CustomEvent("report-user", { detail: { handle } }));
  };

  useEffect(() => {
    let cancelled = false;
    setMediaLoading(true);
    fetch(PROFILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_public_profile", handle }),
    })
      .then((r) => r.json())
      .then(async (raw) => {
        const json = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (cancelled) return;
        const u = json?.user;
        setGender(u?.gender || null);
        if (u && u.id) {
          setRealUser({ id: u.id, name: u.name, handle: u.handle, avatar: u.avatar });
          try {
            const res = await fetch(`${PROFILE_URL}?user_id=${u.id}`);
            const raw2 = await res.json();
            const d = typeof raw2.body === "string" ? JSON.parse(raw2.body) : raw2;
            if (!cancelled && Array.isArray(d.videos)) {
              const media = d.videos.map((v: { id: number; url: string; type: string }) => ({
                id: v.id,
                image: v.url,
                isVideo: v.type === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(v.url || ""),
              }));
              setUserMedia(media);
            }
          } catch { /* ignore */ }
        }
      })
      .catch(() => { if (!cancelled) setGender(null); })
      .finally(() => { if (!cancelled) setMediaLoading(false); });
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

  // Объединяем медиа из БД пользователя с галереей по умолчанию (из authors.ts)
  const gallery = userMedia.length > 0
    ? userMedia.map((m) => ({ image: m.image, isVideo: m.isVideo, views: undefined as string | undefined }))
    : data.gallery;

  const displayName = realUser?.name || data.name;
  const displayAvatar = realUser?.avatar || data.avatar;
  const displayHandle = realUser?.handle || data.handle;
  const postsCount = userMedia.length > 0 ? String(userMedia.length) : data.posts;

  const opened = openedItem !== null ? gallery[openedItem] : null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pt-12 md:pt-4 pb-2 bg-white border-b border-gray-100 z-10">
        <button onClick={onClose} className="p-2 -ml-1">
          <Icon name="ArrowLeft" size={24} className="text-[#2AABEE]" />
        </button>
        <span className="text-black font-semibold text-base">Профиль</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="md:max-w-2xl md:mx-auto">
          {/* Large avatar header — Telegram style */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6 bg-white">
            <button
              onClick={() => gallery[0] && setOpenedItem(0)}
              className="w-28 h-28 rounded-full overflow-hidden active:opacity-80"
            >
              <UserAvatar src={displayAvatar} name={displayName} alt={displayName} />
            </button>
            <div className="mt-4 text-center flex items-center gap-1.5">
              <h1 className="text-black font-bold text-2xl leading-tight">{displayName}</h1>
              {data.verified && <Icon name="BadgeCheck" size={20} className="text-[#2AABEE]" />}
            </div>
            <p className="text-gray-500 text-sm mt-1">был(а) недавно</p>
          </div>

          {/* Action buttons — Telegram style round */}
          <div className="flex justify-center gap-3 px-6 pb-6 bg-white">
            {!isSelf && (
              <button
                onClick={toggleFollow}
                className="flex flex-col items-center gap-1.5 active:opacity-70"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${following ? "bg-gray-100" : "bg-[#2AABEE]"}`}>
                  <Icon name={following ? "Check" : "UserPlus"} size={20} className={following ? "text-[#2AABEE]" : "text-white"} />
                </div>
                <span className="text-[#2AABEE] text-xs font-medium">{following ? "Вы подписаны" : "Подписаться"}</span>
              </button>
            )}
            <button
              onClick={openMessage}
              className="flex flex-col items-center gap-1.5 active:opacity-70"
            >
              <div className="w-12 h-12 rounded-full bg-[#2AABEE] flex items-center justify-center">
                <Icon name="MessageCircle" size={20} className="text-white" />
              </div>
              <span className="text-[#2AABEE] text-xs font-medium">Сообщение</span>
            </button>
            <button onClick={() => setNotifMenu(true)} className="flex flex-col items-center gap-1.5 active:opacity-70">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${notifMode === "off" ? "bg-gray-100" : "bg-[#2AABEE]"}`}>
                <Icon
                  name={notifMode === "off" ? "BellOff" : notifMode === "muted" ? "BellMinus" : "Bell"}
                  size={20}
                  className={notifMode === "off" ? "text-[#2AABEE]" : "text-white"}
                />
              </div>
              <span className="text-[#2AABEE] text-xs font-medium">Уведомл.</span>
            </button>
            <button onClick={() => setMoreMenu(true)} className="flex flex-col items-center gap-1.5 active:opacity-70">
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
                  <p className="text-[#2AABEE] text-base">@{displayHandle}</p>
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
                <p className="text-black font-bold text-lg">{postsCount}</p>
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
            {shopProducts.length > 0 && (
              <button
                onClick={() => setTab("shop")}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-all flex items-center justify-center gap-1 ${
                  tab === "shop" ? "border-[#2AABEE] text-[#2AABEE]" : "border-transparent text-gray-500"
                }`}
              >
                <Icon name="Store" size={14} />
                Магазин
              </button>
            )}
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

          {tab === "shop" ? (
            shopLoading && shopProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
                <div className="w-8 h-8 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : shopProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
                <Icon name="Store" size={48} className="text-gray-300" />
                <p className="text-gray-400 text-sm">В магазине пока нет товаров</p>
              </div>
            ) : (
              <div className="columns-2 gap-3 p-3 bg-white">
                {shopProducts.map((p) => (
                  <ProductMasonryCard key={p.id} p={p} onAdd={handleAddToCart} adding={addingId === p.id} hideOwner />
                ))}
              </div>
            )
          ) : tab === "media" ? (
            mediaLoading && gallery.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white">
                <div className="w-8 h-8 border-2 border-[#2AABEE] border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Загружаем…</p>
              </div>
            ) : gallery.length > 0 ? (
              <div className="grid grid-cols-3 gap-px bg-gray-100">
                {gallery.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setOpenedItem(i)}
                    className="relative aspect-square overflow-hidden bg-gray-200 active:opacity-80"
                  >
                    {item.isVideo ? (
                      <video src={`${item.image}#t=0.1`} className="w-full h-full object-cover rounded-md" muted playsInline preload="metadata" />
                    ) : (
                      <img src={item.image} alt="" className="w-full h-full object-cover rounded-md" loading="lazy" />
                    )}
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
            <span className="text-white font-semibold text-sm">@{displayHandle}</span>
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

      {/* Меню «Уведомл.» */}
      {notifMenu && (
        <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/40" onClick={() => setNotifMenu(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            <div className="px-4 py-2 text-center text-gray-500 text-xs">Уведомления от @{displayHandle}</div>
            <button onClick={() => setNotif("on")} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name="Bell" size={20} className="text-[#2AABEE]" />
              <span className="flex-1 text-left text-black text-base">Включены</span>
              {notifMode === "on" && <Icon name="Check" size={20} className="text-[#2AABEE]" />}
            </button>
            <button onClick={() => setNotif("muted")} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name="BellMinus" size={20} className="text-[#2AABEE]" />
              <span className="flex-1 text-left text-black text-base">Без звука</span>
              {notifMode === "muted" && <Icon name="Check" size={20} className="text-[#2AABEE]" />}
            </button>
            <button onClick={() => setNotif("off")} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name="BellOff" size={20} className="text-[#2AABEE]" />
              <span className="flex-1 text-left text-black text-base">Отключены</span>
              {notifMode === "off" && <Icon name="Check" size={20} className="text-[#2AABEE]" />}
            </button>
            <button onClick={() => setNotifMenu(false)} className="w-full mt-2 mx-4 py-3 rounded-xl bg-gray-100 text-black font-semibold text-sm" style={{ width: "calc(100% - 32px)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Меню «Ещё» */}
      {moreMenu && (
        <div className="fixed inset-0 z-[10002] flex items-end justify-center bg-black/40" onClick={() => setMoreMenu(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md pb-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-2" />
            <div className="px-4 py-2 text-center text-gray-500 text-xs">@{displayHandle}</div>
            <button onClick={copyHandle} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name="Copy" size={20} className="text-[#2AABEE]" />
              <span className="flex-1 text-left text-black text-base">Копировать ник</span>
            </button>
            <button onClick={sharePofile} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name="Share2" size={20} className="text-[#2AABEE]" />
              <span className="flex-1 text-left text-black text-base">Поделиться профилем</span>
            </button>
            <button onClick={toggleMute} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name={muted ? "Volume2" : "VolumeX"} size={20} className="text-[#2AABEE]" />
              <span className="flex-1 text-left text-black text-base">{muted ? "Включить звук" : "Отключить звук"}</span>
            </button>
            <button onClick={reportUser} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name="Flag" size={20} className="text-orange-500" />
              <span className="flex-1 text-left text-orange-500 text-base">Пожаловаться</span>
            </button>
            <button onClick={toggleBlock} className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-gray-50">
              <Icon name={blocked ? "UserCheck" : "Ban"} size={20} className="text-red-500" />
              <span className="flex-1 text-left text-red-500 text-base">{blocked ? "Разблокировать" : "Заблокировать"}</span>
            </button>
            <button onClick={() => setMoreMenu(false)} className="mt-2 mx-4 py-3 rounded-xl bg-gray-100 text-black font-semibold text-sm" style={{ width: "calc(100% - 32px)" }}>
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default UserProfileModal;