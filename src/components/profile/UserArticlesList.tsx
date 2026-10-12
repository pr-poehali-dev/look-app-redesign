import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Article } from "@/hooks/useArticles";
import { Reader } from "@/components/profile/ArticlesScreen";

interface Props {
  articles: Article[];
  loading: boolean;
  emptyText?: string;
  onEdit?: (a: Article) => void;
}

const UserArticlesList = ({ articles, loading, emptyText = "Пока нет статей", onEdit }: Props) => {
  const [openId, setOpenId] = useState<number | null>(null);

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

  return (
    <div className="bg-white px-3 py-3 flex flex-col gap-3">
      {articles.map((a) => (
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
