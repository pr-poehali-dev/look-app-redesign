export interface AuthorProfile {
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  followers: string;
  following: string;
  posts: string;
  verified?: boolean;
  gallery: { image: string; isVideo?: boolean; views?: string }[];
}

const CDN = "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files";

export const AUTHORS: Record<string, AuthorProfile> = {
  anya_dance: {
    handle: "anya_dance",
    name: "Аня Смирнова",
    avatar: `${CDN}/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg`,
    bio: "Танцую всё, что движется ✨\nМосква · 21\nКоллабы → DM",
    followers: "142K",
    following: "286",
    posts: "187",
    verified: true,
    gallery: [
      { image: `${CDN}/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg`, isVideo: true, views: "1.2M" },
      { image: `${CDN}/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg`, views: "320K" },
      { image: `${CDN}/0730a864-0860-4c86-8845-835a8c4a720e.jpg`, views: "98K" },
      { image: `${CDN}/85269bc0-d690-47bb-b96f-3b41f8103627.jpg`, isVideo: true, views: "540K" },
      { image: `${CDN}/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg`, views: "210K" },
      { image: `${CDN}/48f38c64-742e-458c-9f09-0013a0813b5f.jpg`, views: "75K" },
    ],
  },
  max_parkour: {
    handle: "max_parkour",
    name: "Макс Паркур",
    avatar: `${CDN}/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg`,
    bio: "Прыгаю где хочу 🔥\nЭкстрим · спорт · приключения",
    followers: "389K",
    following: "104",
    posts: "264",
    verified: true,
    gallery: [
      { image: `${CDN}/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg`, isVideo: true, views: "3.8M" },
      { image: `${CDN}/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg`, views: "1.1M" },
      { image: `${CDN}/85269bc0-d690-47bb-b96f-3b41f8103627.jpg`, views: "420K" },
      { image: `${CDN}/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg`, isVideo: true, views: "2.1M" },
    ],
  },
  cozy_coffee: {
    handle: "cozy_coffee",
    name: "Кофе и уют",
    avatar: `${CDN}/0730a864-0860-4c86-8845-835a8c4a720e.jpg`,
    bio: "☕ Каждое утро с любовью\nКофейни СПб · обзоры · рецепты",
    followers: "87K",
    following: "512",
    posts: "412",
    gallery: [
      { image: `${CDN}/0730a864-0860-4c86-8845-835a8c4a720e.jpg`, views: "245K" },
      { image: `${CDN}/0a51a008-0fe3-4620-8186-4626075d14eb.jpg`, views: "98K" },
      { image: `${CDN}/7d2a955d-e857-4d7f-8064-f61069e91884.jpg`, views: "67K" },
    ],
  },
  sasha_lol: {
    handle: "sasha_lol",
    name: "Саша Юмор",
    avatar: `${CDN}/85269bc0-d690-47bb-b96f-3b41f8103627.jpg`,
    bio: "Делаю мемы 24/7 😂\nЕсли смешно — лайк, если нет — тоже лайк",
    followers: "621K",
    following: "89",
    posts: "1.2K",
    verified: true,
    gallery: [
      { image: `${CDN}/85269bc0-d690-47bb-b96f-3b41f8103627.jpg`, isVideo: true, views: "5.4M" },
      { image: `${CDN}/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg`, views: "890K" },
      { image: `${CDN}/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg`, isVideo: true, views: "1.7M" },
    ],
  },
  anya_life: {
    handle: "anya_life",
    name: "Аня Смирнова",
    avatar: `${CDN}/48f38c64-742e-458c-9f09-0013a0813b5f.jpg`,
    bio: "Жизнь в моменте 🌅\nМосква · фото · путешествия",
    followers: "28.4K",
    following: "421",
    posts: "342",
    gallery: [
      { image: `${CDN}/48f38c64-742e-458c-9f09-0013a0813b5f.jpg`, views: "12K" },
      { image: `${CDN}/0a51a008-0fe3-4620-8186-4626075d14eb.jpg`, views: "8.5K" },
      { image: `${CDN}/7d2a955d-e857-4d7f-8064-f61069e91884.jpg`, views: "21K" },
    ],
  },
  cozy_morning: {
    handle: "cozy_morning",
    name: "Кофе и Уют",
    avatar: `${CDN}/0730a864-0860-4c86-8845-835a8c4a720e.jpg`,
    bio: "Идеальное утро каждый день ☕",
    followers: "14.2K",
    following: "188",
    posts: "256",
    gallery: [
      { image: `${CDN}/0a51a008-0fe3-4620-8186-4626075d14eb.jpg`, views: "4.2K" },
      { image: `${CDN}/0730a864-0860-4c86-8845-835a8c4a720e.jpg`, views: "9.1K" },
    ],
  },
  city_shots: {
    handle: "city_shots",
    name: "Городской Фотограф",
    avatar: `${CDN}/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg`,
    bio: "Города · ночь · неон 📸\nТокио → Москва → СПб",
    followers: "56.7K",
    following: "342",
    posts: "489",
    verified: true,
    gallery: [
      { image: `${CDN}/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg`, views: "32K" },
      { image: `${CDN}/45213a06-ddb6-4425-9410-cb3777726c55.jpg`, views: "18K" },
    ],
  },
  max_fit: {
    handle: "max_fit",
    name: "Макс Фитнес",
    avatar: `${CDN}/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg`,
    bio: "День 180 без пропусков 💪\nТренировки · мотивация · питание",
    followers: "91K",
    following: "120",
    posts: "523",
    verified: true,
    gallery: [
      { image: `${CDN}/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg`, isVideo: true, views: "240K" },
      { image: `${CDN}/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg`, views: "120K" },
    ],
  },
  home_aesthetics: {
    handle: "home_aesthetics",
    name: "Дом и Стиль",
    avatar: `${CDN}/7d2a955d-e857-4d7f-8064-f61069e91884.jpg`,
    bio: "Минимализм · интерьер · уют 🌿",
    followers: "33.8K",
    following: "267",
    posts: "198",
    gallery: [
      { image: `${CDN}/7d2a955d-e857-4d7f-8064-f61069e91884.jpg`, views: "15K" },
    ],
  },
};

export const getAuthor = (handle: string): AuthorProfile => {
  return AUTHORS[handle] || {
    handle,
    name: handle.replace(/_/g, " "),
    avatar: "",
    bio: "Привет! Я в Лоок ✨",
    followers: "0",
    following: "0",
    posts: "0",
    gallery: [],
  };
};