import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import VideoCard, { VideoData } from "@/components/VideoCard";
import PostCard from "@/components/post-feed/PostCard";
import { Post, GET_PHOTOS_URL, formatTime, parseServerDate } from "@/components/post-feed/PostFeedTypes";

type Kind = "video" | "post";

const readParam = (): { kind: Kind; id: number } | null => {
  const sp = new URLSearchParams(window.location.search);
  for (const kind of ["video", "post"] as Kind[]) {
    const n = Number(sp.get(kind));
    if (Number.isFinite(n) && n > 0) return { kind, id: n };
  }
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toVideo = (v: any): VideoData => ({
  id: v.id + 10000,
  dbId: v.id,
  image: v.url,
  thumbnail: v.thumbnail || undefined,
  isVideo: v.type === "video",
  author: v.author || "Автор",
  handle: v.handle || "user",
  description: (v.description || "").trim(),
  song: "Look — Original Sound",
  likes: v.likes || "0",
  comments: v.comments || "0",
  shares: v.shares || "0",
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
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toPost = (v: any): Post => {
  const desc: string = v.description || "";
  return {
    id: v.id,
    author: v.author || "Пользователь",
    handle: v.handle || "user",
    avatar: v.avatar || "",
    image: v.url,
    caption: desc || (v.type === "video" ? "Видео" : "Фото"),
    hashtags: (desc.match(/#\S+/g) || []).map((t: string) => t.slice(1)),
    likes: parseInt(v.likes) || 0,
    comments: parseInt(v.comments) || 0,
    time: formatTime(v.created_at),
    createdAt: v.created_at ? parseServerDate(v.created_at).getTime() : undefined,
    isVideo: v.type === "video",
    isText: v.type === "text",
    templateId: v.template_id || null,
    hasProducts: !!v.has_products,
    views: typeof v.views === "number" ? v.views : undefined,
    isVerified: !!v.is_verified,
    isAd: !!v.is_ad,
    adLabel: v.ad_label || null,
    ageRating: v.age_rating || null,
    adErid: v.ad_erid || null,
    adAdvertiser: v.ad_advertiser || null,
    images: Array.isArray(v.images) ? v.images : [],
    location: v.place || undefined,
  };
};

const MediaDeepLink = () => {
  const [target, setTarget] = useState(readParam);
  const [item, setItem] = useState<VideoData | Post | null>(null);
  const [failed, setFailed] = useState(false);
  const [ageBlocked, setAgeBlocked] = useState(false);
  const uid = localStorage.getItem("user_id");

  useEffect(() => {
    if (!target) return;
    fetch(`${GET_PHOTOS_URL}?id=${target.id}${uid ? `&user_id=${encodeURIComponent(uid)}` : ""}`)
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        if (data.error === "age_restricted") { setAgeBlocked(true); return; }
        if (!data.video) { setFailed(true); return; }
        setItem(target.kind === "video" ? toVideo(data.video) : toPost(data.video));
      })
      .catch(() => setFailed(true));
  }, [target]);

  if (!target) return null;

  const close = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("video");
    url.searchParams.delete("post");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    setTarget(null);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex justify-center">
      <div className="relative w-full h-full max-w-[520px]">
        {item && target.kind === "video" && <VideoCard video={item as VideoData} isActive preloadLevel="full" />}
        {item && target.kind === "post" && <PostCard post={item as Post} />}
        {!item && !failed && !ageBlocked && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-[#22e0a1] animate-spin" />
          </div>
        )}
        {ageBlocked && (
          <p className="text-white/70 text-sm text-center pt-40 px-8">
            Контент 18+. Войдите в аккаунт и подтвердите дату рождения, чтобы посмотреть
          </p>
        )}
        {failed && <p className="text-white/70 text-sm text-center pt-40">Публикация недоступна или удалена</p>}
        <button
          onClick={close}
          className="absolute top-3 left-3 z-[60] w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Закрыть"
        >
          <Icon name="X" size={20} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default MediaDeepLink;
