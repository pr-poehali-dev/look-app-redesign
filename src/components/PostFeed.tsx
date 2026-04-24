import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";

interface Post {
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

const MOCK_POSTS: Post[] = [
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

const GET_PHOTOS_URL = "https://functions.poehali.dev/f58115ec-de09-405d-a2db-08fe1cd958e1";

const formatLikes = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(1).replace(".0", "") + "K" : String(n);

const PostCard = ({ post }: { post: Post }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [expanded, setExpanded] = useState(false);

  const handleLike = () => {
    setLiked((v) => !v);
    setLikes((v) => (liked ? v - 1 : v + 1));
  };

  return (
    <div className="bg-black border-b border-white/8">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-[#fe2c55] ring-offset-1 ring-offset-black">
            <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold text-sm">{post.handle}</span>
              <Icon name="BadgeCheck" size={13} className="text-[#61d4f0]" />
            </div>
            {post.location && (
              <span className="text-white/40 text-xs">{post.location}</span>
            )}
          </div>
        </div>
        <button>
          <Icon name="MoreHorizontal" size={20} className="text-white/60" />
        </button>
      </div>

      <div className="relative w-full aspect-square overflow-hidden">
        <img src={post.image} alt={post.caption} className="w-full h-full object-cover" />
      </div>

      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="flex items-center gap-1.5">
            <Icon
              name="Heart"
              size={24}
              className={`transition-all duration-200 ${liked ? "text-[#fe2c55] fill-[#fe2c55] scale-110" : "text-white"}`}
            />
          </button>
          <button className="flex items-center gap-1.5">
            <Icon name="MessageCircle" size={24} className="text-white" />
          </button>
          <button>
            <Icon name="Send" size={22} className="text-white" />
          </button>
        </div>
        <button onClick={() => setSaved((v) => !v)}>
          <Icon
            name="Bookmark"
            size={24}
            className={`transition-colors duration-200 ${saved ? "text-white fill-white" : "text-white"}`}
          />
        </button>
      </div>

      <div className="px-3 pb-1">
        <span className="text-white font-semibold text-sm">{formatLikes(likes)} отметок «Нравится»</span>
      </div>

      <div className="px-3 pb-2">
        <span className="text-white font-semibold text-sm mr-2">{post.handle}</span>
        <span className="text-white/80 text-sm">
          {expanded ? post.caption : post.caption.slice(0, 80) + (post.caption.length > 80 ? "..." : "")}
        </span>
        {post.caption.length > 80 && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-white/40 text-sm ml-1">ещё</button>
        )}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {post.hashtags.map((tag) => (
          <span key={tag} className="text-[#61d4f0] text-xs font-medium">#{tag}</span>
        ))}
      </div>

      {post.comments > 0 && (
        <div className="px-3 pb-2">
          <button className="text-white/40 text-xs">
            Посмотреть все {post.comments} комментариев
          </button>
        </div>
      )}

      <div className="px-3 pb-3">
        <span className="text-white/30 text-xs uppercase tracking-wide">{post.time}</span>
      </div>
    </div>
  );
};

const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch(`${GET_PHOTOS_URL}?type=image`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbPosts: Post[] = (data.videos || []).map((v: any) => ({
          id: v.id,
          author: v.author || "Пользователь",
          handle: v.handle || "user",
          avatar: user?.avatar || `https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg`,
          image: v.url,
          caption: v.description || "Фото",
          hashtags: [],
          likes: parseInt(v.likes) || 0,
          comments: parseInt(v.comments) || 0,
          time: "недавно",
        }));
        setPosts([...dbPosts, ...MOCK_POSTS]);
      })
      .catch(() => setPosts(MOCK_POSTS))
      .finally(() => setLoading(false));
  }, [user]);

  const storyUsers = posts.slice(0, 6);

  return (
    <div className="h-full overflow-y-scroll bg-black" style={{ scrollbarWidth: "none" }}>
      <div className="flex gap-3 px-3 py-3 overflow-x-scroll border-b border-white/8" style={{ scrollbarWidth: "none" }}>
        {storyUsers.map((post) => (
          <div key={post.id} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#fe2c55] via-[#ff9800] to-[#61d4f0]">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img src={post.avatar} alt={post.handle} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-white/70 text-[10px] w-14 text-center truncate">{post.handle}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      )}

      <div className="pb-24" />
    </div>
  );
};

export default PostFeed;
