import { useState, useEffect, useRef, useMemo } from "react";
import Icon from "@/components/ui/icon";
import UserAvatar from "@/components/ui/user-avatar";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";
import StoryViewer from "./post-feed/StoryViewer";
import PostCard from "./post-feed/PostCard";
import NoteViewer from "./post-feed/NoteViewer";
import MasonryFeed from "./post-feed/MasonryFeed";
import SearchOverlay from "./post-feed/SearchOverlay";
import { Post, Story, MOCK_POSTS, GET_PHOTOS_URL, formatTime, parseServerDate } from "./post-feed/PostFeedTypes";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { useFollowingList } from "@/hooks/useFollowing";

type FeedScope = "recommend" | "following" | "nearby";
type ViewMode = "masonry" | "feed";

const SCOPES: { id: FeedScope; label: string }[] = [
  { id: "following", label: "Подписки" },
  { id: "recommend", label: "Рекомендации" },
  { id: "nearby", label: "Рядом" },
];

// Простая детерминированная псевдослучайность для сортировки «Рядом» (без реальной геолокации)
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addMedia, removedIds, mediaVersion } = useUserMedia();
  const myStoryInputRef = useRef<HTMLInputElement>(null);
  const followingHandles = useFollowingList();
  const [scope, setScope] = useState<FeedScope>("recommend");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "masonry";
    return (localStorage.getItem("feed_view_mode") as ViewMode) || "masonry";
  });
  const [showSearch, setShowSearch] = useState(false);
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
      };
    };

    Promise.all([
      fetch(`${GET_PHOTOS_URL}?type=image`).then(r => r.json()),
      fetch(`${GET_PHOTOS_URL}?type=video`).then(r => r.json()),
    ])
      .then(([rawImages, rawVideos]) => {
        const imgData = typeof rawImages.body === 'string' ? JSON.parse(rawImages.body) : rawImages;
        const vidData = typeof rawVideos.body === 'string' ? JSON.parse(rawVideos.body) : rawVideos;
        const dbPosts: Post[] = (imgData.videos || []).map((v) => mapPost(v, false));
        const dbVideoPosts: Post[] = (vidData.videos || []).map((v) => mapPost(v, true));
        const seen = new Set<string>();
        const deduped = [...dbPosts, ...dbVideoPosts, ...MOCK_POSTS].filter(p => {
          if (!p.image) return true;
          if (seen.has(p.image)) return false;
          seen.add(p.image);
          return true;
        });
        setPosts(deduped);
      })
      .catch(() => setPosts(MOCK_POSTS))
      .finally(() => setLoading(false));
  }, [user, mediaVersion]);

  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollByDir = (dir: 1 | -1) => {
    const c = scrollRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollTop + dir * c.clientHeight * 0.85, behavior: "smooth" });
  };

  const counts = useBulkCounts("post", posts.map(p => p.id));
  const postsWithCounts = posts.map(p => ({
    ...p,
    comments: counts.comments[String(p.id)] ?? p.comments,
    likes: counts.likes[String(p.id)] ?? p.likes,
  }));

  const storySource = (postsWithCounts.length > 0 ? postsWithCounts : MOCK_POSTS)
    .filter(p => !removedIds.has(p.id));
  // Группируем по уникальному автору (handle) — в сторис должен быть каждый автор один раз
  const seenHandles = new Set<string>();
  const storyUsers = storySource.filter(p => {
    const key = (p.handle || p.author || "").toLowerCase().trim();
    if (!key || seenHandles.has(key)) return false;
    seenHandles.add(key);
    return true;
  }).slice(0, 12);
  const stories: Story[] = storyUsers.map(p => ({ id: p.id, handle: p.handle, avatar: p.avatar, image: p.image }));

  // Фильтрация по вкладке: Подписки / Рекомендации / Рядом
  const visiblePosts = storySource.filter(p => !removedIds.has(p.id));
  const scopedPosts = useMemo(() => {
    if (scope === "following") {
      const set = new Set(followingHandles.map(h => h.toLowerCase()));
      // Фото и видео подписанных авторов вместе, от новых к старым
      return visiblePosts
        .filter(p => set.has((p.handle || "").toLowerCase()))
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
    if (scope === "nearby") {
      return [...visiblePosts].sort((a, b) => hashStr(String(a.id)) - hashStr(String(b.id)));
    }
    return visiblePosts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, visiblePosts, followingHandles.join(",")]);

  return (
    <div className="relative h-full bg-black">
      {/* Story viewer */}
      {storyIndex !== null && (
        <StoryViewer stories={stories} startIndex={storyIndex} onClose={() => setStoryIndex(null)} />
      )}

      {showSearch && (
        <SearchOverlay
          posts={scopedPosts}
          onClose={() => setShowSearch(false)}
          onOpenPost={(p) => { setShowSearch(false); setSearchOpenedPost(p); }}
        />
      )}
      {searchOpenedPost && <NoteViewer post={searchOpenedPost} onClose={() => setSearchOpenedPost(null)} />}

      {/* Top bar: вкладки Подписки/Рекомендации/Рядом + поиск + переключатель вида */}
      <div className={`absolute top-0 left-0 right-0 z-30 ${viewMode === "masonry" ? "" : "md:max-w-[620px] md:mx-auto"} bg-black/85 backdrop-blur-md flex items-center gap-1 px-2 pt-3 pb-1.5 border-b border-white/8`}>
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
      <div className={`absolute top-[46px] left-0 right-0 z-20 ${viewMode === "masonry" ? "" : "md:max-w-[620px] md:mx-auto"} bg-black/85 backdrop-blur-md flex gap-4 px-3 py-3 overflow-x-scroll border-b border-white/8`} style={{ scrollbarWidth: "none" }}>
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
            <UserAvatar src={user?.avatar} name={user?.name || user?.username} alt="Ваша история" />

            <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-black">
              <Icon name="Plus" size={11} className="text-white" />
            </div>
          </div>
          <span className="text-white/80 text-[10px] w-16 text-center truncate">Ваша история</span>
        </button>
        {storyUsers.map((post, i) => (
          <button key={post.id} onClick={() => setStoryIndex(i)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-[62px] h-[62px] rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <UserAvatar src={post.avatar} name={post.handle} alt={post.handle} />
              </div>
            </div>
            <span className="text-white/80 text-[10px] w-16 text-center truncate">{post.handle}</span>
          </button>
        ))}
        <div className="flex-shrink-0 w-1" aria-hidden="true" />
      </div>

      {viewMode === "masonry" ? (
        <div className="absolute inset-0">
          <MasonryFeed posts={scopedPosts} loading={loading} topPad={156} />
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
            <div className="h-[156px] flex-shrink-0" aria-hidden />
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              scopedPosts.map((post) => (
                <div
                  key={post.id}
                  className="snap-start snap-always flex flex-col scroll-mt-[156px]"
                  style={{ height: "calc(100% - 156px)", minHeight: "calc(100% - 156px)" }}
                >
                  <PostCard post={post} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Desktop nav arrows — только в режиме полноэкранной ленты */}
      {viewMode === "feed" && (
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