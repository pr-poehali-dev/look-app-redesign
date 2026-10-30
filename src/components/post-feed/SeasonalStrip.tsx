import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import { Post } from "./PostFeedTypes";
import { SeasonalTopic, getSeasonalTopics } from "@/lib/seasonal";

export const matchesTopic = (p: Post, t: SeasonalTopic) => {
  const hay = [p.caption, p.cardTitle, p.category, p.topic, ...(p.hashtags || [])].join(" ").toLowerCase();
  return t.keywords.some((k) => hay.includes(k));
};

interface Props {
  posts: Post[];
  activeId: string | null;
  onChange: (id: string | null) => void;
}

const SeasonalStrip = ({ posts, activeId, onChange }: Props) => {
  const [topics, setTopics] = useState<SeasonalTopic[]>([]);
  useEffect(() => { setTopics(getSeasonalTopics(new Date())); }, []);
  const withCounts = topics.map((t) => ({ t, n: posts.filter((p) => matchesTopic(p, t)).length })).filter((x) => x.n > 0);
  if (withCounts.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <Icon name="Flame" size={15} className="text-[#FF5A3C]" />
        <span className="text-white text-sm font-bold">Сейчас в теме</span>
      </div>
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {withCounts.map(({ t, n }) => (
          <button
            key={t.id}
            onClick={() => onChange(activeId === t.id ? null : t.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
              activeId === t.id ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/5 border-white/10 text-white/80"
            }`}
          >
            <Icon name={t.icon} fallback="Sparkles" size={13} />
            {t.label}
            <span className={activeId === t.id ? "text-white/80" : "text-white/40"}>{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SeasonalStrip;
