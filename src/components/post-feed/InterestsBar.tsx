import Icon from "@/components/ui/icon";
import { TOPICS } from "@/lib/topics";

interface Props {
  selected: string[];
  onChange: (next: string[]) => void;
  empty?: boolean;
}

const InterestsBar = ({ selected, onChange, empty }: Props) => {
  const toggle = (slug: string) =>
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="flex items-center gap-1.5">
          <Icon name="Heart" size={15} className="text-[#FF5A3C]" />
          <span className="text-white text-sm font-bold">Мои темы</span>
        </div>
        {selected.length > 0 && (
          <button onClick={() => onChange([])} className="text-white/50 text-xs font-semibold">Сбросить</button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TOPICS.map((t) => {
          const on = selected.includes(t.slug);
          return (
            <button
              key={t.slug}
              onClick={() => toggle(t.slug)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                on ? "bg-[#FF5A3C] border-[#FF5A3C] text-white" : "bg-white/5 border-white/10 text-white/80"
              }`}
            >
              {t.title}
            </button>
          );
        })}
      </div>
      {empty && <p className="text-white/50 text-xs px-1 mt-2">По выбранным темам пока нет постов, показываю всё</p>}
    </div>
  );
};

export default InterestsBar;
