import { useRef, useState, useEffect } from "react";
import VideoCard, { VideoData } from "./VideoCard";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";

export const CATEGORIES = [
  { id: "all", label: "Все" },
  { id: "music", label: "Музыка" },
  { id: "dance", label: "Танцы" },
  { id: "sport", label: "Спорт" },
  { id: "humor", label: "Юмор" },
  { id: "travel", label: "Путешествия" },
  { id: "food", label: "Еда" },
  { id: "style", label: "Стиль" },
  { id: "gaming", label: "Игры" },
  { id: "nature", label: "Природа" },
  { id: "animals", label: "Животные" },
  { id: "beauty", label: "Красота" },
  { id: "diy", label: "Сделай сам" },
  { id: "science", label: "Наука" },
  { id: "auto", label: "Авто" },
];

const VIDEOS: (VideoData & { category: string })[] = [
  {
    id: 1,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg",
    author: "Аня Смирнова",
    handle: "anya_dance",
    description: "Ночной танец в городе ✨ Это лучший момент за весь вечер! #танцы #ночь #город",
    song: "Imanbek — Roses (Remix)",
    likes: "142K",
    comments: "3.2K",
    shares: "18K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg",
    category: "dance",
  },
  {
    id: 2,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
    author: "Макс Паркур",
    handle: "max_parkour",
    description: "Прыжок между крышами на закате 🔥 Сердце в горле, но кайф максимальный! #паркур #экстрим",
    song: "Skrillex — Bangarang",
    likes: "389K",
    comments: "12K",
    shares: "54K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
    category: "sport",
  },
  {
    id: 3,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
    author: "Кофе и уют",
    handle: "cozy_coffee",
    description: "Мой любимый уголок по утрам ☕ Латте-арт от баристы — просто шедевр #кофе #уют #эстетика",
    song: "Lofi Chill — Morning Vibes",
    likes: "87K",
    comments: "4.1K",
    shares: "9.3K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
    category: "food",
  },
  {
    id: 4,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
    author: "Саша Юмор",
    handle: "sasha_lol",
    description: "Когда мама позвонила в самый неподходящий момент 😂😂 POV: ты стример #юмор #смешно #мемы",
    song: "Популярный звук — Реакция",
    likes: "621K",
    comments: "28K",
    shares: "103K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
    category: "humor",
  },
  {
    id: 5,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg",
    author: "Путешествия",
    handle: "travel_rus",
    description: "Нашёл этот водопад случайно во время похода 🌿 Природа России — это нечто! #природа #путешествия #поход",
    song: "Coldplay — Yellow (Acoustic)",
    likes: "256K",
    comments: "7.8K",
    shares: "31K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg",
    category: "travel",
  },
  {
    id: 6,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
    author: "Дима Фото",
    handle: "dima_lens",
    description: "Золотой час в поле — магия в каждом кадре 📷 #фото #природа #закат",
    song: "Hans Zimmer — Time",
    likes: "193K",
    comments: "5.6K",
    shares: "22K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
    category: "nature",
  },
  {
    id: 7,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg",
    author: "Катя Стиль",
    handle: "katya_style",
    description: "Образ дня: минимализм и уверенность 👗 Как вам? #мода #стиль #аутфит",
    song: "Dua Lipa — Levitating",
    likes: "318K",
    comments: "14K",
    shares: "41K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg",
    category: "style",
  },
  {
    id: 8,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg",
    author: "ФитнесПро",
    handle: "fit_pro",
    description: "Утренняя тренировка за 10 минут — без оправданий 💪 #фитнес #зож #мотивация",
    song: "The Weeknd — Blinding Lights",
    likes: "477K",
    comments: "19K",
    shares: "68K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5b90e1a9-665b-4e6c-9184-2edf68db2e91.jpg",
    category: "sport",
  },
  {
    id: 9,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg",
    author: "GameZone",
    handle: "gamezone_tv",
    description: "Этот момент в игре изменил всё 🎮 Никто не ожидал такого финала #игры #геймер #стрим",
    song: "Undertale — Megalovania",
    likes: "534K",
    comments: "31K",
    shares: "89K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/45213a06-ddb6-4425-9410-cb3777726c55.jpg",
    category: "gaming",
  },
  {
    id: 10,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg",
    author: "DJ Макс",
    handle: "dj_max_official",
    description: "Новый трек уже в сети — послушай первым 🎧 #музыка #электронная #dj",
    song: "DJ Max — Infinite Loop",
    likes: "712K",
    comments: "42K",
    shares: "115K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c96bc59d-e416-4e11-adf2-a308d67a562d.jpg",
    category: "music",
  },
  {
    id: 11,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/8c5bdcfd-94c7-4f6f-8957-0890e7b683b8.jpg",
    author: "Лена Красота",
    handle: "lena_beauty",
    description: "Макияж за 5 минут для работы 💄 Сохраняй, чтобы не потерять! #макияж #красота #уход",
    song: "Ariana Grande — 7 Rings",
    likes: "289K",
    comments: "16K",
    shares: "53K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/8c5bdcfd-94c7-4f6f-8957-0890e7b683b8.jpg",
    category: "beauty",
  },
  {
    id: 12,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg",
    author: "Коля Мастер",
    handle: "kolya_diy",
    description: "Сделал полку из досок за 2 часа 🔨 Материалы — 500 рублей #сделайсам #дом #идеи",
    song: "Lofi Hip Hop — Study Beats",
    likes: "98K",
    comments: "8.2K",
    shares: "34K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/d5398fcc-427a-4d1c-963f-7e6f079a7ba6.jpg",
    category: "diy",
  },
  {
    id: 13,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
    author: "НаукаПросто",
    handle: "science_easy",
    description: "Почему небо синее? Объясняю за 60 секунд 🔬 #наука #физика #интересно",
    song: "Nils Frahm — Says",
    likes: "445K",
    comments: "23K",
    shares: "77K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/5c280ad4-5edb-4bea-9ce4-5b7795d36707.jpg",
    category: "science",
  },
  {
    id: 14,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
    author: "АвтоМания",
    handle: "auto_mania",
    description: "Дрифт на мокром асфальте — просто кайф 🚗💨 #авто #дрифт #скорость",
    song: "Fast & Furious OST — Ride",
    likes: "603K",
    comments: "37K",
    shares: "94K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/0730a864-0860-4c86-8845-835a8c4a720e.jpg",
    category: "auto",
  },
  {
    id: 15,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
    author: "Зоопарк Дома",
    handle: "home_zoo",
    description: "Мой кот решил помочь с уборкой 🐱 Как обычно, только навредил #кот #животные #смешно",
    song: "Популярный звук — Котик",
    likes: "831K",
    comments: "49K",
    shares: "142K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/85269bc0-d690-47bb-b96f-3b41f8103627.jpg",
    category: "animals",
  },
  {
    id: 16,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg",
    author: "Вася Стендап",
    handle: "vasya_standup",
    description: "Когда объяснял жене куда потратил зарплату 😅 Стендап-клип #юмор #стендап #семья",
    song: "Весёлый звук — Хаха",
    likes: "967K",
    comments: "55K",
    shares: "178K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/c8b8bf7c-7db9-4624-b5fd-0c96115cd5aa.jpg",
    category: "humor",
  },
  {
    id: 17,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
    author: "Маша Танцует",
    handle: "masha_moves",
    description: "Новый чэллендж захватил всё приложение 🕺 Попробуй повторить! #танцы #чэллендж #тренд",
    song: "Bad Bunny — Tití Me Preguntó",
    likes: "1.2M",
    comments: "73K",
    shares: "201K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/dbf882bc-5b07-4604-a1fa-628313ce915f.jpg",
    category: "dance",
  },
  {
    id: 18,
    image: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg",
    author: "Шеф Артём",
    handle: "chef_artem",
    description: "Паста карбонара за 15 минут — проще, чем кажется 🍝 Рецепт в описании #еда #рецепт #готовка",
    song: "Italian Vibes — Bella",
    likes: "374K",
    comments: "21K",
    shares: "88K",
    avatar: "https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/a3325030-6571-46e9-845b-2a54062f9059.jpg",
    category: "food",
  },
];

interface VideoFeedProps {
  activeTab: string;
  activeCategory?: string;
}

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

const VideoFeed = ({ activeTab, activeCategory = "all" }: VideoFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dbVideos, setDbVideos] = useState<(VideoData & { category: string })[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  const { userVideos } = useUserMedia();
  const { user } = useAuth();

  const userVideoData: (VideoData & { category: string })[] = userVideos
    .filter(v => v.type === "video")
    .map(v => ({
      id: v.id,
      image: v.url,
      isVideo: true,
      author: user?.name || "Я",
      handle: user?.handle || "user",
      description: "Моё видео",
      song: "Оригинальный звук",
      likes: "0",
      comments: "0",
      shares: "0",
      category: "all",
      avatar: user?.avatar || "",
    }));

  useEffect(() => {
    setDbLoaded(false);
    const url = activeCategory && activeCategory !== "all"
      ? `${GET_VIDEOS_URL}?type=video&category=${activeCategory}`
      : `${GET_VIDEOS_URL}?type=video`;
    fetch(url)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDbVideos((data.videos || []).map((v: any) => ({
          id: v.id + 10000,
          image: v.url,
          isVideo: v.type === 'video',
          author: v.author || "Автор",
          handle: v.handle || "user",
          description: v.description || "",
          song: "Look — Original Sound",
          likes: v.likes || "0",
          comments: v.comments || "0",
          shares: v.shares || "0",
          category: v.category || "all",
          avatar: v.avatar || "",
        })));
        setActiveIndex(0);
        if (containerRef.current) containerRef.current.scrollTop = 0;
      })
      .catch(e => console.error('VideoFeed fetch error:', e))
      .finally(() => setDbLoaded(true));
  }, [activeCategory]);

  const allVideos = [...userVideoData, ...dbVideos];
  const filtered = activeCategory === "all"
    ? allVideos
    : allVideos.filter((v) => v.category === activeCategory);

  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {!dbLoaded ? (
        <div className="w-full flex items-center justify-center" style={{ height: "100%" }}>
          <p className="text-white/40 text-sm">Загрузка...</p>
        </div>
      ) : filtered.length > 0 ? filtered.map((video, i) => (
        <div key={`${video.id}-${i}`} className="w-full snap-start" style={{ height: "100%" }}>
          <VideoCard video={video} isActive={activeIndex === i} />
        </div>
      )) : (
        <div className="w-full flex flex-col items-center justify-center gap-3" style={{ height: "100%" }}>
          <p className="text-white/40 text-sm">Видео пока нет</p>
          <p className="text-white/20 text-xs">Нажми + чтобы загрузить первое</p>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;