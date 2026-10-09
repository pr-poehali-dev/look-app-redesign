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
  { id: "humor", label: "Юмор", match: ["humor"] },
  { id: "music", label: "Музыка", match: ["music"] },
  { id: "dance", label: "Танцы", match: ["dance"] },
  { id: "sport", label: "Спорт", match: ["sport"] },
  { id: "science", label: "Наука", match: ["science"] },
  { id: "auto", label: "Авто", match: ["auto"] },
  { id: "tech", label: "Технологии", match: ["tech"] },
  { id: "anime", label: "Аниме и комиксы", match: ["anime"] },
  { id: "singdance", label: "Пение и танцы", match: ["singdance"] },
  { id: "lipsync", label: "Липсинк", match: ["lipsync"] },
  { id: "everyday", label: "Повседневность", match: ["everyday"] },
  { id: "society", label: "Общество", match: ["society"] },
  { id: "videos", label: "Видеозаписи", match: [] },
];

