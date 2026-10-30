import Icon from "@/components/ui/icon";

interface Props {
  helpful?: boolean;
  canMark: boolean;
  onToggle: () => void;
}

const HelpfulMark = ({ helpful, canMark, onToggle }: Props) => {
  if (!helpful && !canMark) return null;
  if (canMark) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${helpful ? "text-[#FF5A3C]" : "text-white/40"}`}
      >
        <Icon name={helpful ? "Pin" : "PinOff"} fallback="Pin" size={12} />
        {helpful ? "Полезный ответ" : "Отметить полезным"}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#FF5A3C]">
      <Icon name="Pin" size={12} />
      Полезный ответ
    </span>
  );
};

export default HelpfulMark;
