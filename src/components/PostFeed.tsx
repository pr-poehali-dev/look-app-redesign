import { useState, useEffect, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import StoryViewerModal, { StoryViewerItem } from "./shared/StoryViewerModal";
import PostCard from "./post-feed/PostCard";
import NoteViewer from "./post-feed/NoteViewer";
import MasonryFeed from "./post-feed/MasonryFeed";
import ArticlesFeed from "./post-feed/ArticlesFeed";
import SearchOverlay from "./post-feed/SearchOverlay";
import { Post, GET_PHOTOS_URL, formatTime, parseServerDate } from "./post-feed/PostFeedTypes";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { useFollowingList } from "@/hooks/useFollowing";
import { detectCity, normCity } from "@/lib/city";
import { toast } from "sonner";
import { FEED_CATEGORIES } from "@/lib/feedCategories";
import CategoryBar from "./post-feed/CategoryBar";

type FeedScope = "recommend" | "following" | "nearby" | "trending" | "articles";
type ViewMode = "masonry" | "feed";

const SCOPES: { id: FeedScope; label: string }[] = [
  { id: "following", label: "Подписки" },
  { id: "recommend", label: "Рекомендации" },
  { id: "trending", label: "Тренды" },
  { id: "articles", label: "Статьи" },
  { id: "nearby", label: "Рядом" },
];

const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token, updateUser } = useAuth();
  const { addMedia, removedIds, mediaVersion } = useUserMedia();
  const myStoryInputRef = useRef<HTMLInputElement>(null);
  const followingHandles = useFollowingList();
  const [scope, setScope] = useState<FeedScope>("recommend");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "masonry";
    return (localStorage.getItem("feed_view_mode") as ViewMode) || "masonry";
  });
  const [showSearch, setShowSearch] = useState(false);
  const [categoryId, setCategoryId] = useState("recommend");
  const [detecting, setDetecting] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [editingCity, setEditingCity] = useState(false);
  const myCity = normCity(user?.city);

  const saveCity = async (city: string) => {
    const clean = city.trim();
    if (!clean || !token) return;
    try {
      const res = await fetch("https://functions.poehali.dev/075d6280-020a-48ce-a5e4-64eb3291a01e", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", token, city: clean }),
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      if (data.user) { updateUser(data.user); setEditingCity(false); setCityInput(""); }
      else toast.error(data.error || "Не удалось сохранить город");
    } catch { toast.error("Не удалось сохранить город"); }
  };

  const autoDetect = async () => {
    setDetecting(true);
    try { await saveCity(await detectCity()); }
    catch { toast.error("Не удалось определить город. Введи его вручную"); }
    setDetecting(false);
  };
  const [searchOpenedPost, setSearchOpenedPost] = useState<Post | null>(null);

  useEffect(() => {
    try { localStorage.setItem("feed_view_mode", viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapPost = (v: any, isVideo: boolean): Post => {
      const desc: string = v.description || "";
      const hashtagsField: string = v.hashtags || "";
      const tags = hashtagsField
        ? (hashtagsField.match(/#\S+/g) || hashtagsField.split(/[\s,]+/).filter(Boolean).map((t: string) => t.replace(/^#/, ""))).map((t: string) => t.replace(/^#/, ""))
        : (desc.match(/#\S+/g) || []).map((t: string) => t.slice(1));
      const caption = desc || (isVideo ? "Видео" : "Фото");
      // Аватарка: берём из БД если есть. Подставляем свою — только если это пост текущего пользователя
      const isMyPost = (v.handle && user?.handle && v.handle === user.handle)
        || (v.author && user?.name && v.author === user.name)
        || v.author === "Я";
      const dbAvatar = v.avatar || v.user_avatar || null;
      const createdAt = v.created_at ? parseServerDate(v.created_at).getTime() : undefined;
      return {
        id: v.id,
        author: (v.author === "Я" || !v.author) ? (user?.name || "Пользователь") : v.author,
        handle: (v.handle === "user" || !v.handle) ? (user?.handle || user?.name || "user") : v.handle,
        avatar: dbAvatar || (isMyPost ? (user?.avatar || "") : ""),
        image: v.url,
        caption,
        hashtags: tags,
        likes: parseInt(v.likes) || 0,
        comments: parseInt(v.comments) || 0,
        time: formatTime(v.created_at),
        createdAt,
        isVideo,
        category: v.category || null,
        templateId: v.template_id || null,
        hasProducts: !!v.has_products,
        views: typeof v.views === "number" ? v.views : undefined,
        city: v.city || null,
        isVerified: !!v.is_verified,
        isAd: !!v.is_ad,
        adLabel: v.ad_label || null,
        repostedBy: v.reposted_by || null,
        repostedByAvatar: v.reposted_by_avatar || null,
      };
    };

    const uidParam = user?.id ? `&user_id=${encodeURIComponent(String(user.id))}` : "";
    Promise.all([
      fetch(`${GET_PHOTOS_URL}?type=image${uidParam}`).then(r => r.json()),
      fetch(`${GET_PHOTOS_URL}?type=video${uidParam}`).then(r => r.json()),
    ])
      .then(([rawImages, rawVideos]) => {
        const imgData = typeof rawImages.body === 'string' ? JSON.parse(rawImages.body) : rawImages;
        const vidData = typeof rawVideos.body === 'string' ? JSON.parse(rawVideos.body) : rawVideos;
        const dbPosts: Post[] = (imgData.videos || []).map((v: any) => mapPost(v, false));
        const dbVideoPosts: Post[] = (vidData.videos || []).map((v: any) => mapPost(v, true));
        const seen = new Set<string>();
        const deduped = [...dbPosts, ...dbVideoPosts].filter(p => {
          if (!p.image) return true;
          if (seen.has(p.image)) return false;
          seen.add(p.image);
          return true;
        });
        setPosts(deduped);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [user, mediaVersion]);

  const [storyHandle, setStoryHandle] = useState<string | null>(null);
  const [storyOrigin, setStoryOrigin] = useState<DOMRect | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByDir = (dir: 1 | -1) => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollTop + dir * c.clientHeight * 0.85, behavior: "smooth" });
  };

  const imageCounts = useBulkCounts("post", posts.filter(p => !p.isVideo).map(p => p.id));
  const videoCounts = useBulkCounts("video", posts.filter(p => p.isVideo).map(p => p.id));
  const postsWithCounts = posts.map(p => {
    const c = p.isVideo ? videoCounts : imageCounts;
    return {
      ...p,
      comments: c.comments[String(p.id)] ?? p.comments,
      likes: c.likes[String(p.id)] ?? p.likes,
      views: c.views[String(p.id)] ?? p.views,
    };
  });

  const visiblePosts = postsWithCounts.filter(p => !removedIds.has(p.id));
  const myHandle = (user?.handle || "").toLowerCase();
  const scopedPosts = useMemo(() => {
    const byNew = (a: Post, b: Post) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
    if (scope === "following") {
      const set = new Set(followingHandles.map(h => h.toLowerCase()));
      return visiblePosts.filter(p => set.has((p.handle || "").toLowerCase())).sort(byNew);
    }
    if (scope === "nearby") {
      if (!myCity) return [];
      return visiblePosts
        .filter(p => normCity(p.city) === myCity && (p.handle || "").toLowerCase() !== myHandle)
        .sort(byNew);
    }
    if (scope === "trending") {
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const score = (p: Post) => {
        const base = p.likes * 3 + p.comments * 5 + (p.views || 0) / 10;
        const age = p.createdAt ? now - p.createdAt : weekMs;
        const freshBonus = age < weekMs ? (1 - age / weekMs) * base * 0.5 : 0;
        return base + freshBonus;
      };
      return [...visiblePosts].sort((a, b) => score(b) - score(a));
    }
    const followed = new Set(followingHandles.map(h => h.toLowerCase()));
    return visiblePosts
      .filter(p => (p.handle || "").toLowerCase() !== myHandle)
      .sort((a, b) => {
        const fa = followed.has((a.handle || "").toLowerCase()) ? 1 : 0;
        const fb = followed.has((b.handle || "").toLowerCase()) ? 1 : 0;
        return fb - fa || byNew(a, b);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, visiblePosts, followingHandles.join(","), myHandle, myCity]);

  const activeCategory = FEED_CATEGORIES.find(c => c.id === categoryId);
  const categoryPosts = useMemo(() => {
    if (!activeCategory || activeCategory.id === "recommend") return scopedPosts;
    if (activeCategory.id === "videos") return scopedPosts.filter(p => p.isVideo);
    return scopedPosts.filter(p => activeCategory.match.includes((p.category || "").toLowerCase()));
  }, [scopedPosts, activeCategory]);
  const headerH = scope === "articles" ? 156 : 200;

  const seenHandles = new Set<string>();
  const storyUsers = scopedPosts.filter(p => {
    const key = (p.handle || p.author || "").toLowerCase().trim();
    if (!key || seenHandles.has(key)) return false;
    seenHandles.add(key);
    return true;
  }).slice(0, 12);
  const storiesByHandle = (handle: string): StoryViewerItem[] =>
    visiblePosts
      .filter(p => (p.handle || p.author || "").toLowerCase().trim() === handle.toLowerCase().trim())
      .map(p => ({ id: p.id, label: p.handle, avatar: p.avatar, image: p.image, isVideo: p.isVideo }));

  return (
    <div className="relative h-full bg-black">
      {/* Story viewer — все истории выбранного пользователя, раскрывается из круга аватара */}
      {storyHandle !== null && (
        <StoryViewerModal
          items={storiesByHandle(storyHandle)}
          startIndex={0}
          originRect={storyOrigin}
          onClose={() => { setStoryHandle(null); setStoryOrigin(null); }}
        />
      )}

      {showSearch && (
        <SearchOverlay
          posts={categoryPosts}
          onClose={() => setShowSearch(false)}
          onOpenPost={(p) => { setShowSearch(false); setSearchOpenedPost(p); }}
        />
      )}
      {searchOpenedPost && <NoteViewer post={searchOpenedPost} onClose={() => setSearchOpenedPost(null)} />}

      {/* Top bar: вкладки Подписки/Рекомендации/Рядом + поиск + переключатель вида */}
      <div className={`media-overlay-text absolute top-0 left-0 right-0 z-30 ${viewMode === "masonry" ? "" : "md:max-w-[620px] md:mx-auto"} bg-black/85 backdrop-blur-md flex items-center gap-1 px-2 pt-3 pb-1.5 border-b border-white/8`}>
        <div className="flex-1 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {SCOPES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScope(s.id)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${
                scope === s.id ? "bg-white text-black" : "text-white/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowSearch(true)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="Search" size={18} className="text-white" />
        </button>
        <button
          onClick={() => setViewMode((m) => (m === "masonry" ? "feed" : "masonry"))}
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          title={viewMode === "masonry" ? "Показать лентой" : "Показать сеткой"}
        >
          <Icon name={viewMode === "masonry" ? "Rows3" : "LayoutGrid"} size={18} className="text-white" />
        </button>
      </div>

      {/* Stories row — фиксирована под вкладками, вне прокрутки постов */}
      <div className={`media-overlay-text absolute top-[46px] left-0 right-0 z-20 ${viewMode === "masonry" ? "" : "md:max-w-[620px] md:mx-auto"} bg-black/85 backdrop-blur-md flex gap-4 px-3 py-3 overflow-x-scroll border-b border-white/8`} style={{ scrollbarWidth: "none" }}>
        {/* "Your story" first */}
        <input
          ref={myStoryInputRef}
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
          onClick={() => myStoryInputRef.current?.click()}
          className="flex flex-col items-center gap-1 flex-shrink-0"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-[62px] h-[62px] rounded-full border-2 border-white/20 flex items-center justify-center relative overflow-hidden">
            <UserAvatar src={user?.avatar} name={user?.name || user?.handle} alt="Ваша история" />

            <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-black">
              <Icon name="Plus" size={11} className="text-white" />
            </div>
          </div>
          <span className="text-white/80 text-[10px] w-16 text-center truncate">Ваша история</span>
        </button>
        {storyUsers.map((post) => (
          <button
            key={post.id}
            onClick={(e) => {
              const ring = e.currentTarget.querySelector("[data-story-ring]");
              setStoryOrigin((ring || e.currentTarget).getBoundingClientRect());
              setStoryHandle(post.handle || post.author);
            }}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div data-story-ring className="w-[62px] h-[62px] rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <UserAvatar src={post.avatar} name={post.handle} alt={post.handle} />
              </div>
            </div>
            <span className="text-white/80 text-[10px] w-16 text-center truncate">{post.handle}</span>
          </button>
        ))}
        <div className="flex-shrink-0 w-1" aria-hidden="true" />
      </div>

      {scope !== "articles" && (
        <CategoryBar
          value={categoryId}
          onChange={setCategoryId}
          className={`media-overlay-text absolute top-[156px] left-0 right-0 z-20 ${viewMode === "masonry" ? "" : "md:max-w-[620px] md:mx-auto"} bg-black/85 backdrop-blur-md border-b border-white/8`}
        />
      )}

      {scope === "nearby" && (!myCity || editingCity || scopedPosts.length === 0) ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center" style={{ paddingTop: headerH }}>
          <Icon name="MapPin" size={44} className="text-white/40" />
          {!myCity || editingCity ? (
            <>
              <p className="text-white/80 text-sm">{editingCity ? "Выберите другой город" : "Укажите город, и я покажу публикации авторов рядом с вами"}</p>
              <button
                onClick={autoDetect}
                disabled={detecting || !user}
                className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-semibold disabled:opacity-60"
              >
                {detecting ? "Определяю..." : "Определить мой город"}
              </button>
              <div className="flex items-center gap-2 w-full max-w-xs">
                <input
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  placeholder="Или введите город"
                  maxLength={80}
                  className="flex-1 min-w-0 px-3 py-2 rounded-full bg-white/10 text-white placeholder-white/40 text-sm outline-none"
                />
                <button
                  onClick={() => saveCity(cityInput)}
                  disabled={!cityInput.trim() || !user}
                  className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold disabled:opacity-40"
                >
                  Готово
                </button>
              </div>
              {editingCity && (
                <button onClick={() => { setEditingCity(false); setCityInput(""); }} className="text-white/50 text-xs">Отмена</button>
              )}
              {!user && <p className="text-white/40 text-xs">Войдите в аккаунт, чтобы сохранить город</p>}
            </>
          ) : (
            <>
              <p className="text-white/80 text-sm">В городе «{user?.city}» пока нет публикаций других авторов</p>
              <p className="text-white/40 text-xs">Они появятся, когда авторы укажут этот город в своём профиле</p>
              <button onClick={() => setEditingCity(true)} className="px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold">Сменить город</button>
            </>
          )}
        </div>
      ) : scope === "articles" ? (
        <div className="absolute inset-0">
          <ArticlesFeed topPad={headerH} />
        </div>
      ) : viewMode === "masonry" ? (
        <div className="absolute inset-0">
          <MasonryFeed posts={categoryPosts} loading={loading} topPad={headerH} />
        </div>
      ) : (
        /* Posts — прокрутка с привязкой, под фиксированной панелью сторис */
        <div
          ref={scrollRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          <div className="md:max-w-[620px] md:mx-auto">
            {/* Резерв под фиксированную панель сторис */}
            <div className="flex-shrink-0" style={{ height: headerH }} aria-hidden />
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              categoryPosts.map((post) => (
                <div
                  key={post.id}
                  className="snap-start snap-always flex flex-col "
                  style={{ height: `calc(100% - ${headerH}px)`, minHeight: `calc(100% - ${headerH}px)`, scrollMarginTop: headerH }}
                >
                  <PostCard post={post} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {scope === "nearby" && myCity && !editingCity && scopedPosts.length > 0 && (
        <button
          onClick={() => setEditingCity(true)}
          className="absolute left-3 bottom-24 md:bottom-6 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-xs font-semibold"
        >
          <Icon name="MapPin" size={14} className="text-white" />
          {user?.city} · сменить
        </button>
      )}

      {/* Desktop nav arrows — только в режиме полноэкранной ленты */}
      {viewMode === "feed" && scope !== "articles" && (
      <div
        className="hidden md:flex flex-col gap-3 absolute top-1/2 -translate-y-1/2 right-8 z-40"
      >
        <button
          onClick={() => scrollByDir(-1)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          aria-label="Вверх"
        >
          <Icon name="ChevronUp" size={22} className="text-white" />
        </button>
        <button
          onClick={() => scrollByDir(1)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          aria-label="Вниз"
        >
          <Icon name="ChevronDown" size={22} className="text-white" />
        </button>
      </div>
      )}
    </div>
  );
};

export default PostFeed;