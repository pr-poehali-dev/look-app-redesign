export interface Rubric {
  id: string;
  label: string;
}

export const NEW_RUBRICS: Rubric[] = [
  { id: "lifehacks", label: "Советы по образу жизни" },
  { id: "traveldiary", label: "Дневник путешествий" },
  { id: "diy", label: "Сделай сам" },
  { id: "review", label: "Обзоры" },
  { id: "tutorial", label: "Туториалы" },
];

export const RUBRICS: Rubric[] = [
  ...NEW_RUBRICS,
  { id: "everyday", label: "Повседневность" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "fashion", label: "Мода" },
  { id: "beauty", label: "Красота" },
  { id: "home", label: "Дом" },
  { id: "fitness", label: "Фитнес и здоровье" },
  { id: "career", label: "Карьера" },
  { id: "tech", label: "Технологии" },
  { id: "services", label: "Услуги и сервисы" },
  { id: "humor", label: "Юмор" },
];
