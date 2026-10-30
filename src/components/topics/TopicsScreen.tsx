import { useEffect, useState } from "react";
import { BOARDS_API_URL } from "@/hooks/useBoards";
import Icon from "@/components/ui/icon";
import { TOPICS } from "@/lib/topics";
import TopicPage from "./TopicPage";
import BoardCollage from "@/components/post-feed/BoardCollage";
import BoardDetailScreen from "@/components/profile/BoardDetailScreen";
import type { Board } from "@/hooks/useBoards";

const TopicsScreen = ({ onBack, initialSlug }: { onBack: () => void; initialSlug?: string | null }) => {
  const [slug, setSlug] = useState<string | null>(initialSlug ?? null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [inspiration, setInspiration] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${BOARDS_API_URL}?action=topics`)
      .then((r) => r.json())
      .then((raw) => {
        const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        const map: Record<string, number> = {};
        (d.topics || []).forEach((t: { slug: string; posts?: number }) => { map[t.slug] = t.posts || 0; });
        setCounts(map);
      })
      .catch(() => {});
    fetch(`${BOARDS_API_URL}?action=inspiration`)
      .then((r) => r.json())
      .then((raw) => {
        const d = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setInspiration(d.boards || []);
      })
      .catch(() => {});
  }, []);

  if (boardId !== null) return <BoardDetailScreen boardId={boardId} onBack={() => setBoardId(null)} />;
  if (slug) return <TopicPage slug={slug} onBack={() => setSlug(null)} />;

  return (
    <div className="h-full bg-black overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={onBack} className="p-1" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <h2 className="text-white font-bold text-xl">Темы</h2>
      </div>
      {inspiration.length > 0 && (
        <div className="pb-4">
          <h3 className="px-4 pb-2 text-white font-bold text-base flex items-center gap-2"><Icon name="Sparkles" size={16} />Вдохновение: лучшие подборки недели</h3>
          <div className="flex gap-3 px-4 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {inspiration.map((b) => (
              <button key={b.id} onClick={() => setBoardId(b.id)} className="relative w-40 aspect-[4/5] flex-shrink-0 rounded-[20px] overflow-hidden bg-white/10">
                <BoardCollage images={b.collage} cover={b.cover_image} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pt-8 pb-2 text-left">
                  <p className="text-white text-sm font-bold truncate">{b.title}</p>
                  <p className="text-white/70 text-[11px]">{b.items_count ?? 0} постов</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="px-4 pb-3 text-white/50 text-sm">Выберите тему, и мы покажем лучшие идеи, доски и подборки.</p>
      <div className="grid grid-cols-2 gap-3 px-4 pb-28">
        {TOPICS.map((t) => (
          <button
            key={t.slug}
            onClick={() => setSlug(t.slug)}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden text-left p-4 flex flex-col justify-between active:scale-[0.98] transition-transform"
            style={{ background: `linear-gradient(135deg, ${t.color} 0%, ${t.color}99 100%)` }}
          >
            <Icon name={t.icon} fallback="Sparkles" size={28} className="text-white" />
            <span>
              <span className="block text-white font-bold text-base leading-tight drop-shadow">{t.title}</span>
              <span className="block text-white/80 text-xs mt-0.5">{counts[t.slug] ?? 0} постов</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicsScreen;
