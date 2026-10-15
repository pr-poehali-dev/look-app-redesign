import Icon from "@/components/ui/icon";

interface Props {
  handle: string;
  seriesTitle?: string | null;
  brand?: string | null;
  personalExperience?: boolean;
  tone?: "dark" | "soft";
}

const StoryTags = ({ handle, seriesTitle, brand, personalExperience, tone = "dark" }: Props) => {
  if (!seriesTitle && !brand && !personalExperience) return null;
  const base = tone === "dark"
    ? "bg-white/15 text-white"
    : "bg-white/10 text-white/80";
  const chip = `flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${base}`;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-2">
      {personalExperience && (
        <span className={chip}>
          <Icon name="Heart" size={11} />
          Личный опыт
        </span>
      )}
      {brand && (
        <button
          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("open-brand", { detail: { brand } })); }}
          className={`${chip} active:scale-95 transition-transform`}
        >
          <Icon name="Tag" size={11} />
          {brand}
        </button>
      )}
      {seriesTitle && (
        <button
          onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("open-series", { detail: { series: seriesTitle, owner: handle } })); }}
          className={`${chip} active:scale-95 transition-transform max-w-[200px]`}
        >
          <Icon name="Layers" size={11} />
          <span className="truncate">Серия: {seriesTitle}</span>
        </button>
      )}
    </div>
  );
};

export default StoryTags;
