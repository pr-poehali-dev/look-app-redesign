export interface Topic {
  slug: string;
  title: string;
  icon: string;
  color: string;
}

export const TOPICS: Topic[] = [
  { slug: "inspiration", title: "Вдохновение", icon: "Sparkles", color: "#8b5cf6" },
  { slug: "routes", title: "Маршруты", icon: "Map", color: "#0ea5e9" },
  { slug: "diy", title: "DIY", icon: "Hammer", color: "#f59e0b" },
  { slug: "city", title: "Город", icon: "Building2", color: "#64748b" },
  { slug: "food", title: "Еда", icon: "UtensilsCrossed", color: "#ef4444" },
  { slug: "home", title: "Дом и интерьер", icon: "Sofa", color: "#14b8a6" },
  { slug: "style", title: "Стиль", icon: "Shirt", color: "#ec4899" },
  { slug: "beauty", title: "Красота", icon: "Flower2", color: "#f472b6" },
  { slug: "travel", title: "Путешествия", icon: "Plane", color: "#06b6d4" },
  { slug: "nature", title: "Природа", icon: "Leaf", color: "#22c55e" },
  { slug: "hobby", title: "Хобби", icon: "Palette", color: "#a855f7" },
  { slug: "sport", title: "Спорт", icon: "Dumbbell", color: "#f97316" },
  { slug: "kids", title: "Дети и семья", icon: "Baby", color: "#eab308" },
  { slug: "pets", title: "Питомцы", icon: "PawPrint", color: "#84cc16" },
];

export const topicTitle = (slug?: string | null) => TOPICS.find((t) => t.slug === slug)?.title || "";
