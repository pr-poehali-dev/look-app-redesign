import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Icon from "@/components/ui/icon";
import SettingsScreen from "./SettingsScreen";
import AnalyticsScreen from "./profile/AnalyticsScreen";
import ShopScreen from "./profile/ShopScreen";
import CatalogScreen from "./profile/CatalogScreen";
import BoardsScreen from "./profile/BoardsScreen";
import ArticlesScreen from "./profile/ArticlesScreen";
import GuideScreen from "./profile/GuideScreen";
import { useUserArticles } from "@/hooks/useArticles";
import ReferralsScreen from "./profile/ReferralsScreen";
import CollabsScreen from "./profile/CollabsScreen";
import StoryViewerModal, { StoryViewerItem } from "./shared/StoryViewerModal";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useFollowingList, useFollowerCount } from "@/hooks/useFollowing";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { getAuthor } from "@/data/authors";
import ProfileUserList, { UserItem } from "./profile/ProfileUserList";
import MediaViewer from "./profile/MediaViewer";
import ProfileStoriesRow from "./profile/ProfileStoriesRow";
import ProfileMediaTabs, { ProfileTab, MediaViewerState } from "./profile/ProfileMediaTabs";

const AUTH_URL = "https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e";

const ProfilePage = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ProfileTab>("videos");
  const [showSettings, setShowSettings] = useState(false);
  const [showScreen, setShowScreen] = useState<"followers" | "following" | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showBoards, setShowBoards] = useState(false);
  const [openBoardId, setOpenBoardId] = useState<number | null>(null);
  const [showArticles, setShowArticles] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const [showCollabs, setShowCollabs] = useState(false);
  const { userVideos: stories, removeMedia, addMedia, refreshMedia } = useUserMedia();
  const { user, token, logout, updateUser } = useAuth();
  const { articles: myArticles, loading: myArticlesLoading } = useUserArticles(showArticles ? null : user?.id);
  const { theme, toggle: toggleTheme } = useTheme();
  const followingHandles = useFollowingList();
  const followersCount = useFollowerCount(user?.handle || "");
  const [followersList, setFollowersList] = useState<UserItem[]>([]);
  const videoIds = useMemo(() => stories.filter(s => s.type === "video").map(s => s.id), [stories]);
  const allIds = useMemo(() => stories.map(s => s.id), [stories]);
  const bulkVideo = useBulkCounts("video", allIds);
  const bulkPost = useBulkCounts("post", allIds);
  const bulkAll = useMemo(() => {
    const sum = (a: Record<string, number>, b: Record<string, number>) => {
      const r: Record<string, number> = { ...a };
      Object.keys(b).forEach(k => { r[k] = (r[k] || 0) + b[k]; });
      return r;
    };
    return {
      likes: sum(bulkVideo.likes, bulkPost.likes),
      comments: sum(bulkVideo.comments, bulkPost.comments),
      saves: sum(bulkVideo.saves, bulkPost.saves),
      downloads: sum(bulkVideo.downloads, bulkPost.downloads),
      views: sum(bulkVideo.views, bulkPost.views),
    };
  }, [bulkVideo, bulkPost]);
  const bulkLikes = bulkAll.likes;
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
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  useEffect(() => {
    if (mediaViewer === null) return;
    const liveItems = stories.filter(s => s.type === mediaViewer.tab && (mediaViewer.onlyReposts ? s.is_repost : !s.is_repost));
    if (liveItems.length === 0) setMediaViewer(null);
  }, [stories, mediaViewer]);

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
  if (showScreen === "followers") return <ProfileUserList title={t("pr.followers")} users={followersList} onBack={() => setShowScreen(null)} emptyText={t("pr.noFollowers")} />;
  if (showScreen === "following") return <ProfileUserList title={t("pr.following")} users={followingUsers} onBack={() => setShowScreen(null)} emptyText={t("pr.noFollowing")} showUnfollow />;
  if (showAnalytics) return <AnalyticsScreen onBack={() => setShowAnalytics(false)} />;
  if (showShop) return <ShopScreen onBack={() => setShowShop(false)} />;
  if (showCatalog) return <CatalogScreen onBack={() => setShowCatalog(false)} />;
  if (showArticles) return <ArticlesScreen onBack={() => setShowArticles(false)} />;
  if (showGuide) return <GuideScreen onBack={() => setShowGuide(false)} />;
  if (showBoards) return <BoardsScreen initialBoardId={openBoardId} onBack={() => { setShowBoards(false); setOpenBoardId(null); }} />;
  if (showReferrals) return <ReferralsScreen onBack={() => setShowReferrals(false)} />;
  if (showCollabs) return <CollabsScreen onBack={() => setShowCollabs(false)} />;

  return (
    <div className="h-full bg-white overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      {viewingStory !== null && (
        <StoryViewerModal
          items={stories.map((s): StoryViewerItem => ({ id: s.id, image: s.url, isVideo: s.type === "video", thumbnail: s.thumbnail || s.thumb || undefined, label: s.label, avatar: user?.avatar || undefined }))}
          startIndex={viewingStory}
          originRect={storyOrigin}
          onClose={() => { setViewingStory(null); setStoryOrigin(null); }}
        />
      )}
      {mediaViewer !== null && (() => {
        const liveItems = stories.filter(s => s.type === mediaViewer.tab && (mediaViewer.onlyReposts ? s.is_repost : !s.is_repost));
        if (liveItems.length === 0) return null;
        const foundIndex = liveItems.findIndex(s => s.id === mediaViewer.id);
        const safeIndex = foundIndex >= 0 ? foundIndex : 0;
        return (
          <MediaViewer
            key={`${mediaViewer.tab}-${mediaViewer.onlyReposts ? "r" : "o"}-${mediaViewer.id}`}
            items={liveItems}
            startIndex={safeIndex}
            isRepostView={!!mediaViewer.onlyReposts}
            counts={bulkAll}
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
            ? <img loading="lazy" decoding="async" src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
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
            { value: String(totalLikes), label: t("pr.likes"), action: null },
            { value: String(followersCount), label: t("pr.followers"), action: "followers" },
            { value: String(followingHandles.length), label: t("pr.following"), action: "following" },
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
          {t("pr.settings")}
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
          title={t("pr.scanQr")}
          aria-label={t("pr.scanQr")}
          className="w-12 md:w-10 py-2.5 md:py-2 rounded-xl bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Icon name="ScanLine" size={18} className="text-white pointer-events-none" />
        </button>
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? t("pr.lightTheme") : t("pr.darkTheme")}
          className="w-12 md:w-10 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          <Icon name={theme === "dark" ? "Sun" : "Moon"} size={18} className="text-gray-600" />
        </button>
        <button
          onClick={() => { if (confirm(t("pr.logoutConfirm"))) logout(); }}
          title={t("pr.logout")}
          className="w-12 md:w-10 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-red-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
        >
          <Icon name="LogOut" size={18} className="text-red-500" />
        </button>
      </div>

      {/* Доски + Статьи + Инструкция */}
      <div className="grid grid-cols-3 gap-1.5 px-4 pb-4 md:px-3 md:pb-3">
        <button
          onClick={() => setShowBoards(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="Layers" size={15} />
          {t("pr.boards")}
        </button>
        <button
          onClick={() => setShowArticles(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="FileText" size={15} />
          {t("pr.articles")}
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="flex flex-col items-center justify-center gap-1 py-2.5 md:py-2 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all cursor-pointer text-black font-semibold text-[10px] md:text-[11px]"
        >
          <Icon name="BookOpen" size={15} />
          {t("pr.guide")}
        </button>
      </div>


      <ProfileStoriesRow
        stories={stories}
        addMedia={addMedia}
        removeMedia={removeMedia}
        storyInputRef={storyInputRef}
        longPressTimer={longPressTimer}
        setStoryOrigin={setStoryOrigin}
        setViewingStory={setViewingStory}
        deleteStoryId={deleteStoryId}
        setDeleteStoryId={setDeleteStoryId}
        categoryEditId={categoryEditId}
        setCategoryEditId={setCategoryEditId}
        savingCategory={savingCategory}
        handleChangeCategory={handleChangeCategory}
      />

      <ProfileMediaTabs
        tab={tab}
        setTab={setTab}
        stories={stories}
        setMediaViewer={setMediaViewer}
        setCategoryEditId={setCategoryEditId}
        setShowArticles={setShowArticles}
        myArticles={myArticles}
        myArticlesLoading={myArticlesLoading}
        onOpenBoard={(id) => { setOpenBoardId(id); setShowBoards(true); }}
        onOpenBoards={() => { setOpenBoardId(null); setShowBoards(true); }}
      />

      <div className="pb-28" />
      </div>
    </div>
  );
};


export default ProfilePage;
