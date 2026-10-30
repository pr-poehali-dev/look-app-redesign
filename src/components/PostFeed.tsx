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
import ArticleCard from "./post-feed/ArticleCard";
import { Reader } from "@/components/profile/ArticlesScreen";
import { useArticles } from "@/hooks/useArticles";
import SearchOverlay from "./post-feed/SearchOverlay";
import { Post, GET_PHOTOS_URL, formatTime, parseServerDate } from "./post-feed/PostFeedTypes";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { readFeedCache, writeFeedCache } from "@/lib/feedCache";
import { mapPost } from "@/components/post-feed/mapPost";
import TopicsScreen from "@/components/topics/TopicsScreen";
import ChallengeBanner from "@/components/challenges/ChallengeBanner";
import { isSlowNetwork } from "@/lib/network";
import { useFollowingList } from "@/hooks/useFollowing";
import { detectCity, normCity } from "@/lib/city";
import { toast } from "sonner";
import { FEED_CATEGORIES } from "@/lib/feedCategories";
import CategoryBar from "./post-feed/CategoryBar";
import SeasonalStrip, { matchesTopic } from "./post-feed/SeasonalStrip";
import { getSeasonalTopics, getLiveTopics, type SeasonalTopic } from "@/lib/seasonal";

type FeedScope = "recommend" | "following" | "nearby" | "trending" | "articles";
type ViewMode = "masonry" | "feed";

const SCOPES: { id: FeedScope; label: string }[] = [
  { id: "following", label: "Подписки" },
  { id: "recommend", label: "Вдохновение" },
  { id: "articles", label: "Статьи" },
  { id: "nearby", label: "Рядом" },
];

const PostFeed = () => {
  const { user, token, updateUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>(() => {
    const raw = readFeedCache<{ img: unknown[]; vid: unknown[] }>(`posts_${user?.id || "anon"}`);
    if (!raw) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return [...(raw.img || []).map((v: any) => mapPost(v, false, user)), ...(raw.vid || []).map((v: any) => mapPost(v, true, user))];
  });
  const { articles: feedArticles } = useArticles("feed");
  const [openedArticleId, setOpenedArticleId] = useState<number | null>(null);
  const [loading, setLoading] = useState(() => !readFeedCache(`posts_${user?.id || "anon"}`));
  const { addMedia, removedIds, mediaVersion } = useUserMedia();
  const myStoryInputRef = useRef<HTMLInputElement>(null);
  const followingHandles = useFollowingList();
  const [scope, setScope] = useState<FeedScope>("recommend");
  const [showTopics, setShowTopics] = useState(false);
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(0);
  useEffect(() => { setNowTs(Date.now()); }, []);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "masonry";
    return (localStorage.getItem("feed_view_mode") as ViewMode) || "masonry";
  });
  const [showSearch, setShowSearch] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  useEffect(() => {
    const on = (e: Event) => {
      setSearchSeed((e as CustomEvent).detail?.query || "");
      setShowSearch(true);
    };
    window.addEventListener("open-search", on);
    return () => window.removeEventListener("open-search", on);
  }, []);
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
    const uidParam = user?.id ? `&user_id=${encodeURIComponent(String(user.id))}` : "";
    const postsCacheKey = `posts_${user?.id || "anon"}`;
    let cancelled = false;
    const load = (extra: string) => Promise.all([
      fetch(`${GET_PHOTOS_URL}?type=image${uidParam}${extra}`).then(r => r.json()),
      fetch(`${GET_PHOTOS_URL}?type=video${uidParam}${extra}`).then(r => r.json()),
    ]).then(([rawImages, rawVideos]) => {
      const imgData = typeof rawImages.body === 'string' ? JSON.parse(rawImages.body) : rawImages;
      const vidData = typeof rawVideos.body === 'string' ? JSON.parse(rawVideos.body) : rawVideos;
      return { imgData, vidData };
    });
    const apply = ({ imgData, vidData }: { imgData: { videos?: unknown[] }; vidData: { videos?: unknown[] } }) => {
      const dbPosts: Post[] = (imgData.videos || []).map((v: unknown) => mapPost(v, false, user));
      const dbVideoPosts: Post[] = (vidData.videos || []).map((v: unknown) => mapPost(v, true, user));
      const seen = new Set<string>();
      const deduped = [...dbPosts, ...dbVideoPosts].filter(p => {
        if (!p.image) return true;
        if (seen.has(p.image)) return false;
        seen.add(p.image);
        return true;
      });
      const sig = (list: Post[]) => list.map(p => `${p.id}:${p.likes}:${p.comments}:${p.image}`).join("|");
      setPosts(prev => (sig(prev) === sig(deduped) ? prev : deduped));
    };
    const hasCache = !!readFeedCache(postsCacheKey);
    let gotHead = false;
    if (!hasCache && !isSlowNetwork()) {
      load("&limit=6").then(d => {
        if (cancelled || gotHead) return;
        gotHead = true;
        apply(d);
        setLoading(false);
      }).catch(() => {});
    }
    load("")
      .then(d => {
        if (cancelled) return;
        writeFeedCache(postsCacheKey, { img: (d.imgData.videos || []).slice(0, 30), vid: (d.vidData.videos || []).slice(0, 30) });
        apply(d);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, mediaVersion]);

  const [shown, setShown] = useState(5);
  useEffect(() => {
    if (shown >= posts.length + 10) return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const grow = () => setShown(n => n + 5);
    if (w.requestIdleCallback) w.requestIdleCallback(grow, { timeout: 600 });
    else setTimeout(grow, 300);
  }, [shown, posts.length]);

  const warmedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const slow = isSlowNetwork();
    const limit = slow ? 4 : 10;
    posts.slice(0, limit).forEach((p) => {
      const src = p.thumbnail || (p.isVideo ? "" : p.image);
      if (src && !warmedRef.current.has(src)) {
        warmedRef.current.add(src);
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    });
  }, [posts]);

  const [storyHandle, setStoryHandle] = useState<string | null>(null);
  const [storyOrigin, setStoryOrigin] = useState<DOMRect | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByDir = (dir: 1 | -1) => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollTop + dir * c.clientHeight * 0.85, behavior: "smooth" });
  };

  const tutorialPosts: Post[] = useMemo(() => feedArticles.filter(a => a.kind === "tutorial").map(a => ({
    id: -a.id,
    author: a.author_name,
    handle: a.author_handle || a.author_name,
    avatar: a.author_avatar || "",
    image: a.cover_image || "",
    caption: a.title,
    hashtags: [],
    likes: 0,
    comments: 0,
    time: formatTime(a.created_at),
    createdAt: a.created_at ? parseServerDate(a.created_at).getTime() : undefined,
    category: "tutorial",
    views: a.views,
    article: a,
  })), [feedArticles]);

  const imageCounts = useBulkCounts("post", posts.filter(p => !p.isVideo).map(p => p.id));
  const videoCounts = useBulkCounts("video", posts.filter(p => p.isVideo).map(p => p.id));
  const postsWithCounts = posts.map(p => {
    const c = p.isVideo ? videoCounts : imageCounts;
    return {
      ...p,
      comments: c.comments[String(p.id)] ?? p.comments,
      likes: c.likes[String(p.id)] ?? p.likes,
      views: c.views[String(p.id)] ?? p.views,
      saves: c.saves[String(p.id)] ?? p.saves ?? 0,
    };
  });

  const visiblePosts = [...postsWithCounts.filter(p => !removedIds.has(p.id) && !p.isCommercial), ...tutorialPosts].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
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
    const dayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const score = (p: Post) => {
      const base = (p.saves || 0) * 10 + p.comments * 3 + p.likes + (p.views || 0) / 50;
      const ageDays = p.createdAt ? Math.max(0, (now - p.createdAt) / dayMs) : 30;
      return (base + 2) / Math.pow(ageDays + 2, 1.2);
    };
    return [...visiblePosts].sort((a, b) => score(b) - score(a) || byNew(a, b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, visiblePosts, followingHandles.join(","), myHandle, myCity]);

  const feedTopics: SeasonalTopic[] = useMemo(() => {
    if (!nowTs) return [];
    const live = getLiveTopics(visiblePosts, nowTs);
    if (live.length >= 3) return live;
    const seasonal = getSeasonalTopics(new Date(nowTs)).filter((t) => !live.some((l) => l.id === t.id));
    return [...live, ...seasonal];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowTs, posts, removedIds, tutorialPosts, imageCounts, videoCounts]);

  const activeCategory = FEED_CATEGORIES.find(c => c.id === categoryId);
  const categoryPosts = useMemo(() => {
    const season = scope === "recommend" && seasonId ? feedTopics.find(t => t.id === seasonId) : null;
    const matched = season ? scopedPosts.filter(p => matchesTopic(p, season)) : scopedPosts;
    const bySeason = season && matched.length === 0 ? scopedPosts : matched;
    const base = bySeason;
    if (!activeCategory || activeCategory.id === "recommend") return base;
    if (activeCategory.id === "videos") return base.filter(p => p.isVideo);
    return base.filter(p => activeCategory.match.includes((p.category || "").toLowerCase()));
  }, [scopedPosts, activeCategory, scope, seasonId, feedTopics]);
  const seasonEmpty = scope === "recommend" && !!seasonId && (() => {
    const t = feedTopics.find(x => x.id === seasonId);
    return !!t && scopedPosts.every(p => !matchesTopic(p, t));
  })();
  const headerH = scope === "articles" ? 156 : 200;

  const seenHandles = new Set<string>();
  const storyUsers = scopedPosts.filter(p => {
    if (p.article) return false;
    const key = (p.handle || p.author || "").toLowerCase().trim();
    if (!key || seenHandles.has(key)) return false;
    seenHandles.add(key);
    return true;
  }).slice(0, 12);
  useEffect(() => {
    const urls = [user?.avatar, ...storyUsers.slice(0, isSlowNetwork() ? 5 : 12).map(p => p.avatar)];
    urls.forEach((src) => {
      if (src && !warmedRef.current.has(src)) {
        warmedRef.current.add(src);
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    });
    const first = storyUsers[0];
    if (first && !isSlowNetwork()) {
      const src = first.thumbnail || (first.isVideo ? "" : first.image);
      if (src && !warmedRef.current.has(src)) {
        warmedRef.current.add(src);
        const img = new Image();
        img.src = src;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, user?.avatar, scope]);

  const storiesByHandle = (handle: string): StoryViewerItem[] =>
    visiblePosts
      .filter(p => !p.article && (p.handle || p.author || "").toLowerCase().trim() === handle.toLowerCase().trim())
      .map(p => ({ id: p.id, label: p.handle, avatar: p.avatar, image: p.image, isVideo: p.isVideo, thumbnail: p.thumbnail }));

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

      {showTopics && (
        <div className="fixed inset-0 z-[10000] bg-black">
          <TopicsScreen onBack={() => setShowTopics(false)} />
        </div>
      )}

      {showSearch && (
        <SearchOverlay
          initialQuery={searchSeed}
          posts={categoryPosts.filter(p => !p.article)}
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
        <button
          onClick={() => setShowTopics(true)}
          title="Темы"
          aria-label="Темы"
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        >
          <Icon name="Hash" size={18} className="text-white" />
        </button>
        <button onClick={() => { setSearchSeed(""); setShowSearch(true); }} className="h-8 px-3 rounded-full bg-white/10 flex items-center gap-1.5 flex-shrink-0">
          <Icon name="Search" size={15} className="text-white" />
          <span className="text-white/70 text-[12px]">Поиск</span>
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
          <MasonryFeed posts={categoryPosts} loading={loading} topPad={headerH} header={scope === "recommend" ? <SeasonalStrip posts={scopedPosts} topics={feedTopics} activeId={seasonId} onChange={setSeasonId} empty={seasonEmpty} /> : undefined} />
        </div>
      ) : (
        /* Posts — прокрутка с привязкой, под фиксированной панелью сторис */
        <div
          ref={scrollRef}
          className="h-full overflow-y-scroll snap-y snap-mandatory overscroll-y-contain"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
        >
          <div className="md:max-w-[620px] md:mx-auto">
            {/* Резерв под фиксированную панель сторис */}
            <div className="flex-shrink-0" style={{ height: headerH }} aria-hidden />
            {!loading && <div className="px-3 pb-2"><ChallengeBanner /></div>}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#FF5A3C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              categoryPosts.slice(0, shown).map((post) => (
                <div
                  key={post.id}
                  className="snap-start snap-always flex flex-col "
                  style={{ height: `calc(100% - ${headerH}px)`, minHeight: `calc(100% - ${headerH}px)`, scrollMarginTop: headerH }}
                >
                  {post.article ? (
                    <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-3">
                      <ArticleCard a={post.article} onOpen={() => setOpenedArticleId(post.article!.id)} />
                    </div>
                  ) : (
                    <PostCard post={post} />
                  )}
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

      {openedArticleId !== null && (
        <div className="fixed inset-0 z-[150] bg-white">
          <Reader id={openedArticleId} onBack={() => setOpenedArticleId(null)} onEdit={() => setOpenedArticleId(null)} />
        </div>
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