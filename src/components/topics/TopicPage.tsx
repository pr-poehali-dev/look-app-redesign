import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { TOPICS } from "@/lib/topics";
import { BOARDS_API_URL, Board } from "@/hooks/useBoards";
import { GET_PHOTOS_URL } from "@/components/post-feed/PostFeedTypes";
import { mapPost } from "@/components/post-feed/mapPost";
import NoteViewer from "@/components/post-feed/NoteViewer";
import type { Post } from "@/components/post-feed/PostFeedTypes";
import { useAuth } from "@/context/AuthContext";
import BoardDetailScreen from "@/components/profile/BoardDetailScreen";

interface TopItem {
  id: number;
  url: string;
  thumbnail: string | null;
  type: string;
  title: string;
  handle: string;
  likes: number;
}

const parse = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

const TopicPage = ({ slug, onBack }: { slug: string; onBack: () => void }) => {
  const { user } = useAuth();
  const topic = TOPICS.find((t) => t.slug === slug);
  const [top, setTop] = useState<TopItem[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [recs, setRecs] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [opened, setOpened] = useState<Post | null>(null);
  const [boardId, setBoardId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const uid = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
    Promise.all([
      fetch(`${BOARDS_API_URL}?action=topic_page&slug=${encodeURIComponent(slug)}`).then(parse),
      fetch(`${GET_PHOTOS_URL}?type=image&ideas=1&topic=${encodeURIComponent(slug)}${uid}`).then(parse),
    ])
      .then(([page, feed]) => {
        if (cancelled) return;
        const topList: TopItem[] = page.top || [];
        const topIds = new Set(topList.map((t) => t.id));
        setTop(topList);
        setBoards(page.boards || []);
        setRecs(((feed.videos || []) as unknown[]).map((v) => mapPost(v, false, user)).filter((p) => !topIds.has(p.id)).slice(0, 12));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, user?.id]);

  const openTop = async (item: TopItem) => {
    const res = await fetch(`${GET_PHOTOS_URL}?id=${item.id}`).then(parse).catch(() => null);
    if (res?.video) setOpened(mapPost(res.video, res.video.type === "video", user));
  };

  if (boardId !== null) return <BoardDetailScreen boardId={boardId} onBack={() => setBoardId(null)} />;

  return (
    <div className="h-full bg-black overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="px-4 pt-14 pb-5" style={{ background: `linear-gradient(180deg, ${topic?.color || "#8b5cf6"}55 0%, transparent 100%)` }}>
        <button onClick={onBack} className="p-1 -ml-1 mb-3" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: topic?.color }}>
            <Icon name={topic?.icon || "Sparkles"} fallback="Sparkles" size={24} className="text-white" />
          </div>
          <h2 className="text-white font-bold text-2xl">{topic?.title || "Тема"}</h2>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="pb-28">
          <h3 className="px-4 pb-2 text-white font-bold text-base">Топ недели</h3>
          {top.length === 0 ? (
            <p className="px-4 pb-4 text-white/40 text-sm">Пока нет публикаций по этой теме. Будьте первым: выберите тему при создании поста.</p>
          ) : (
            <div className="grid grid-cols-3 gap-1 px-4 pb-5">
              {top.map((t, i) => (
                <button key={t.id} onClick={() => openTop(t)} className="relative aspect-square rounded-lg overflow-hidden bg-white/10">
                  <img src={t.thumbnail || t.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1 text-white text-[10px] font-semibold truncate text-left">{t.title}</span>
                </button>
              ))}
            </div>
          )}

          {boards.length > 0 && (
            <>
              <h3 className="px-4 pb-2 text-white font-bold text-base">Новые доски</h3>
              <div className="flex gap-3 px-4 pb-5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {boards.map((b) => (
                  <button key={b.id} onClick={() => setBoardId(b.id)} className="relative w-36 aspect-[4/5] flex-shrink-0 rounded-2xl overflow-hidden bg-white/10">
                    {b.cover_image && <img src={b.cover_image} alt="" loading="lazy" className="w-full h-full object-cover" />}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2.5 pt-8 pb-2 text-left">
                      <p className="text-white text-sm font-bold truncate">{b.title}</p>
                      <p className="text-white/70 text-[11px]">{b.items_count ?? 0} постов</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {recs.length > 0 && (
            <>
              <h3 className="px-4 pb-2 text-white font-bold text-base">Рекомендуем</h3>
              <div className="grid grid-cols-2 gap-2 px-4">
                {recs.map((p) => (
                  <button key={p.id} onClick={() => setOpened(p)} className="relative aspect-[4/5] rounded-xl overflow-hidden bg-white/10 text-left">
                    <img src={p.thumbnail || p.image} alt="" loading="lazy" className="w-full h-full object-cover" />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pt-8 pb-2 text-white text-xs font-semibold line-clamp-2">{p.cardTitle || p.caption}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {opened && <NoteViewer post={opened} onClose={() => setOpened(null)} />}
    </div>
  );
};

export default TopicPage;
