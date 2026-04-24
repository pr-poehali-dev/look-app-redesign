import { useRef, useState, useEffect } from "react";
import VideoCard, { VideoData } from "./VideoCard";

const VIDEOS: VideoData[] = [
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
  },
];

interface VideoFeedProps {
  activeTab: string;
}

const VideoFeed = ({ activeTab }: VideoFeedProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      const index = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(index);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {VIDEOS.map((video, i) => (
        <div key={video.id} className="w-full snap-start" style={{ height: "100%" }}>
          <VideoCard video={video} isActive={activeIndex === i} />
        </div>
      ))}
    </div>
  );
};

export default VideoFeed;
