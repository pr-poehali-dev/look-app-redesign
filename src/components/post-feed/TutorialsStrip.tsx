import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useArticles } from "@/hooks/useArticles";
import { Reader } from "@/components/profile/ArticlesScreen";

const TutorialsStrip = () => {
  const { articles } = useArticles("feed");
  const [openedId, setOpenedId] = useState<number | null>(null);
  const tutorials = articles.filter((a) => a.kind === "tutorial");
  if (tutorials.length === 0) return null;

  return (
    <div className="pb-2">
      <p className="text-white font-bold text-sm px-1 pb-2 flex items-center gap-1.5">
        <Icon name="ListChecks" size={16} className="text-white" />
        Туториалы
      </p>
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tutorials.map((a) => (
          <button
            key={a.id}
            onClick={() => setOpenedId(a.id)}
            className="flex-shrink-0 w-44 rounded-2xl overflow-hidden bg-white/5 border border-white/10 text-left active:scale-95 transition-transform"
          >
            {a.cover_image && <img src={a.cover_image} alt="" className="w-full h-24 object-cover" loading="lazy" />}
            <div className="p-2">
              <p className="text-white text-xs font-semibold leading-snug line-clamp-2">{a.title}</p>
              <p className="text-white/40 text-[10px] pt-1">{a.steps_count || 0} шагов · {a.author_name}</p>
            </div>
          </button>
        ))}
      </div>
      {openedId !== null && (
        <div className="fixed inset-0 z-[150] bg-white">
          <Reader id={openedId} onBack={() => setOpenedId(null)} onEdit={() => setOpenedId(null)} />
        </div>
      )}
    </div>
  );
};

export default TutorialsStrip;
