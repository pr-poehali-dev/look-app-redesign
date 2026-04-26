export interface Story {
  id: number;
  handle: string;
  avatar: string;
  image: string;
}

export interface Post {
  id: number;
  author: string;
  handle: string;
  avatar: string;
  image: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  time: string;
  location?: string;
}

export const GET_PHOTOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

export const MOCK_POSTS: Post[] = [
  {
    id: 1001,
    author: "Аня Смирнова",
    handle: "anya_life",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg",
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg",
    caption: "Золотой час — моё любимое время дня 🌅 Когда свет такой, хочется остановить время и просто дышать",
    hashtags: ["золотойчас", "портрет", "фото", "жизнь", "красота"],
    likes: 2841,
    comments: 134,
    time: "2 ч назад",
    location: "Москва, Россия",
  },
  {
    id: 1002,
    author: "Кофе и Уют",
    handle: "cozy_morning",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0a51a008-0fe3-4620-8186-4626075d14eb.jpg",
    caption: "Идеальное утро начинается с правильного кофе ☕ Сегодня попробовала новый бленд — просто космос!",
    hashtags: ["кофе", "утро", "еда", "завтрак", "уют"],
    likes: 1203,
    comments: 87,
    time: "5 ч назад",
    location: "Кофейня «Дрейф», СПб",
  },
  {
    id: 1003,
    author: "Городской Фотограф",
    handle: "city_shots",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
    caption: "Город после дождя — совсем другой мир. Неоновые отражения, тишина и запах мокрого асфальта 🌧️",
    hashtags: ["фотография", "город", "ночь", "дождь", "неон"],
    likes: 5672,
    comments: 312,
    time: "8 ч назад",
    location: "Токио, Япония",
  },
  {
    id: 1004,
    author: "Макс Фитнес",
    handle: "max_fit",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg",
    caption: "День 180 без пропусков 💪 Каждый день — это выбор. Выбери себя, выбери движение!",
    hashtags: ["фитнес", "спорт", "мотивация", "тренировка"],
    likes: 9104,
    comments: 541,
    time: "12 ч назад",
    location: "FitZone Gym, Москва",
  },
  {
    id: 1005,
    author: "Дом и Стиль",
    handle: "home_aesthetics",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/7d2a955d-e857-4d7f-8064-f61069e91884.jpg",
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/7d2a955d-e857-4d7f-8064-f61069e91884.jpg",
    caption: "Минимализм — это не про пустоту, это про пространство для самого важного 🌿",
    hashtags: ["интерьер", "дом", "минимализм", "декор"],
    likes: 3388,
    comments: 198,
    time: "1 д назад",
  },
];

export const MOCK_COMMENTS = [
  { id: 1, name: "anya_dance", text: "🔥 Просто огонь!", time: "1 мин" },
  { id: 2, name: "max_parkour", text: "Лучшее что я видел сегодня 😂", time: "3 мин" },
  { id: 3, name: "cozy_coffee", text: "Подписалась сразу!", time: "5 мин" },
  { id: 4, name: "travel_rus", text: "Продолжай в том же духе 👏", time: "12 мин" },
];

export const formatLikes = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "K" : String(n);

export const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return "недавно";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} д назад`;
  return `${Math.floor(diff / 2592000)} мес назад`;
};
