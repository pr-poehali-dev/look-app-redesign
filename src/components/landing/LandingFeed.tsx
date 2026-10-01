import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { useBulkCounts } from "@/hooks/useBulkCounts";

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

interface GuestVideo {
  id: number;
  url: string;
  thumbnail: string;
  handle: string;
  description: string;
  likes: string;
  comments: string;
  shares: string;
  views?: number;
}

interface LandingFeedProps {
  category: string;
  initialVideoId?: number;
  onLocked: (reason: string) => void;
}

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

const LandingFeed = ({ category, initialVideoId, onLocked }: LandingFeedProps) => {
  const [videos, setVideos] = useState<GuestVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState({ cur: 0, dur: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const counts = useBulkCounts("video", videos.map((v) => v.id));
  const short = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
  const likesOf = (v: GuestVideo) => {
    const c = counts.likes[String(v.id)];
    return typeof c === "number" ? short(c) : v.likes;
  };
  const savesOf = (v: GuestVideo) => {
    const c = counts.saves[String(v.id)];
    return typeof c === "number" && c > 0 ? short(c) : "";
  };
  const commentsOf = (v: GuestVideo) => {
    const c = counts.comments[String(v.id)];
    return typeof c === "number" ? short(c) : v.comments;
  };

  useEffect(() => {
    setLoading(true);
    const catParam = category !== "all" && category !== "new" ? `&category=${category}` : "&full=1";
    fetch(`${GET_VIDEOS_URL}?type=video${catParam}`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list: GuestVideo[] = (data.videos || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((v: any) => v.url && v.type === "video")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((v: any) => {
            const tags = (v.hashtags || "")
              .split(/[\s,]+/)
              .map((t: string) => t.trim().replace(/^#+/, ""))
              .filter(Boolean)
              .map((t: string) => `#${t}`)
              .join(" ");
            const base = (v.description || "").trim();
            const desc = /#\S+/.test(base) ? base : `${base} ${tags}`.trim();
            return {
              id: v.id,
              url: v.url,
              thumbnail: v.thumbnail || "",
              handle: v.handle || "user",
              description: desc,
              likes: String(v.likes || "0"),
              comments: String(v.comments || "0"),
              shares: String(v.shares || "0"),
              views: typeof v.views === "number" ? v.views : undefined,
            };
          });
        setVideos(category === "new" ? [...list].sort((a, b) => b.id - a.id) : list);
        setActive(0);
        if (containerRef.current) containerRef.current.scrollTop = 0;
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || videos.length === 0 || initialVideoId === undefined) return;
    const idx = videos.findIndex((v) => v.id === initialVideoId);
    if (idx > 0) {
      root.style.scrollBehavior = "auto";
      root.scrollTop = idx * root.clientHeight;
      root.style.scrollBehavior = "";
      setActive(idx);
    }
  }, [videos, initialVideoId]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || videos.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            setActive(Number((e.target as HTMLElement).dataset.idx));
          }
        });
      },
      { root, threshold: [0.6] }
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [videos]);

  useEffect(() => {
    setTime({ cur: 0, dur: 0 });
    setPaused(false);
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.muted = muted;
        v.play().catch(() => {});
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [active, videos]);

  useEffect(() => {
    const v = videoRefs.current[active];
    if (v) v.muted = muted;
  }, [muted, active]);

  const scrollByDir = (dir: number) => {
    const idx = Math.min(Math.max(active + dir, 0), videos.length - 1);
    slideRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-white/60">
        В этой категории пока нет видео. Зарегистрируйся и опубликуй первое!
      </div>
    );
  }

  const action = (icon: string, label: string, reason: string) => (
    <button
      key={icon}
      onClick={() => onLocked(reason)}
      className="flex flex-col items-center gap-1 text-white"
    >
      <Icon name={icon} size={28} />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((v, i) => {
          const isActive = i === active;
          const pct = isActive && time.dur ? (time.cur / time.dur) * 100 : 0;
          return (
            <div
              key={v.id}
              data-idx={i}
              ref={(el) => (slideRefs.current[i] = el)}
              className="flex h-full snap-start snap-always items-end justify-center gap-5 md:py-3"
            >
              <div className="relative h-full w-full overflow-hidden bg-black md:aspect-[9/16] md:w-auto md:rounded-2xl">
                {Math.abs(i - active) <= 1 && (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    src={v.url}
                    poster={v.thumbnail || undefined}
                    loop
                    muted={muted}
                    playsInline
                    preload={isActive ? "auto" : "metadata"}
                    onClick={(e) => {
                      const el = e.currentTarget;
                      if (el.paused) {
                        el.play().catch(() => {});
                        setPaused(false);
                      } else {
                        el.pause();
                        setPaused(true);
                      }
                    }}
                    onTimeUpdate={(e) => {
                      if (isActive) setTime({ cur: e.currentTarget.currentTime, dur: e.currentTarget.duration });
                    }}
                    className="h-full w-full cursor-pointer object-cover"
                  />
                )}
                {isActive && paused && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/40 text-white">
                      <Icon name="Play" size={40} />
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="absolute left-3 top-14 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white md:top-3"
                  aria-label="Звук"
                >
                  <Icon name={muted ? "VolumeX" : "Volume2"} size={18} />
                </button>

                <div className="absolute inset-x-0 bottom-0 p-4 pb-12 pr-20 text-white md:pr-4">
                  <div className="flex items-center gap-2">
                    <button
                    onClick={() => onLocked("Войди, чтобы смотреть профиль автора.")}
                    className="text-base font-bold"
                  >
                    @{v.handle}
                  </button>
                    <button
                      onClick={() => onLocked("Войди, чтобы подписаться на автора.")}
                      className="rounded-full border border-white/80 px-3 py-0.5 text-xs font-bold"
                    >
                      Подписаться
                    </button>
                  </div>
                  {v.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-white/90">{v.description}</p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-xs text-white/85">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                      <Icon name="Music" size={11} />
                    </span>
                    Look — Original Sound
                    {typeof v.views === "number" && <span>· {v.views} просмотров</span>}
                  </p>
                </div>

                <div className="absolute inset-x-4 bottom-3 flex items-center gap-3 text-[11px] font-semibold text-white">
                  <span>{fmt(isActive ? time.cur : 0)}</span>
                  <div className="relative h-1 flex-1 rounded-full bg-white/30">
                    <div className="h-full rounded-full bg-[#fe2c55]" style={{ width: `${pct}%` }} />
                    <div
                      className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white"
                      style={{ left: `calc(${pct}% - 6px)` }}
                    />
                  </div>
                  <span>{fmt(isActive ? time.dur : 0)}</span>
                </div>

                <div className="absolute bottom-24 right-3 flex flex-col items-center gap-4 md:hidden">
                  {action("Heart", likesOf(v), "Войди, чтобы ставить лайки.")}
                  {action("CommentFilled", commentsOf(v), "Войди, чтобы читать и писать комментарии.")}
                  {action("ShareForward", v.shares, "Войди, чтобы делиться видео.")}
                  {action("Bookmark", savesOf(v), "Войди, чтобы сохранять видео в свои подборки.")}
                </div>
              </div>

              <div className="hidden flex-col items-center gap-5 pb-6 md:flex">
                {action("Heart", likesOf(v), "Войди, чтобы ставить лайки.")}
                {action("CommentFilled", commentsOf(v), "Войди, чтобы читать и писать комментарии.")}
                {action("ShareForward", v.shares, "Войди, чтобы делиться видео.")}
                {action("Bookmark", savesOf(v), "Войди, чтобы сохранять видео в свои подборки.")}
                <button
                  onClick={() => onLocked("Войди, чтобы увидеть все возможности Лоок.")}
                  className="text-xs font-bold text-white"
                >
                  Ещё
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        <button
          onClick={() => scrollByDir(-1)}
          disabled={active === 0}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
          aria-label="Предыдущее видео"
        >
          <Icon name="ChevronUp" size={22} />
        </button>
        <button
          onClick={() => scrollByDir(1)}
          disabled={active >= videos.length - 1}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"
          aria-label="Следующее видео"
        >
          <Icon name="ChevronDown" size={22} />
        </button>
      </div>
    </div>
  );
};

export default LandingFeed;
