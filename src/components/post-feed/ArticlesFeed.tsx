import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useArticles } from "@/hooks/useArticles";
import { Reader } from "@/components/profile/ArticlesScreen";

const ArticlesFeed = ({ topPad }: { topPad: number }) => {
  const { articles, loading } = useArticles("feed");
  const [openedId, setOpenedId] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-[620px] md:mx-auto px-3 pb-24" style={{ paddingTop: topPad + 8 }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#fe2c55] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Icon name="FileText" size={48} className="text-white/30" />
            <p className="text-white/50 text-sm">Пока никто не опубликовал статьи. Напиши первую в профиле, раздел «Статьи».</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {articles.map((a) => (
              <button key={a.id} onClick={() => setOpenedId(a.id)} className="text-left rounded-2xl overflow-hidden bg-white/5 border border-white/10">
                {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-44 object-cover" loading="lazy" />}
                <div className="p-3 flex flex-col gap-1">
                  <p className="text-white font-bold text-base leading-snug line-clamp-2">{a.title}</p>
                  <p className="text-white/60 text-sm line-clamp-2">{a.body}</p>
                  <p className="text-white/40 text-[11px] pt-1">{a.author_name} · {a.read_minutes} мин · {a.views} просм.</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {openedId !== null && (
        <div className="fixed inset-0 z-[150] bg-white">
          <Reader id={openedId} onBack={() => setOpenedId(null)} onEdit={() => setOpenedId(null)} />
        </div>
      )}
    </div>
  );
};

export default ArticlesFeed;
