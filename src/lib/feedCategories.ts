export interface FeedCategory {
  id: string;
  label: string;
  match: string[];
}

export const FEED_CATEGORIES: FeedCategory[] = [
  { id: "recommend", label: "Все", match: [] },
  { id: "fashion", label: "Мода", match: ["fashion", "style"] },
  { id: "food", label: "Еда", match: ["food"] },
  { id: "makeup", label: "Макияж", match: ["makeup", "beauty"] },
  { id: "movies", label: "Кино и ТВ", match: ["movies", "show", "drama"] },
  { id: "kpop", label: "KPOP", match: ["kpop"] },
  { id: "career", label: "Карьера", match: ["career", "education"] },
  { id: "relations", label: "Отношения", match: ["relations", "family"] },
  { id: "home", label: "Дом", match: ["home", "diy"] },
  { id: "gaming", label: "Игры", match: ["gaming"] },
  { id: "travel", label: "Путешествия", match: ["travel"] },
  { id: "fitness", label: "Фитнес", match: ["fitness"] },
  { id: "animals", label: "Животные", match: ["animals"] },
  { id: "nature", label: "Природа", match: ["nature"] },
  { id: "videos", label: "Видеозаписи", match: [] },
];

