import { useMemo, useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import type { Post } from "./PostFeedTypes";

const DAY = 24 * 60 * 60 * 1000;

const score = (p: Post) => (p.saves || 0) * 10 + p.comments * 3 + p.likes;

const BestOfWeek = ({ posts }: { posts: Post[] }) => {
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);

  const { list, days } = useMemo(() => {
    if (!now) return { list: [] as Post[], days: 7 };
    const pick = (d: number) =>
      posts
        .filter((p) => !p.isText && !!p.createdAt && now - (p.createdAt as number) < d * DAY && score(p) > 0)
        .sort((a, b) => score(b) - score(a))
        .slice(0, 10);
    const week = pick(7);
    if (week.length >= 3) return { list: week, days: 7 };
    return { list: pick(30), days: 30 };
  }, [posts, now]);

  if (list.length < 3) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <Icon name="Trophy" size={15} className="text-[#FF5A3C]" />
        <span className="text-white text-sm font-bold">{days === 7 ? "Лучшее за неделю" : "Лучшее за месяц"}</span>
        <span className="text-white/40 text-[11px]">по сохранениям</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {list.map((p, i) => (
          <button
            key={String(p.id)}
            onClick={() => { window.location.href = `/?post=${p.id}`; }}
            className="relative flex-shrink-0 w-28 aspect-[3/4] rounded-xl overflow-hidden bg-white/10 active:opacity-80"
          >
            {p.isVideo && !p.thumbnail ? (
              <video src={`${p.image}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
            ) : (
              <img src={p.thumbnail || p.image} alt="" loading="lazy" className="w-full h-full object-cover" />
            )}
            <span className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[#FF5A3C] text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-6 pb-1.5 text-left">
              <span className="block text-white text-[10px] font-semibold truncate">{p.caption}</span>
              <span className="flex items-center gap-0.5 text-white/70 text-[10px]"><Icon name="Bookmark" size={10} />{p.saves || 0}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default BestOfWeek;
