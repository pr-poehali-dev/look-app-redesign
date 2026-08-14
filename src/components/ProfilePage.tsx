import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import SettingsScreen from "./SettingsScreen";
import AnalyticsScreen from "./profile/AnalyticsScreen";
import CartScreen from "./profile/CartScreen";
import ShopScreen from "./profile/ShopScreen";
import CatalogScreen from "./profile/CatalogScreen";
import BoardsScreen from "./profile/BoardsScreen";
import ReferralsScreen from "./profile/ReferralsScreen";
import StoryViewerModal, { StoryViewerItem } from "./shared/StoryViewerModal";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useFollowingList, useFollowerCount, useFollowing } from "@/hooks/useFollowing";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { getAuthor } from "@/data/authors";

const AVATAR = "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/014c6ddd-1707-4449-afdd-e9012de11b20.jpg";

interface UserItem { name: string; handle: string; avatar: string }

const UserListRow = ({ u, showUnfollow }: { u: UserItem; showUnfollow: boolean }) => {
  const { following, unfollow } = useFollowing(u.handle);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0">
        <UserAvatar src={u.avatar} name={u.name} alt={u.name} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-black font-semibold text-sm">{u.name}</p>
        <p className="text-gray-400 text-xs">@{u.handle}</p>
      </div>
      {showUnfollow && following && (
        <button
          onClick={unfollow}
          className="flex-shrink-0 px-3 py-1.5 rounded-full border border-gray-300 text-black text-xs font-semibold active:scale-95 transition-transform"
        >
          Отписаться
        </button>
      )}
    </div>
  );
};

const UserListScreen = ({ title, users, onBack, emptyText, showUnfollow }: { title: string; users: UserItem[]; onBack: () => void; emptyText: string; showUnfollow?: boolean }) => {
  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 bg-white border-b border-gray-100">
        <button onClick={onBack} className="p-1"><Icon name="ArrowLeft" size={22} className="text-black" /></button>
        <span className="flex-1 text-center text-black font-bold text-lg pr-7">{title}</span>
      </div>
      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Icon name="Users" size={28} className="text-gray-400" />
          </div>
          <p className="text-gray-500 text-sm">{emptyText}</p>
        </div>
      ) : (
        <div>
          {users.map((u) => (
            <UserListRow key={u.handle} u={u} showUnfollow={!!showUnfollow} />
          ))}
        </div>
      )}
    </div>
  );
};

const POSTS_GRID = [
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg", views: 50 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg", views: 91 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg", views: 77 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg", views: 104 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg", views: 116 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg", views: 97 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0a51a008-0fe3-4620-8186-4626075d14eb.jpg", views: 203 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg", views: 88 },
  { img: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg", views: 145 },
];

interface Story {
  id: number;
  url: string;
  type: "image" | "video";
  label: string;
}

const MediaViewer = ({ items, startIndex, onClose, onDelete }: { items: Story[]; startIndex: number; onClose: () => void; onDelete: (id: number) => void }) => {
  const [index, setIndex] = useState(startIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (items.length === 0) { onClose(); return; }
    if (index >= items.length) setIndex(Math.max(0, items.length - 1));
  }, [items, index, onClose]);

  const item = items[Math.min(index, items.length - 1)];
  const goNext = () => index < items.length - 1 ? setIndex(i => i + 1) : onClose();
  const goPrev = () => index > 0 ? setIndex(i => i - 1) : null;

  const handleDelete = () => {
    if (!item) return;
    onDelete(item.id);
    setConfirmDelete(false);
    setDeleted(true);
    setTimeout(() => setDeleted(false), 1200);
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 bg-gradient-to-b from-black/60 to-transparent z-20">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer" style={{ touchAction: "manipulation" }} title="Назад"><Icon name="ArrowLeft" size={24} className="text-white" /></button>
        <span className="text-white text-sm font-medium">{index + 1} / {items.length}</span>
        <span className="w-10" />
      </div>

      {/* Delete button — внизу, явная кнопка */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 px-4 pt-4 pb-10 bg-gradient-to-t from-black/70 to-transparent text-red-400 font-semibold text-sm hover:text-red-300 transition-colors cursor-pointer"
        style={{ touchAction: "manipulation" }}
      >
        <Icon name="Trash2" size={20} />
        Удалить
      </button>

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-end justify-center pb-16" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-2xl mx-4 w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 text-center">
              <p className="font-bold text-black text-base">Удалить?</p>
              <p className="text-gray-500 text-sm mt-1">Это действие нельзя отменить</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setConfirmDelete(false); }}
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3.5 text-gray-500 font-medium text-sm border-r border-gray-100"
                style={{ touchAction: "manipulation" }}
              >Отмена</button>
              <button
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); handleDelete(); }}
                onClick={handleDelete}
                className="flex-1 py-3.5 text-red-500 font-semibold text-sm"
                style={{ touchAction: "manipulation" }}
              >Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {deleted && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-white/90 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center gap-2 shadow-lg">
          <Icon name="Trash2" size={16} className="text-red-500" />
          <span className="text-black text-sm font-medium">Удалено</span>
        </div>
      )}

      {/* Media */}
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {item.type === "video" ? (
          <video
            key={item.id}
            src={item.url}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            autoPlay
            controls
            playsInline
          />
        ) : (
          <img key={item.id} src={item.url} className="max-w-full max-h-full w-auto h-auto object-contain" alt="" />
        )}
      </div>

      {/* Tap zones */}
      <div className="absolute inset-0 flex z-10 pointer-events-none">
        <div className="flex-1 pointer-events-auto" onClick={goPrev} />
        <div className="w-16" />
        <div className="flex-1 pointer-events-auto" onClick={goNext} />
      </div>

      {/* Arrows */}
      {index > 0 && (
        <button onClick={goPrev} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2">
          <Icon name="ChevronLeft" size={24} className="text-white" />
        </button>
      )}
      {index < items.length - 1 && (
        <button onClick={goNext} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 rounded-full p-2">
          <Icon name="ChevronRight" size={24} className="text-white" />
        </button>
      )}
    </div>
  );
};

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const VIDEO_CATEGORIES = [
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
  { id: "nature", label: "Природа" },
  { id: "animals", label: "Животные" },
  { id: "beauty", label: "Красота" },
  { id: "diy", label: "Сделай сам" },
  { id: "science", label: "Наука" },
  { id: "auto", label: "Авто" },
];
const categoryLabel = (id?: string) => VIDEO_CATEGORIES.find(c => c.id === id)?.label || "Без категории";

const ProfilePage = () => {
  const [tab, setTab] = useState<"videos" | "posts" | "reposts">("videos");
  const [showSettings, setShowSettings] = useState(false);
  const [showScreen, setShowScreen] = useState<"followers" | "following" | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showBoards, setShowBoards] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const { userVideos: stories, removeMedia, addMedia, refreshMedia } = useUserMedia();
  const { user, token, logout, updateUser } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const followingHandles = useFollowingList();
  const followersCount = useFollowerCount(user?.handle || "");
  const [followersList, setFollowersList] = useState<UserItem[]>([]);
  const videoIds = useMemo(() => stories.filter(s => s.type === "video").map(s => s.id), [stories]);
  const { likes: bulkLikes } = useBulkCounts("video", videoIds);
  const totalLikes = useMemo(
    () => videoIds.reduce((sum, id) => sum + (bulkLikes[String(id)] || 0), 0),
    [videoIds, bulkLikes]
  );
  const followingUsers: UserItem[] = useMemo(
    () => followingHandles.map(h => {
      const a = getAuthor(h);
      return { handle: h, name: a.name || h, avatar: a.avatar || "" };
    }),
    [followingHandles]
  );

  const loadFollowers = useCallback(() => {
    if (!user?.handle) { setFollowersList([]); return; }
    fetch(`https://functions.poehali.dev/791bdb8d-0cb7-40b2-8a0c-e4a84b213fbc?action=list_followers&handle=${encodeURIComponent(user.handle)}`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const items: UserItem[] = (data.followers || []).map((id: string) => {
          const a = getAuthor(id);
          return { handle: id, name: a.name || id, avatar: a.avatar || "" };
        });
        setFollowersList(items);
      })
      .catch(() => setFollowersList([]));
  }, [user?.handle]);
  const [viewingStory, setViewingStory] = useState<number | null>(null);
  const [storyOrigin, setStoryOrigin] = useState<DOMRect | null>(null);
  const [mediaViewer, setMediaViewer] = useState<{ tab: "video" | "image"; index: number } | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (mediaViewer === null) return;
    const liveItems = stories.filter(s => s.type === mediaViewer.tab);
    if (liveItems.length === 0) setMediaViewer(null);
  }, [stories, mediaViewer]);

  // Кнопка «Купить» из ленты/видео открывает профиль сразу на экране корзины
  useEffect(() => {
    const onOpenCart = () => setShowCart(true);
    window.addEventListener("open-cart", onOpenCart);
    return () => window.removeEventListener("open-cart", onOpenCart);
  }, []);
  const [deleteStoryId, setDeleteStoryId] = useState<number | null>(null);
  const [categoryEditId, setCategoryEditId] = useState<number | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeCategory = async (id: number, category: string) => {
    setSavingCategory(true);
    try {
      await fetch(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_category", id, category, token, user_id: user?.id }),
      });
      await refreshMedia();
    } catch { /* ignore */ }
    setSavingCategory(false);
    setCategoryEditId(null);
  };
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const storyInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setAvatarLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const ext = file.name.split(".").pop() || "jpg";
      try {
        const res = await fetch(AUTH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_avatar", token, file: base64, file_type: file.type, ext }),
        });
        const raw = await res.json();
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.avatar) updateUser({ avatar: data.avatar });
      } catch { /* ignore */ }
      setAvatarLoading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (showSettings) return <SettingsScreen onBack={() => setShowSettings(false)} />;
  if (showScreen === "followers") return <UserListScreen title="Подписчики" users={followersList} onBack={() => setShowScreen(null)} emptyText="Пока нет подписчиков" />;
  if (showScreen === "following") return <UserListScreen title="Подписки" users={followingUsers} onBack={() => setShowScreen(null)} emptyText="Ты пока ни на кого не подписан" showUnfollow />;
  if (showAnalytics) return <AnalyticsScreen onBack={() => setShowAnalytics(false)} />;
  if (showCart) return <CartScreen onBack={() => setShowCart(false)} />;
  if (showShop) return <ShopScreen onBack={() => setShowShop(false)} />;
  if (showCatalog) return <CatalogScreen onBack={() => setShowCatalog(false)} />;
  if (showBoards) return <BoardsScreen onBack={() => setShowBoards(false)} />;
  if (showReferrals) return <ReferralsScreen onBack={() => setShowReferrals(false)} />;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {viewingStory !== null && (
        <StoryViewerModal
          items={stories.map((s): StoryViewerItem => ({ id: s.id, image: s.url, isVideo: s.type === "video", label: s.label, avatar: user?.avatar || undefined }))}
          startIndex={viewingStory}
          originRect={storyOrigin}
          onClose={() => { setViewingStory(null); setStoryOrigin(null); }}
        />
      )}
      {mediaViewer !== null && (() => {
        const liveItems = stories.filter(s => s.type === mediaViewer.tab);
        if (liveItems.length === 0) return null;
        const safeIndex = Math.min(Math.max(mediaViewer.index, 0), liveItems.length - 1);
        return (
          <MediaViewer
            items={liveItems}
            startIndex={safeIndex}
            onClose={() => setMediaViewer(null)}
            onDelete={(id) => {
              removeMedia(id);
              if (liveItems.length <= 1) setMediaViewer(null);
            }}
          />
        );
      })()}

      <div className="md:max-w-2xl md:mx-auto">
      {/* Avatar + stats */}
      <div className="flex items-center gap-4 px-4 pt-14 pb-4 md:px-3 md:pt-10 md:pb-3">
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        <button
          onClick={() => avatarInputRef.current?.click()}
          className="relative w-20 h-20 md:w-16 md:h-16 rounded-full flex-shrink-0 bg-gradient-to-br from-[#c084fc] to-[#8b5cf6] flex items-center justify-center overflow-hidden"
        >
          {user?.avatar
            ? <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
            : <span className="text-white font-black text-3xl md:text-2xl">{user?.name?.[0]?.toUpperCase() ?? "?"}</span>
          }
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            {avatarLoading
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Icon name="Camera" size={20} className="text-white" />
            }
          </div>
        </button>

        <div className="flex flex-1 justify-around">
          {[
            { value: String(totalLikes), label: "Лайки", action: null },
            { value: String(followersCount), label: "Подписчики", action: "followers" },
            { value: String(followingHandles.length), label: "Подписки", action: "following" },
          ].map((s, i) => (
            <div key={s.label} className="flex items-center">
              {i > 0 && <div className="w-px h-8 md:h-6 bg-gray-200 mr-4 md:mr-3" />}
              <button
                onClick={() => {
                  if (!s.action) return;
                  if (s.action === "followers") loadFollowers();
                  setShowScreen(s.action as "followers" | "following");
                }}
                className="flex flex-col items-center"
              >
                <span className="text-black font-bold text-xl md:text-base leading-tight">{s.value}</span>
                <span className="text-gray-500 text-xs md:text-[11px] mt-0.5">{s.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Name & bio */}
      <div className="px-4 pb-4 md:px-3 md:pb-3">
        <p className="text-black font-bold text-lg md:text-base leading-tight flex items-center gap-1">
          {user?.name ?? ""}
          {user?.is_verified && <Icon name="BadgeCheck" size={16} className="text-[#2AABEE]" />}
        </p>
        <p className="text-gray-500 text-sm md:text-xs mt-0.5">@{user?.handle ?? ""}</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4 md:px-3 md:pb-3">
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-sm md:text-xs"
        >
          Настройки
        </button>
        <button
          type="button"
          onClick={() => {
            setShowSettings(true);
            // Дожидаемся монтирования SettingsScreen, иначе событие будет потеряно
            const fire = () => window.dispatchEvent(new CustomEvent("open-settings-screen", { detail: { screen: "scan_qr" } }));
            setTimeout(fire, 0);
            setTimeout(fire, 60);
            setTimeout(fire, 200);
          }}
          title="Сканировать QR"
          aria-label="Сканировать QR"
          className="w-12 md:w-10 py-2.5 md:py-2 rounded-xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Icon name="ScanLine" size={18} className="text-white pointer-events-none" />
        </button>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          className="w-12 md:w-10 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} className="text-gray-600" />
        </button>
        <button
          onClick={() => { if (confirm("Выйти из аккаунта?")) logout(); }}
          title="Выйти"
          className="w-12 md:w-10 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-red-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          <Icon name="LogOut" size={18} className="text-red-500" />
        </button>
      </div>

      {/* Аналитика + Магазин + Каталог + Корзина + Доски + Партнёрка */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5 px-4 pb-4 md:px-3 md:pb-3">
        <button
          onClick={() => setShowAnalytics(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="BarChart3" size={15} />
          Аналитика
        </button>
        <button
          onClick={() => setShowShop(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="Store" size={15} />
          Магазин
        </button>
        <button
          onClick={() => setShowCatalog(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="LayoutGrid" size={15} />
          Каталог
        </button>
        <button
          onClick={() => setShowCart(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="ShoppingCart" size={15} />
          Корзина
        </button>
        <button
          onClick={() => setShowBoards(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="Layers" size={15} />
          Доски
        </button>
        <button
          onClick={() => setShowReferrals(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="Link" size={15} />
          Партнёрка
        </button>
      </div>

      {/* Stories */}
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
                        ? <img src={s.thumbnail || s.thumb} className="w-full h-full object-cover" alt="" />
                        : <video src={s.url} className="w-full h-full object-cover" muted playsInline preload="metadata" poster={s.thumbnail || s.thumb} />)
                    : <img src={s.url} className="w-full h-full object-cover" alt="" />
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

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setTab("videos")}
          className={`flex-1 flex items-center justify-center py-3 md:py-2 border-b-2 transition-all ${
            tab === "videos" ? "border-[#8b5cf6]" : "border-transparent"
          }`}
        >
          <div className={`w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center ${tab === "videos" ? "bg-[#8b5cf6]" : "bg-gray-200"}`}>
            <Icon name="Play" size={16} className={tab === "videos" ? "text-white" : "text-gray-400"} />
          </div>
        </button>
        <button
          onClick={() => setTab("posts")}
          className={`flex-1 flex items-center justify-center py-3 md:py-2 border-b-2 transition-all ${
            tab === "posts" ? "border-[#8b5cf6]" : "border-transparent"
          }`}
        >
          <div className={`w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center ${tab === "posts" ? "bg-[#8b5cf6]" : "bg-gray-200"}`}>
            <Icon name="LayoutGrid" size={16} className={tab === "posts" ? "text-white" : "text-gray-400"} />
          </div>
        </button>
        <button
          onClick={() => setTab("reposts")}
          className={`flex-1 flex items-center justify-center py-3 md:py-2 border-b-2 transition-all ${
            tab === "reposts" ? "border-[#8b5cf6]" : "border-transparent"
          }`}
        >
          <div className={`w-8 h-8 md:w-7 md:h-7 rounded-lg flex items-center justify-center ${tab === "reposts" ? "bg-[#8b5cf6]" : "bg-gray-200"}`}>
            <Icon name="Repeat2" size={16} className={tab === "reposts" ? "text-white" : "text-gray-400"} />
          </div>
        </button>
      </div>

      {tab === "videos" ? (
        (() => {
          const videos = stories.filter(s => s.type === "video" && !s.is_repost);
          return videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Video" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет загруженных видео</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1 bg-gray-200 p-1">
              {videos.map((item, i) => (
                <div key={item.id} className="relative aspect-square overflow-hidden cursor-pointer" style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #1a1a1a 100%)" }} onClick={() => setMediaViewer({ tab: "video", index: i })}>
                  {(item.thumb || item.thumbnail) ? (
                    <img src={item.thumb || item.thumbnail} alt="" className="w-full h-full object-cover rounded-md" />
                  ) : (item.url ? (
                    <video
                      src={`${item.url}#t=0.1`}
                      className="w-full h-full object-cover rounded-md pointer-events-none"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : null)}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-2.5 md:p-2">
                      <Icon name="Play" size={18} className="text-white ml-0.5" />
                    </div>
                  </div>
                  {item.is_repost && (
                    <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#fe2c55]">
                      <Icon name="Repeat2" size={10} className="text-white" />
                      <span className="text-white text-[8px] font-semibold">Репост</span>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setCategoryEditId(item.id); }}
                    className="absolute bottom-1 left-1 right-1 flex items-center gap-1 px-2 py-1 rounded-md bg-black/55 backdrop-blur"
                  >
                    <Icon name="Tag" size={11} className="text-white/80 flex-shrink-0" />
                    <span className="text-white text-[10px] font-medium truncate">{categoryLabel(item.category)}</span>
                  </button>
                </div>
              ))}
            </div>
          );
        })()
      ) : tab === "posts" ? (
        (() => {
          const photos = stories.filter(s => s.type === "image" && !s.is_repost);
          return photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Image" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет загруженных фото</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1 bg-gray-200 p-1">
              {photos.map((item, i) => (
                <div key={item.id} className="relative aspect-square overflow-hidden bg-gray-200 cursor-pointer" onClick={() => setMediaViewer({ tab: "image", index: i })}>
                  <img src={item.url} alt="" className="w-full h-full object-cover rounded-md" />
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        (() => {
          const reposts = stories.filter(s => s.is_repost);
          return reposts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <Icon name="Repeat2" size={28} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Нет репостов</p>
              <p className="text-xs text-gray-400/70 text-center px-8">Нажми «Репост к себе» под чужим видео — оно появится здесь</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-1 bg-gray-200 p-1">
              {reposts.map((item) => (
                <div
                  key={item.id}
                  className="relative aspect-square overflow-hidden cursor-pointer"
                  style={{ background: "linear-gradient(135deg, #0a2e1a 0%, #1a1a1a 100%)" }}
                >
                  {(item.thumb || item.thumbnail) ? (
                    <img src={item.thumb || item.thumbnail} alt="" className="w-full h-full object-cover rounded-md" />
                  ) : item.type === "image" ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover rounded-md" />
                  ) : item.url ? (
                    <video src={`${item.url}#t=0.1`} className="w-full h-full object-cover rounded-md pointer-events-none" muted playsInline preload="metadata" />
                  ) : null}
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/50 rounded-full p-2.5 md:p-2">
                        <Icon name="Play" size={18} className="text-white ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-1 right-1 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#fe2c55]">
                    <Icon name="Repeat2" size={10} className="text-white" />
                    <span className="text-white text-[8px] font-semibold">Репост</span>
                  </div>
                  {item.handle && (
                    <div className="absolute bottom-1 left-1 right-1 px-2 py-1 rounded-md bg-black/55 backdrop-blur">
                      <span className="text-white text-[10px] font-medium truncate block">@{item.handle}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })()
      )}

      <div className="pb-28" />
      </div>
    </div>
  );
};

export default ProfilePage;