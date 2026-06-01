import { useRef, useState, useEffect } from "react";
import VideoCard, { VideoData } from "./VideoCard";
import Icon from "@/components/ui/icon";
import { useUserMedia } from "@/context/UserMediaContext";
import { useAuth } from "@/context/AuthContext";
import { useBulkCounts } from "@/hooks/useBulkCounts";
import { useFollowingList } from "@/hooks/useFollowing";

export const CATEGORIES = [
  { id: "new", label: "Новые" },
  { id: "all", label: "Все" },
  { id: "subs", label: "Подписки" },
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
  initialVideoId?: number;
  onCloseInitial?: () => void;
}

const GET_VIDEOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

const VideoFeed = ({ activeTab, activeCategory = "all", initialVideoId, onCloseInitial }: VideoFeedProps) => {
  void activeTab;
  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dbVideos, setDbVideos] = useState<(VideoData & { category: string })[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  const { userVideos, mediaVersion } = useUserMedia();
  const { user } = useAuth();
  const followingHandles = useFollowingList();

  const userVideoData: (VideoData & { category: string })[] = userVideos
    .filter(v => v.type === "video")
    .map(v => {
      const tagsArr = (v.hashtags || "")
        .split(/[\s,]+/)
        .map(t => t.trim().replace(/^#+/, ""))
        .filter(Boolean);
      const tagsText = tagsArr.length ? " " + tagsArr.map(t => `#${t}`).join(" ") : "";
      const baseDesc = (v.description || "").trim();
      const fullDesc = (baseDesc + tagsText).trim() || "";
      return {
        id: v.id + 10000,
        dbId: v.id,
        image: v.url,
        thumbnail: v.thumbnail || undefined,
        isVideo: true,
        author: v.author || user?.name || "Я",
        handle: v.handle || user?.handle || "user",
        description: fullDesc,
        song: "Оригинальный звук",
        likes: v.likes || "0",
        comments: v.comments || "0",
        shares: v.shares || "0",
        category: "all",
        avatar: user?.avatar || "",
      };
    });

  useEffect(() => {
    setDbLoaded(false);
    const isSubsCategory = activeCategory === "subs";
    const isNewCategory = activeCategory === "new";
    const url = activeCategory && activeCategory !== "all" && !isSubsCategory && !isNewCategory
      ? `${GET_VIDEOS_URL}?type=video&category=${activeCategory}`
      : `${GET_VIDEOS_URL}?type=video&t=${mediaVersion}`;
    fetch(url)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setDbVideos((data.videos || []).map((v: any) => {
          const baseDesc = (v.description || "").trim();
          const tagsArr = (v.hashtags || "")
            .split(/[\s,]+/)
            .map((t: string) => t.trim().replace(/^#+/, ""))
            .filter(Boolean);
          // Если хэштеги уже встречаются в описании — не дублируем
          const hasTagsInDesc = /#\S+/.test(baseDesc);
          const tagsText = !hasTagsInDesc && tagsArr.length
            ? (baseDesc ? " " : "") + tagsArr.map((t: string) => `#${t}`).join(" ")
            : "";
          const fullDesc = (baseDesc + tagsText).trim();
          return ({
          id: v.id + 10000,
          dbId: v.id,
          image: v.url,
          thumbnail: v.thumbnail || undefined,
          isVideo: v.type === 'video',
          author: v.author || "Автор",
          handle: v.handle || "user",
          description: fullDesc,
          song: "Look — Original Sound",
          likes: v.likes || "0",
          comments: v.comments || "0",
          shares: v.shares || "0",
          category: v.category || "all",
          avatar: v.avatar || "",
        });
        }));
        setActiveIndex(0);
        if (containerRef.current) containerRef.current.scrollTop = 0;
      })
      .catch(e => console.error('VideoFeed fetch error:', e))
      .finally(() => setDbLoaded(true));
  }, [activeCategory, mediaVersion]);

  // Дедупликация: убираем повторы по URL видео, чтобы один ролик не появлялся
  // дважды (например, из локального состояния и из БД одновременно).
  const seenUrls = new Set<string>();
  const allVideos = [...userVideoData, ...dbVideos].filter((v) => {
    const key = v.image;
    if (!key) return true;
    if (seenUrls.has(key)) return false;
    seenUrls.add(key);
    return true;
  });
  const filtered =
    activeCategory === "all"
      ? allVideos
      : activeCategory === "new"
        ? [...allVideos].sort((a, b) => Number(b.id) - Number(a.id))
        : activeCategory === "subs"
          ? allVideos.filter((v) => followingHandles.includes(v.handle))
          : allVideos.filter((v) => v.category === activeCategory);

  const counts = useBulkCounts("video", filtered.map(v => v.id));
  const formatShort = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : String(n);
  const filteredWithCounts = filtered.map(v => {
    const c = counts.comments[String(v.id)];
    const l = counts.likes[String(v.id)];
    return {
      ...v,
      comments: typeof c === "number" ? formatShort(c) : v.comments,
      likes: typeof l === "number" ? formatShort(l) : v.likes,
    };
  });

  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeCategory]);

  // Если открыли видео из плитки — проматываем к нему.
  // Карточки появляются в DOM только после dbLoaded=true, причём не сразу,
  // поэтому ретраим пока нужный элемент реально не окажется в DOM с высотой.
  useEffect(() => {
    if (!initialVideoId || !dbLoaded) return;
    const idx = filteredWithCounts.findIndex((v) => v.id === initialVideoId);
    if (idx < 0) return;

    let cancelled = false;
    let tries = 0;
    const go = () => {
      if (cancelled) return;
      const el = containerRef.current;
      const target = slideRefs.current[idx];
      if (el && target && el.clientHeight > 0) {
        el.scrollTop = target.offsetTop;
        setActiveIndex(idx);
        return;
      }
      if (tries < 60) {
        tries++;
        requestAnimationFrame(go);
      }
    };
    requestAnimationFrame(go);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialVideoId, dbLoaded, filteredWithCounts.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(index);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollByDir = (dir: 1 | -1) => {
    const c = containerRef.current;
    if (!c) return;
    c.scrollTo({ top: c.scrollTop + dir * c.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0 mx-auto overflow-y-scroll snap-y snap-mandatory md:max-w-[540px]"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {!dbLoaded ? (
          <div className="w-full flex items-center justify-center" style={{ height: "100%" }}>
            <p className="text-white/40 text-sm">Загрузка...</p>
          </div>
        ) : filteredWithCounts.length > 0 ? filteredWithCounts.map((video, i) => {
          const distance = Math.abs(i - activeIndex);
          const preloadLevel: "full" | "meta" | "none" =
            distance === 0 ? "full" : distance === 1 ? "meta" : "none";
          return (
            <div
              key={`${video.id}-${i}`}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="w-full snap-start flex md:items-center md:justify-center"
              style={{ height: "100%" }}
            >
              <div className="w-full md:h-[min(100%,720px)] h-full">
                <VideoCard video={video} isActive={activeIndex === i} preloadLevel={preloadLevel} />
              </div>
            </div>
          );
        }) : (
          <div className="w-full flex flex-col items-center justify-center gap-3" style={{ height: "100%" }}>
            <p className="text-white/40 text-sm">Видео пока нет</p>
            <p className="text-white/20 text-xs">Нажми + чтобы загрузить первое</p>
          </div>
        )}
      </div>

      {/* Desktop nav arrows — справа от центрированной ленты (после колонки кнопок) */}
      <div
        className="hidden md:flex flex-col gap-3 absolute top-1/2 -translate-y-1/2 z-40"
        style={{ left: "calc(50% + 290px)" }}
      >
        <button
          onClick={() => scrollByDir(-1)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          aria-label="Предыдущее"
        >
          <Icon name="ChevronUp" size={22} className="text-white" />
        </button>
        <button
          onClick={() => scrollByDir(1)}
          className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors"
          aria-label="Следующее"
        >
          <Icon name="ChevronDown" size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
};

export default VideoFeed;