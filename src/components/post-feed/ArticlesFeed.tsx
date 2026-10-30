import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useArticles } from "@/hooks/useArticles";
import ArticleCard from "@/components/post-feed/ArticleCard";
import { Reader } from "@/components/profile/ArticlesScreen";

const ArticlesFeed = ({ topPad }: { topPad: number }) => {
  const { articles, loading } = useArticles("feed");
  const [openedId, setOpenedId] = useState<number | null>(null);

  return (
    <div className="h-full overflow-y-scroll" style={{ scrollbarWidth: "none" }}>
      <div className="md:max-w-[620px] md:mx-auto px-3 pb-24" style={{ paddingTop: topPad + 8 }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FF5A3C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-center">
            <Icon name="FileText" size={48} className="text-white/30" />
            <p className="text-white/50 text-sm">Пока никто не опубликовал статьи. Напиши первую в профиле, раздел «Статьи».</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {articles.map((a) => (
              <ArticleCard key={a.id} a={a} onOpen={() => setOpenedId(a.id)} />
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
