import type { Post } from "./PostFeedTypes";
import { formatTime, parseServerDate } from "./PostFeedTypes";
import type { useAuth } from "@/context/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapPost = (v: any, isVideo: boolean, user: ReturnType<typeof useAuth>["user"]): Post => {
  const desc: string = v.description || "";
  const hashtagsField: string = v.hashtags || "";
  const tags = hashtagsField
    ? (hashtagsField.match(/#\S+/g) || hashtagsField.split(/[\s,]+/).filter(Boolean).map((t: string) => t.replace(/^#/, ""))).map((t: string) => t.replace(/^#/, ""))
    : (desc.match(/#\S+/g) || []).map((t: string) => t.slice(1));
  const caption = desc || (v.type === "text" ? "Пост" : isVideo ? "Видео" : "Фото");
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
    thumbnail: v.thumbnail || undefined,
    caption,
    hashtags: tags,
    likes: parseInt(v.likes) || 0,
    comments: parseInt(v.comments) || 0,
    time: formatTime(v.created_at),
    createdAt,
    isVideo,
    isText: v.type === "text",
    category: v.category || null,
    templateId: v.template_id || null,
    hasProducts: false,
    views: typeof v.views === "number" ? v.views : undefined,
    city: v.city || null,
    isVerified: !!v.is_verified,
    isAd: !!v.is_ad,
    adLabel: v.ad_label || null,
    images: Array.isArray(v.images) ? v.images : [],
    location: v.place || undefined,
    address: v.address || null,
    workHours: v.work_hours || null,
    tips: v.tips || null,
    seriesTitle: v.series_title || null,
    brand: v.brand || null,
    personalExperience: !!v.personal_experience,
    ageRating: v.age_rating || null,
    adErid: v.ad_erid || null,
    adAdvertiser: v.ad_advertiser || null,
    repostedBy: v.reposted_by || null,
    repostedByAvatar: v.reposted_by_avatar || null,
    cardTitle: v.card_title || null,
    cardPoints: Array.isArray(v.card_points) ? v.card_points : [],
    isCommercial: !!v.is_commercial || !!v.is_ad || !!v.has_products,
    topic: v.topic || null,
  };
};

