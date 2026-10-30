import { useRef, useState, useEffect, startTransition } from "react";
import VideoCard, { VideoData } from "./VideoCard";
import Icon from "@/components/ui/icon";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { useFollowingList } from "@/hooks/useFollowing";
import { useHiddenAuthors } from "@/hooks/useFeedSignals";
import { readFeedCache, writeFeedCache } from "@/lib/feedCache";

export const CATEGORIES = [
  { id: "lifehacks", label: "Советы по образу жизни" },
  { id: "traveldiary", label: "Дневник путешествий" },
  { id: "review", label: "Обзоры" },
  { id: "tutorial", label: "Туториалы" },
  { id: "new", label: "Новые" },
  { id: "all", label: "Все" },
  { id: "subs", label: "Подписки" },
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "fashion", label: "Мода" },
  { id: "makeup", label: "Макияж" },
  { id: "movies", label: "Кино и ТВ" },
  { id: "kpop", label: "KPOP" },
  { id: "career", label: "Карьера" },
  { id: "home", label: "Дом" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
  { id: "nature", label: "Природа" },
  { id: "animals", label: "Животные" },
  { id: "beauty", label: "Красота" },
  { id: "diy", label: "Сделай сам" },
  { id: "science", label: "Наука" },
  { id: "auto", label: "Авто" },
  { id: "singdance", label: "Пение и танцы" },
  { id: "anime", label: "Аниме и комиксы" },
  { id: "relations", label: "Отношения" },
  { id: "show", label: "Шоу" },
  { id: "lipsync", label: "Липсинк" },
  { id: "everyday", label: "Повседневность" },
  { id: "society", label: "Общество" },
  { id: "family", label: "Семья" },
  { id: "drama", label: "Драма" },
  { id: "fitness", label: "Фитнес и здоровье" },
  { id: "education", label: "Образование" },
  { id: "tech", label: "Технологии" },
  { id: "services", label: "Услуги и сервисы" },
];


interface VideoFeedProps {
  activeTab: string;
  activeCategory?: string;
  initialVideoId?: number;
  onCloseInitial?: () => void;
}

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

const isSlowNetwork = () => {
  const c = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (!!c.saveData || c.effectiveType === "slow-2g" || c.effectiveType === "2g" || c.effectiveType === "3g");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapDbVideo = (v: any): VideoData & { category: string } => {
          const baseDesc = (v.description || "").trim();
          const tagsArr = (v.hashtags || "")
            .split(/[\s,]+/)
            .map((t: string) => t.trim().replace(/^#+/, ""))
            .filter(Boolean);
          // Если хэштеги уже встречаются в описании — не дублируем
          const hasTagsInDesc = /#\S+/.test(baseDesc);
          const tagsText = !hasTagsInDesc && tagsArr.length
            ? (baseDesc ? " " : "") + tagsArr.map((t: string) => `#${t}`).join(" ")
            : "";
          const fullDesc = (baseDesc + tagsText).trim();
return ({
          id: v.id + 10000,
          dbId: v.id,
          image: v.url,
          thumbnail: v.thumbnail || undefined,
          isVideo: v.type === 'video',
          author: v.author || "Автор",
          handle: v.handle || "user",
          description: fullDesc,
          song: "Look — Original Sound",
          likes: v.likes || "0",
          comments: v.comments || "0",
          shares: v.shares || "0",
          category: v.category || "all",
          avatar: v.avatar || "",
          templateId: v.template_id || null,
          hasProducts: !!v.has_products,
          views: typeof v.views === "number" ? v.views : undefined,
          isVerified: !!v.is_verified,
          isAd: !!v.is_ad,
          adLabel: v.ad_label || null,
          ageRating: v.age_rating || null,
          adErid: v.ad_erid || null,
          adAdvertiser: v.ad_advertiser || null,
          place: v.place || null,
          address: v.address || null,
          workHours: v.work_hours || null,
          tips: v.tips || null,
          seriesTitle: v.series_title || null,
          brand: v.brand || null,
          personalExperience: !!v.personal_experience,
          repostedBy: v.reposted_by || null,
        });
};

const mapDbVideos = (list: unknown[]) => (list || []).map(mapDbVideo);

const videoSig = (l: (VideoData & { category: string })[]) => l.map(v => `${v.id}:${v.likes}:${v.comments}:${v.image}`).join("|");

const VideoFeed = ({ activeTab, activeCategory = "all", initialVideoId }: VideoFeedProps) => {
  const slowNetwork = isSlowNetwork();
  void activeTab;
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [neighborsReady, setNeighborsReady] = useState(false);
  useEffect(() => {
    setNeighborsReady(false);
    const t = setTimeout(() => setNeighborsReady(true), slowNetwork ? 1200 : 500);
    return () => clearTimeout(t);
  }, [activeIndex]);
  const { userVideos, mediaVersion } = useUserMedia();
  const { user } = useAuth();
  const warmedRef = useRef<Set<string>>(new Set());
  const [dbVideos, setDbVideos] = useState<(VideoData & { category: string })[]>(() => {
    const c = readFeedCache<unknown[]>(`videos_${activeCategory}_${user?.id || "anon"}`);
    return c && c.length ? mapDbVideos(c) : [];
  });
  const [dbLoaded, setDbLoaded] = useState(() => {
    const c = readFeedCache<unknown[]>(`videos_${activeCategory}_${user?.id || "anon"}`);
    return !!(c && c.length);
  });
  const followingHandles = useFollowingList();
  const hiddenAuthors = useHiddenAuthors();

  const userVideoData: (VideoData & { category: string })[] = userVideos
    .filter(v => v.type === "video")
    .map(v => {
      const tagsArr = (v.hashtags || "")
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ""))
        .filter(Boolean);
      const tagsText = tagsArr.length ? " " + tagsArr.map(t => `#${t}`).join(" ") : "";
      const baseDesc = (v.description || "").trim();
      const fullDesc = (baseDesc + tagsText).trim() || "";
      return {
        id: v.id + 10000,
        dbId: v.id,
        image: v.url,
        thumbnail: v.thumbnail || undefined,
        isVideo: true,
        author: v.author || user?.name || "Я",
        handle: v.handle || user?.handle || "user",
        description: fullDesc,
        song: "Оригинальный звук",
        likes: v.likes || "0",
        comments: v.comments || "0",
        shares: v.shares || "0",
        category: v.category || "all",
        avatar: user?.avatar || "",
      };
    });

  const lastLoadKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const loadKey = String(activeCategory);
    const categoryChanged = lastLoadKeyRef.current !== null && lastLoadKeyRef.current !== loadKey;
    const firstLoad = lastLoadKeyRef.current === null;
    lastLoadKeyRef.current = loadKey;
    const cachedNow = readFeedCache<unknown[]>(`videos_${activeCategory}_${user?.id || "anon"}`);
    if ((firstLoad && !(cachedNow && cachedNow.length)) || categoryChanged) setDbLoaded(false);
    const isSubsCategory = activeCategory === "subs";
    const isNewCategory = activeCategory === "new";
    const uidParam = user?.id ? `&user_id=${encodeURIComponent(String(user.id))}` : "";
    const url = activeCategory && activeCategory !== "all" && !isSubsCategory && !isNewCategory
      ? `${GET_VIDEOS_URL}?type=video&category=${activeCategory}${uidParam}`
      : `${GET_VIDEOS_URL}?type=video&t=${mediaVersion}${isNewCategory ? "" : uidParam}`;
    const cacheKey = `videos_${activeCategory}_${user?.id || "anon"}`;
    const applyVideos = (list: unknown[], resetScroll: boolean) => {
        const next = mapDbVideos(list);
        setDbVideos(prev => (videoSig(prev) === videoSig(next) ? prev : next));
        if (resetScroll) {
          setActiveIndex(0);
          if (containerRef.current) containerRef.current.scrollTop = 0;
        }
    };
    const cached = readFeedCache<unknown[]>(cacheKey);
    const hadCache = !!(cached && cached.length);
    if (cached && hadCache) {
      applyVideos(cached, firstLoad || categoryChanged);
      setDbLoaded(true);
    }
    const parse = (raw: { body?: unknown; videos?: unknown[] }) => {
      const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
      return ((data as { videos?: unknown[] }).videos || []) as { id: number }[];
    };
    let cancelled = false;
    let head: { id: number }[] = [];
    const quick = !hadCache && !slowNetwork;
    if (quick) {
      fetch(`${url}&limit=6`)
        .then(r => r.json())
        .then(raw => {
          if (cancelled) return;
          head = parse(raw);
          if (head.length) {
            applyVideos(head, firstLoad || categoryChanged);
            setDbLoaded(true);
          }
        })
        .catch(() => {});
    }
    fetch(url)
      .then(r => r.json())
      .then(raw => {
        if (cancelled) return;
        let list = parse(raw);
        if (head.length) {
          const headIds = new Set(head.map(v => v.id));
          list = [...head, ...list.filter(v => !headIds.has(v.id))];
        }
        writeFeedCache(cacheKey, list.slice(0, 40));
        applyVideos(list, !hadCache && !head.length && (firstLoad || categoryChanged));
      })
      .catch(e => console.error('VideoFeed fetch error:', e))
      .finally(() => { if (!cancelled) setDbLoaded(true); });
    return () => { cancelled = true; };
  }, [activeCategory, mediaVersion, user?.id]);

  useEffect(() => {
    const first = dbVideos.slice(0, slowNetwork ? 2 : 4);
    first.forEach((v) => {
      if (v.thumbnail && !warmedRef.current.has(v.thumbnail)) {
        warmedRef.current.add(v.thumbnail);
        const img = new Image();
        img.decoding = "async";
        img.src = v.thumbnail;
      }
    });
    const head = first[0];
    if (head?.image && !slowNetwork && !warmedRef.current.has(head.image)) {
      warmedRef.current.add(head.image);
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = head.image;
      document.head.appendChild(link);
      setTimeout(() => link.remove(), 8000);
    }
  }, [dbVideos, slowNetwork]);

  // Дедупликация: убираем повторы по URL видео, чтобы один ролик не появлялся
  // дважды (например, из локального состояния и из БД одновременно).
  const seenUrls = new Set<string>();
  const allVideos = [...userVideoData, ...dbVideos].filter((v) => {
    if (hiddenAuthors.includes((v.handle || "").toLowerCase())) return false;
    const key = v.image;
    if (!key) return true;
    if (seenUrls.has(key)) return false;
    seenUrls.add(key);
    return true;
  });
  const heldThumbsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  useEffect(() => {
    const held = heldThumbsRef.current;
    const from = Math.max(0, activeIndex - 3);
    const to = activeIndex + (slowNetwork ? 3 : 6);
    allVideos.slice(from, to + 1).forEach((v) => {
      if (v.thumbnail && !held.has(v.thumbnail)) {
        const img = new Image();
        img.decoding = "sync";
        img.src = v.thumbnail;
        held.set(v.thumbnail, img);
      }
    });
    while (held.size > 60) {
      const k = held.keys().next().value;
      if (k === undefined) break;
      held.delete(k);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, dbVideos.length]);

  const filtered =
    activeCategory === "all"
      ? allVideos
      : activeCategory === "new"
        ? [...allVideos].sort((a, b) => Number(b.id) - Number(a.id))
        : activeCategory === "subs"
          ? allVideos.filter((v) => followingHandles.includes(v.handle))
          : allVideos.filter((v) => v.category === activeCategory);

  const counts = useBulkCounts("video", filtered.map(v => v.id));
  const formatShort = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
  const filteredWithCounts = filtered.map(v => {
    const c = counts.comments[String(v.id)];
    const l = counts.likes[String(v.id)];
    return {
      ...v,
      comments: typeof c === "number" ? formatShort(c) : v.comments,
      likes: typeof l === "number" ? formatShort(l) : v.likes,
      saves: counts.saves[String(v.id)] || 0,
    };
  });

  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  // Если открыли видео из плитки — проматываем к нему.
  // Карточки появляются в DOM только после dbLoaded=true, причём не сразу,
  // поэтому ретраим пока нужный элемент реально не окажется в DOM с высотой.
  useEffect(() => {
    if (!initialVideoId || !dbLoaded) return;
    const idx = filteredWithCounts.findIndex((v) => v.id === initialVideoId);
    if (idx < 0) return;

    let cancelled = false;
    let tries = 0;
    const go = () => {
      if (cancelled) return;
      const el = containerRef.current;
      const target = slideRefs.current[idx];
      if (el && target && el.clientHeight > 0) {
        el.scrollTop = target.offsetTop;
        setActiveIndex(idx);
        return;
      }
      if (tries < 60) {
        tries++;
        requestAnimationFrame(go);
      }
    };
    requestAnimationFrame(go);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVideoId, dbLoaded, filteredWithCounts.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;
    const commit = () => {
      const h = container.clientHeight || 1;
      const index = Math.round(container.scrollTop / h);
      startTransition(() => setActiveIndex((prev) => (prev === index ? prev : index)));
    };
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const h = container.clientHeight || 1;
        const pos = container.scrollTop / h;
        if (Math.abs(pos - Math.round(pos)) < 0.01) {
          if (timer) { clearTimeout(timer); timer = null; }
          commit();
          return;
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; commit(); }, 50);
      });
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (timer) clearTimeout(timer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const scrollByDir = (dir: 1 | -1) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollTop + dir * c.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="relative w-full h-full look-feed-root" style={{ background: "var(--look-bg)" }}>
      <div
        ref={containerRef}
        className={`absolute inset-0 overflow-y-scroll snap-y snap-mandatory overscroll-y-contain`}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          background: "var(--look-bg)",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overflowAnchor: "none",
          overscrollBehaviorY: "contain",
          willChange: "scroll-position",
        }}
      >
        {!dbLoaded ? (
          <div className="w-full flex items-center justify-center" style={{ height: "100%" }}>
            <p className="text-white/40 text-sm">Загрузка...</p>
          </div>
        ) : filteredWithCounts.length > 0 ? filteredWithCounts.map((video, i) => {
          const distance = Math.abs(i - activeIndex);
          const holdNeighbors = !neighborsReady && activeIndex === 0;
          const preloadLevel: "full" | "meta" | "none" =
            distance === 0 ? "full" : holdNeighbors ? "none" : distance === 1 && !slowNetwork ? (i > activeIndex ? "full" : "meta") : distance === 2 && !slowNetwork ? "meta" : "none";
          return (
            <div
              key={video.id}
              ref={(el) => { slideRefs.current[i] = el; }}
              className={`w-full snap-start snap-always flex md:items-center md:justify-center`}
              style={{ height: "100%", background: "var(--look-bg)", contain: "layout paint style" }}
            >
              <div className="w-full md:w-auto md:h-[calc(100vh-24px)] h-full" style={{ background: "var(--look-bg)" }}>
                {distance <= 2 && (
                  <VideoCard video={video} isActive={activeIndex === i} preloadLevel={preloadLevel} />
                )}
              </div>
            </div>
          );
        }) : (
          <div className="w-full flex flex-col items-center justify-center gap-3" style={{ height: "100%" }}>
            <p className="text-white/40 text-sm">Видео пока нет</p>
            <p className="text-white/20 text-xs">Нажми + чтобы загрузить первое</p>
          </div>
        )}
      </div>

      {/* Desktop nav arrows — у правого края экрана */}
      <div
        className="hidden lg:flex flex-col gap-3 absolute top-1/2 -translate-y-1/2 z-40 right-8"
      >
        <button
          onClick={() => scrollByDir(-1)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          aria-label="Предыдущее"
        >
          <Icon name="ChevronUp" size={22} className="text-white" />
        </button>
        <button
          onClick={() => scrollByDir(1)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          aria-label="Следующее"
        >
          <Icon name="ChevronDown" size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default VideoFeed;