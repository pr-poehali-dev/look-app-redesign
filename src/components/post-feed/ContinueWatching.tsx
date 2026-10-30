import Icon from "@/components/ui/icon";
import { useWatchHistory } from "@/hooks/useWatchHistory";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const ContinueWatching = () => {
  const history = useWatchHistory();
  const fresh = history.filter((w) => Date.now() - w.at < WEEK_MS);
  if (fresh.length === 0) return null;
  const unfinished = fresh.filter((w) => w.progress > 0.03 && w.progress < 0.95);
  const finished = fresh.filter((w) => !unfinished.includes(w));
  const list = [...unfinished, ...finished].slice(0, 10);

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <Icon name="History" size={15} className="text-[#FF5A3C]" />
        <span className="text-white text-sm font-bold">{unfinished.length > 0 ? "Продолжить смотреть" : "Смотрел на этой неделе"}</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {list.map((w) => {
          const done = !unfinished.includes(w);
          return (
            <button
              key={String(w.id)}
              onClick={() => { window.location.href = `/?post=${w.id}`; }}
              className="relative flex-shrink-0 w-24 aspect-[3/4] rounded-xl overflow-hidden bg-white/10 active:opacity-80"
            >
              {w.thumbnail ? (
                <img src={w.thumbnail} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <video src={`${w.image}#t=0.001`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1.5">
                <span className="block text-white text-[10px] font-semibold truncate text-left">{w.title || w.handle}</span>
              </div>
              {!done && (
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/30">
                  <div className="h-full bg-[#FF5A3C]" style={{ width: `${Math.round(w.progress * 100)}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ContinueWatching;
