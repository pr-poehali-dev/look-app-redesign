import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "@/components/ui/icon";
import { useAuth } from "@/context/AuthContext";
import { useUserMedia } from "@/context/UserMediaContext";

interface Story {
  id: number;
  handle: string;
  avatar: string;
  image: string;
}

const StoryViewer = ({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) => {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const DURATION = 5000;

  const startProgress = () => {
    setProgress(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(intervalRef.current!);
        setIndex(i => {
          if (i + 1 < stories.length) return i + 1;
          onClose();
          return i;
        });
      }
    }, 30);
  };

  useEffect(() => {
    startProgress();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [index]);

  const story = stories[index];

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col" onClick={(e) => {
      const x = (e as React.MouseEvent).clientX;
      if (x < window.innerWidth / 2) {
        setIndex(i => Math.max(0, i - 1));
      } else {
        if (index + 1 < stories.length) setIndex(i => i + 1);
        else onClose();
      }
    }}>
      {/* Progress bars */}
      <div className="flex gap-1 px-2 pt-12 pb-2 z-10">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{ width: i < index ? "100%" : i === index ? `${progress}%` : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 px-3 pb-3 z-10">
        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/40">
          <img src={story.avatar} className="w-full h-full object-cover" />
        </div>
        <span className="text-white font-semibold text-sm">{story.handle}</span>
        <span className="text-white/40 text-xs">сейчас</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="ml-auto">
          <Icon name="X" size={22} className="text-white" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative">
        <img src={story.image} className="absolute inset-0 w-full h-full object-cover" />
      </div>
    </div>,
    document.body
  );
};

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

const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return "недавно";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} д назад`;
  return `${Math.floor(diff / 2592000)} мес назад`;
};

const MOCK_COMMENTS = [
  { id: 1, name: "anya_dance", text: "🔥 Просто огонь!", time: "1 мин" },
  { id: 2, name: "max_parkour", text: "Лучшее что я видел сегодня 😂", time: "3 мин" },
  { id: 3, name: "cozy_coffee", text: "Подписалась сразу!", time: "5 мин" },
  { id: 4, name: "travel_rus", text: "Продолжай в том же духе 👏", time: "12 мин" },
];

const PostCard = ({ post }: { post: Post }) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likes, setLikes] = useState(post.likes);
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [extraComments, setExtraComments] = useState<typeof MOCK_COMMENTS>([]);
  const [copied, setCopied] = useState(false);

  const allComments = [...extraComments, ...MOCK_COMMENTS];

  const handleLike = () => {
    setLiked((v) => !v);
    setLikes((v) => (liked ? v - 1 : v + 1));
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    setExtraComments(prev => [{ id: Date.now(), name: "Я", text: commentText.trim(), time: "сейчас" }, ...prev]);
    setCommentText("");
  };

  return (
    <div className="bg-black border-b border-white/8">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
              <img src={post.avatar} alt={post.author} className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-white font-semibold text-[13px]">{post.handle}</span>
              <Icon name="BadgeCheck" size={12} className="text-[#61d4f0]" />
            </div>
            {post.location && (
              <span className="text-white/40 text-[11px]">{post.location}</span>
            )}
          </div>
        </div>
        <button className="p-1" onClick={() => setShowMenu(true)}>
          <Icon name="MoreHorizontal" size={20} className="text-white" />
        </button>
      </div>

      {/* Photo */}
      <div className="w-full aspect-square overflow-hidden">
        <img src={post.image} alt={post.caption} className="w-full h-full object-cover" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-4">
          <button onClick={handleLike} className="active:scale-90 transition-transform">
            <Icon
              name="Heart"
              size={26}
              className={`transition-all duration-150 ${liked ? "text-[#fe2c55] fill-[#fe2c55]" : "text-white"}`}
            />
          </button>
          <button onClick={() => setShowComments(true)} className="active:scale-90 transition-transform">
            <Icon name="MessageCircle" size={26} className="text-white" />
          </button>
          <button onClick={() => setShowShare(true)} className="active:scale-90 transition-transform">
            <Icon name="Send" size={24} className="text-white" style={{ transform: "rotate(-20deg)" }} />
          </button>
        </div>
        <button onClick={() => setSaved(v => !v)} className="active:scale-90 transition-transform">
          <Icon
            name="Bookmark"
            size={26}
            className={`transition-all duration-150 ${saved ? "text-white fill-white" : "text-white"}`}
          />
        </button>
      </div>

      {/* Likes count */}
      <div className="px-3 pb-1">
        <span className="text-white font-semibold text-[13px]">{formatLikes(likes)} отметок «Нравится»</span>
      </div>

      {/* Caption */}
      <div className="px-3 pb-1">
        <span className="text-white font-semibold text-[13px] mr-1.5">{post.handle}</span>
        <span className="text-white text-[13px]">
          {expanded ? post.caption : post.caption.slice(0, 90) + (post.caption.length > 90 ? "…" : "")}
        </span>
        {post.caption.length > 90 && !expanded && (
          <button onClick={() => setExpanded(true)} className="text-white/40 text-[13px] ml-1">ещё</button>
        )}
      </div>

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-x-1">
          {post.hashtags.map(tag => (
            <span key={tag} className="text-[#00a2ff] text-[13px]">#{tag}</span>
          ))}
        </div>
      )}

      {/* View comments */}
      {post.comments > 0 && (
        <button onClick={() => setShowComments(true)} className="px-3 pb-1 block">
          <span className="text-white/40 text-[13px]">Посмотреть все комментарии ({post.comments})</span>
        </button>
      )}

      {/* Time */}
      <div className="px-3 pb-3 pt-0.5">
        <span className="text-white/30 text-[11px] uppercase tracking-wide">{post.time}</span>
      </div>

      {/* Menu popup */}
      {showMenu && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end" onClick={() => setShowMenu(false)}>
          <div className="bg-zinc-900 rounded-t-3xl overflow-hidden pb-8" onClick={e => e.stopPropagation()}>
            {[
              { icon: "Bookmark", label: saved ? "Убрать из сохранённых" : "Сохранить", action: () => { setSaved(v => !v); setShowMenu(false); } },
              { icon: "UserMinus", label: "Отписаться", action: () => setShowMenu(false) },
              { icon: "BellOff", label: "Выключить уведомления", action: () => setShowMenu(false) },
              { icon: "Link", label: "Скопировать ссылку", action: () => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setShowMenu(false); } },
              { icon: "Share2", label: "Поделиться", action: () => { setShowMenu(false); setShowShare(true); } },
              { icon: "Flag", label: "Пожаловаться", action: () => setShowMenu(false) },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="w-full flex items-center gap-4 px-6 py-4 border-b border-white/5 last:border-0 active:bg-white/5"
              >
                <Icon name={item.icon} size={20} className={item.icon === "Flag" ? "text-[#fe2c55]" : "text-white"} />
                <span className={`text-sm font-medium ${item.icon === "Flag" ? "text-[#fe2c55]" : "text-white"}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* Comments popup */}
      {showComments && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end" onPointerDown={() => setShowComments(false)}>
          <div className="bg-zinc-900 rounded-t-3xl flex flex-col max-h-[70%]" onPointerDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
              <span className="text-white font-bold text-base">{allComments.length} комментариев</span>
              <button onPointerDown={() => setShowComments(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4" style={{ scrollbarWidth: "none" }}>
              {allComments.map(c => (
                <div key={c.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#fe2c55] to-[#8b5cf6] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{c.name[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-semibold text-sm mr-2">{c.name}</span>
                    <span className="text-white/80 text-sm">{c.text}</span>
                    <div className="text-white/30 text-xs mt-1">{c.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 border-t border-white/10 pb-8">
              <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 py-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Написать комментарий..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
                  onKeyDown={e => e.key === "Enter" && handleSendComment()}
                />
              </div>
              <button onClick={handleSendComment} className="w-9 h-9 rounded-full bg-[#fe2c55] flex items-center justify-center flex-shrink-0">
                <Icon name="Send" size={16} className="text-white" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Share popup */}
      {showShare && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end" onClick={() => setShowShare(false)}>
          <div className="bg-zinc-900 rounded-t-3xl px-4 pt-5 pb-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-white font-bold text-base">Поделиться</span>
              <button onClick={() => setShowShare(false)}>
                <Icon name="X" size={20} className="text-white/60" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { icon: "MessageCircle", label: "Telegram", color: "#229ED9", href: `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(`@${post.handle}: ${post.caption}`)}` },
                { icon: "Send", label: "WhatsApp", color: "#25D366", href: `https://wa.me/?text=${encodeURIComponent(`@${post.handle}: ${post.caption}\n${window.location.href}`)}` },
                { icon: "Share2", label: "VK", color: "#0077FF", href: `https://vk.com/share.php?url=${encodeURIComponent(window.location.href)}` },
                { icon: "Mail", label: "Email", color: "#fe2c55", href: `mailto:?subject=${encodeURIComponent(`@${post.handle}`)}&body=${encodeURIComponent(`${post.caption}\n${window.location.href}`)}` },
              ].map(opt => (
                <a key={opt.label} href={opt.href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2" onClick={() => setShowShare(false)}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: opt.color + "22", border: `1.5px solid ${opt.color}55` }}>
                    <Icon name={opt.icon} size={24} style={{ color: opt.color }} />
                  </div>
                  <span className="text-white/70 text-xs">{opt.label}</span>
                </a>
              ))}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href).catch(() => {}); setCopied(true); setTimeout(() => { setCopied(false); setShowShare(false); }, 1500); }}
              className="w-full flex items-center gap-3 bg-white/8 rounded-2xl px-4 py-3"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <Icon name={copied ? "Check" : "Link"} size={20} className={copied ? "text-green-400" : "text-white"} />
              </div>
              <span className="text-white text-sm font-medium">{copied ? "Скопировано!" : "Скопировать ссылку"}</span>
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const PostFeed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addMedia } = useUserMedia();
  const myStoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${GET_PHOTOS_URL}?type=image`)
      .then(r => r.json())
      .then(raw => {
        const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dbPosts: Post[] = (data.videos || []).map((v: any) => {
          const desc: string = v.description || "";
          const tags = (desc.match(/#\S+/g) || []).map((t: string) => t.slice(1));
          const caption = desc.replace(/#\S+/g, "").trim() || "Фото";
          return {
            id: v.id,
            author: v.author || "Пользователь",
            handle: v.handle || "user",
            avatar: user?.avatar || `https://cdn.poehali.dev/projects/82eb0b6d-91ae-4d3d-a0a1-a53fb8c6e823/files/48f38c64-742e-458c-9f09-0013a0813b5f.jpg`,
            image: v.url,
            caption,
            hashtags: tags,
            likes: parseInt(v.likes) || 0,
            comments: parseInt(v.comments) || 0,
            time: formatTime(v.created_at),
          };
        });
        setPosts([...dbPosts, ...MOCK_POSTS]);
      })
      .catch(() => setPosts(MOCK_POSTS))
      .finally(() => setLoading(false));
  }, [user]);

  const [storyIndex, setStoryIndex] = useState<number | null>(null);

  const storySource = posts.length > 0 ? posts : MOCK_POSTS;
  const storyUsers = storySource.slice(0, 6);
  const stories: Story[] = storyUsers.map(p => ({ id: p.id, handle: p.handle, avatar: p.avatar, image: p.image }));

  return (
    <div className="h-full overflow-y-scroll bg-black" style={{ scrollbarWidth: "none" }}>
      {/* Story viewer */}
      {storyIndex !== null && (
        <StoryViewer stories={stories} startIndex={storyIndex} onClose={() => setStoryIndex(null)} />
      )}

      {/* Stories row */}
      <div className="flex gap-4 px-3 py-3 overflow-x-scroll border-b border-white/8" style={{ scrollbarWidth: "none" }}>
        {/* "Your story" first */}
        <input
          ref={myStoryInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) addMedia(file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => myStoryInputRef.current?.click()}
          className="flex flex-col items-center gap-1 flex-shrink-0"
          style={{ touchAction: "manipulation" }}
        >
          <div className="w-[62px] h-[62px] rounded-full border-2 border-white/20 flex items-center justify-center relative overflow-hidden">
            {user?.avatar
              ? <img src={user.avatar} className="w-full h-full object-cover opacity-70" />
              : <div className="w-full h-full bg-white/10" />
            }
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#0095f6] rounded-full flex items-center justify-center border-2 border-black">
              <Icon name="Plus" size={11} className="text-white" />
            </div>
          </div>
          <span className="text-white/80 text-[10px] w-16 text-center truncate">Ваша история</span>
        </button>
        {storyUsers.map((post, i) => (
          <button key={post.id} onClick={() => setStoryIndex(i)} className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-[62px] h-[62px] rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                <img src={post.avatar} alt={post.handle} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-white/80 text-[10px] w-16 text-center truncate">{post.handle}</span>
          </button>
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