import { useState } from "react";
import Icon from "@/components/ui/icon";
import { TOPICS } from "@/lib/topics";
import TopicPage from "./TopicPage";

const TopicsScreen = ({ onBack, initialSlug }: { onBack: () => void; initialSlug?: string | null }) => {
  const [slug, setSlug] = useState<string | null>(initialSlug ?? null);

  if (slug) return <TopicPage slug={slug} onBack={() => setSlug(null)} />;

  return (
    <div className="h-full bg-black overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      <div className="flex items-center gap-3 px-4 pt-14 pb-4">
        <button onClick={onBack} className="p-1" aria-label="Назад"><Icon name="ArrowLeft" size={22} className="text-white" /></button>
        <h2 className="text-white font-bold text-xl">Темы</h2>
      </div>
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
            <span className="text-white font-bold text-base leading-tight drop-shadow">{t.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicsScreen;
