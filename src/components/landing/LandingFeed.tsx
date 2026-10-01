import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

interface GuestVideo {
  id: number;
  url: string;
  thumbnail: string;
  author: string;
  handle: string;
  description: string;
  avatar: string;
  likes: string;
  comments: string;
  shares: string;
}

interface LandingFeedProps {
  newestFirst: boolean;
  onLocked: (reason: string) => void;
}

const LandingFeed = ({ newestFirst, onLocked }: LandingFeedProps) => {
  const [videos, setVideos] = useState<GuestVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`${GET_VIDEOS_URL}?type=video`)
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
              author: v.author || "Автор",
              handle: v.handle || "user",
              description: desc,
              avatar: v.avatar || "",
              likes: String(v.likes || "0"),
              comments: String(v.comments || "0"),
              shares: String(v.shares || "0"),
            };
          });
        setVideos(newestFirst ? [...list].sort((a, b) => b.id - a.id) : list);
        setActive(0);
        if (containerRef.current) containerRef.current.scrollTop = 0;
      })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [newestFirst]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || videos.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.6) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActive(idx);
          }
        });
      },
      { root, threshold: [0.6] }
    );
    slideRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [videos]);

  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.muted = muted;
        v.play().catch(() => {});
      } else {
        v.pause();
        if (Math.abs(i - active) > 1) v.currentTime = 0;
      }
    });
  }, [active, muted, videos]);

  const scrollByDir = (dir: number) => {
    const el = slideRefs.current[Math.min(Math.max(active + dir, 0), videos.length - 1)];
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (loading) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#14723f]/20 border-t-[#14723f]" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center bg-white p-6 text-center text-black/50">
        Пока нет видео. Зарегистрируйся и опубликуй первое!
      </div>
    );
  }

  const actionBtn = (icon: string, label: string, reason: string) => (
    <button
      onClick={() => onLocked(reason)}
      className="flex flex-col items-center gap-1 text-[#161823] lg:text-[#161823]"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 transition-colors hover:bg-black/10 max-lg:bg-black/40 max-lg:text-white">
        <Icon name={icon} size={24} />
      </span>
      <span className="text-xs font-semibold max-lg:text-white">{label}</span>
    </button>
  );

  return (
    <div className="relative h-full flex-1 bg-white max-lg:bg-black">
      <div
        ref={containerRef}
        className="h-full snap-y snap-mandatory overflow-y-scroll scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {videos.map((v, i) => (
          <div
            key={v.id}
            data-idx={i}
            ref={(el) => (slideRefs.current[i] = el)}
            className="flex h-full snap-start snap-always items-center justify-center py-0 lg:py-5"
          >
            <div className="relative flex h-full items-end gap-4 lg:max-h-[calc(100vh-40px)]">
              <div className="relative aspect-[9/16] h-full max-lg:aspect-auto max-lg:h-full max-lg:w-screen overflow-hidden bg-black lg:rounded-xl">
                {Math.abs(i - active) <= 1 && (
                  <video
                    ref={(el) => (videoRefs.current[i] = el)}
                    src={v.url}
                    poster={v.thumbnail || undefined}
                    loop
                    muted={muted}
                    playsInline
                    preload={i === active ? "auto" : "metadata"}
                    onClick={() => setMuted((m) => !m)}
                    className="h-full w-full cursor-pointer object-cover"
                  />
                )}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
                  aria-label="Звук"
                >
                  <Icon name={muted ? "VolumeX" : "Volume2"} size={18} />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-4 pr-20 text-white lg:pr-4">
                  <p className="text-base font-bold">{v.handle}</p>
                  {v.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-white/90">{v.description}</p>
                  )}
                  <p className="mt-2 flex items-center gap-2 text-xs text-white/80">
                    <Icon name="Music" size={14} />
                    Оригинальный звук — {v.author}
                  </p>
                </div>

                <div className="absolute bottom-24 right-3 flex flex-col items-center gap-3 lg:hidden">
                  <button
                    onClick={() => onLocked("Войди, чтобы подписаться на автора.")}
                    className="relative h-12 w-12"
                  >
                    {v.avatar ? (
                      <img src={v.avatar} alt={v.author} className="h-12 w-12 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[#14723f] text-white">
                        <Icon name="User" size={22} />
                      </span>
                    )}
                  </button>
                  {actionBtn("Heart", v.likes, "Войди, чтобы ставить лайки.")}
                  {actionBtn("MessageCircle", v.comments, "Войди, чтобы читать и писать комментарии.")}
                  {actionBtn("Share2", v.shares, "Войди, чтобы делиться видео.")}
                </div>
              </div>

              <div className="hidden flex-col items-center gap-3 pb-2 lg:flex">
                <button
                  onClick={() => onLocked("Войди, чтобы подписаться на автора.")}
                  className="relative mb-2 h-12 w-12"
                >
                  {v.avatar ? (
                    <img src={v.avatar} alt={v.author} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#14723f] text-white">
                      <Icon name="User" size={22} />
                    </span>
                  )}
                  <span className="absolute -bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-[#14723f] text-white">
                    <Icon name="Plus" size={14} />
                  </span>
                </button>
                {actionBtn("Heart", v.likes, "Войди, чтобы ставить лайки.")}
                {actionBtn("MessageCircle", v.comments, "Войди, чтобы читать и писать комментарии.")}
                {actionBtn("Bookmark", "Сохранить", "Войди, чтобы сохранять видео в свои подборки.")}
                {actionBtn("Share2", v.shares, "Войди, чтобы делиться видео.")}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button
          onClick={() => scrollByDir(-1)}
          disabled={active === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-[#161823] hover:bg-black/10 disabled:opacity-30"
          aria-label="Предыдущее видео"
        >
          <Icon name="ChevronUp" size={24} />
        </button>
        <button
          onClick={() => scrollByDir(1)}
          disabled={active >= videos.length - 1}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-[#161823] hover:bg-black/10 disabled:opacity-30"
          aria-label="Следующее видео"
        >
          <Icon name="ChevronDown" size={24} />
        </button>
      </div>
    </div>
  );
};

export default LandingFeed;
