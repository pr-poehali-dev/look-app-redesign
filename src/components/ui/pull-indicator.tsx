import Icon from "@/components/ui/icon";

interface PullIndicatorProps {
  pull: number;
  refreshing: boolean;
}

const PullIndicator = ({ pull, refreshing }: PullIndicatorProps) => {
  if (pull <= 0 && !refreshing) return null;
  const ready = pull >= 110;
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[60] flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white shadow-lg"
      style={{
        top: 56,
        transform: `translate(-50%, ${Math.min(pull, 90) - 40}px)`,
        opacity: Math.min(1, pull / 70),
        transition: pull === 0 || refreshing ? "transform 0.2s, opacity 0.2s" : "none",
      }}
    >
      <Icon
        name="RefreshCw"
        size={20}
        className={refreshing ? "animate-spin" : ""}
        style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)`, opacity: ready ? 1 : 0.7 }}
      />
    </div>
  );
};

export default PullIndicator;
