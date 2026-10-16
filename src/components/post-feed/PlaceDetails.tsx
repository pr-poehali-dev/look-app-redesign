import Icon from "@/components/ui/icon";

interface PlaceDetailsProps {
  place?: string | null;
  address?: string | null;
  workHours?: string | null;
  tips?: string | null;
  tone?: "dark" | "light";
}

const PlaceDetails = ({ place, address, workHours, tips, tone = "dark" }: PlaceDetailsProps) => {
  if (!place && !address && !workHours && !tips) return null;
  const text = tone === "dark" ? "text-white/80" : "text-white";
  const sub = tone === "dark" ? "text-white/50" : "text-white/70";
  const mapQuery = encodeURIComponent([place, address].filter(Boolean).join(", "));
  return (
    <div className="mt-2 mb-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 flex flex-col gap-1.5">
      {place && (
        <p className={`flex items-center gap-1.5 text-[13px] font-semibold ${text}`}>
          <Icon name="MapPin" size={14} className="text-[#22e0a1] flex-shrink-0" />
          <span className="break-words">{place}</span>
        </p>
      )}
      {address && (
        <a
          href={`https://yandex.ru/maps/?text=${mapQuery}`}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`flex items-start gap-1.5 text-[12px] underline-offset-2 hover:underline ${sub}`}
        >
          <Icon name="Navigation" size={13} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{address}</span>
        </a>
      )}
      {workHours && (
        <p className={`flex items-start gap-1.5 text-[12px] ${sub}`}>
          <Icon name="Clock" size={13} className="flex-shrink-0 mt-0.5" />
          <span className="break-words">{workHours}</span>
        </p>
      )}
      {tips && (
        <p className={`flex items-start gap-1.5 text-[12px] ${text}`}>
          <Icon name="Lightbulb" size={13} className="flex-shrink-0 mt-0.5 text-yellow-300" />
          <span className="break-words whitespace-pre-wrap">{tips}</span>
        </p>
      )}
    </div>
  );
};

export default PlaceDetails;
