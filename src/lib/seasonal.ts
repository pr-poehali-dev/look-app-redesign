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
