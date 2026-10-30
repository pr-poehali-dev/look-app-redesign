import type { Post } from "@/components/post-feed/PostFeedTypes";

export interface SeasonalTopic {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

const WINTER: SeasonalTopic[] = [
  { id: "newyear", label: "Новый год", icon: "Sparkles", keywords: ["новый год", "новогод", "ёлка", "елка", "праздник"] },
  { id: "cozy", label: "Зимний уют", icon: "Flame", keywords: ["уют", "плед", "зим", "тепл"] },
  { id: "winterfood", label: "Зимние рецепты", icon: "Soup", keywords: ["рецепт", "суп", "выпечка", "food"] },
];
const SPRING: SeasonalTopic[] = [
  { id: "spring", label: "Весеннее настроение", icon: "Flower2", keywords: ["весн", "цвет", "первоцвет"] },
  { id: "garden", label: "Дача и рассада", icon: "Sprout", keywords: ["дач", "рассад", "огород", "сад"] },
  { id: "springstyle", label: "Весенний гардероб", icon: "Shirt", keywords: ["гардероб", "образ", "стиль", "fashion"] },
];
const SUMMER: SeasonalTopic[] = [
  { id: "vacation", label: "Отпуск и море", icon: "Sun", keywords: ["отпуск", "море", "пляж", "travel", "путешеств"] },
  { id: "summerfood", label: "Летняя еда", icon: "Salad", keywords: ["летн", "салат", "ягод", "food"] },
  { id: "dachasummer", label: "Дача летом", icon: "TreePine", keywords: ["дач", "сад", "огород", "шашлык"] },
];
const AUTUMN: SeasonalTopic[] = [
  { id: "autumn", label: "Осенний уют", icon: "Leaf", keywords: ["осен", "уют", "плед", "тыкв"] },
  { id: "halloween", label: "Хэллоуин", icon: "Ghost", keywords: ["хэллоуин", "хеллоуин", "halloween", "тыкв"] },
  { id: "autumnstyle", label: "Осенний гардероб", icon: "Shirt", keywords: ["гардероб", "образ", "стиль", "fashion", "пальто"] },
];

export const getSeasonalTopics = (date: Date): SeasonalTopic[] => {
  const m = date.getMonth();
  if (m === 11 || m <= 1) return WINTER;
  if (m <= 4) return SPRING;
  if (m <= 7) return SUMMER;
  if (m === 9 || m === 10) return AUTUMN;
  return AUTUMN;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const getLiveTopics = (posts: Post[], now: number, limit = 8): SeasonalTopic[] => {
  const stats = new Map<string, { score: number; count: number }>();
  posts.forEach((p) => {
    if (!p.createdAt || now - p.createdAt > WEEK_MS) return;
    const weight = (p.saves || 0) * 10 + p.comments * 3 + p.likes + 1;
    const tags = new Set((p.hashtags || []).map((h) => h.toLowerCase().replace(/^#/, "").trim()).filter((h) => h.length > 2));
    tags.forEach((tag) => {
      const cur = stats.get(tag) || { score: 0, count: 0 };
      stats.set(tag, { score: cur.score + weight, count: cur.count + 1 });
    });
  });
  const all = [...stats.entries()].sort((a, b) => b[1].score - a[1].score);
  const repeated = all.filter(([, v]) => v.count >= 2);
  const picked = (repeated.length >= 3 ? repeated : all).slice(0, limit);
  return picked.map(([tag]) => ({ id: `tag:${tag}`, label: `#${tag}`, icon: "TrendingUp", keywords: [tag] }));
};
