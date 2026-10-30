import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";
import { Article } from "@/hooks/useArticles";
import { Reader } from "@/components/profile/ArticlesScreen";

interface Props {
  articles: Article[];
  loading: boolean;
  emptyText?: string;
  onEdit?: (a: Article) => void;
}

type Filter = "all" | "tutorial" | "article";
type Sort = "new" | "popular";

const UserArticlesList = ({ articles, loading, emptyText = "Пока нет статей", onEdit }: Props) => {
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");

  const tutorialsCount = articles.filter((a) => a.kind === "tutorial").length;
  const articlesCount = articles.length - tutorialsCount;

  const visible = useMemo(() => {
    const list = articles.filter((a) => filter === "all" || (filter === "tutorial" ? a.kind === "tutorial" : a.kind !== "tutorial"));
    return [...list].sort((a, b) =>
      sort === "popular"
        ? (b.views || 0) - (a.views || 0)
        : new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  }, [articles, filter, sort]);

  if (openId !== null) {
    return (
      <div className="fixed inset-0 z-[70] bg-white">
        <Reader id={openId} onBack={() => setOpenId(null)} onEdit={(a) => { setOpenId(null); onEdit?.(a); }} />
      </div>
    );
  }

  if (loading && articles.length === 0) {
    return (
      <div className="flex justify-center py-16 bg-white">
        <div className="w-7 h-7 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white">
        <Icon name="FileText" size={44} className="text-gray-300" />
        <p className="text-gray-400 text-sm">{emptyText}</p>
      </div>
    );
  }

  const chips: { id: Filter; label: string; count: number }[] = [
    { id: "all", label: "Все", count: articles.length },
    { id: "tutorial", label: "Туториалы", count: tutorialsCount },
    { id: "article", label: "Статьи", count: articlesCount },
  ];

  return (
    <div className="bg-white px-3 py-3 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilter(c.id)}
              disabled={c.count === 0 && c.id !== "all"}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold disabled:opacity-40 ${
                filter === c.id ? "bg-[#FF5A3C] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {c.label} · {c.count}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSort(sort === "new" ? "popular" : "new")}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold"
        >
          <Icon name={sort === "new" ? "Clock" : "Flame"} size={13} />
          {sort === "new" ? "Новые" : "Популярные"}
        </button>
      </div>

      {visible.map((a) => (
        <button
          key={a.id}
          onClick={() => setOpenId(a.id)}
          className="w-full text-left rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm"
        >
          {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-36 object-cover" loading="lazy" />}
          <div className="p-3 flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${a.kind === "tutorial" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {a.kind === "tutorial" ? "Туториал" : "Статья"}
              </span>
            </div>
            <p className="text-black font-bold text-base leading-snug line-clamp-2">{a.title}</p>
            <p className="text-gray-400 text-[11px]">
              {a.kind === "tutorial" ? `${a.steps_count || 0} шагов` : `${a.read_minutes} мин`} · {a.views} просм.
            </p>
          </div>
        </button>
      ))}
    </div>
  );
};

export default UserArticlesList;
