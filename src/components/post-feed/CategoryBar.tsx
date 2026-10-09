import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { FEED_CATEGORIES } from "@/lib/feedCategories";

const CategoryBar = ({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  const pick = (id: string, target: HTMLElement) => {
    onChange(id);
    target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className={`relative ${className}`}>
      {canLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/70 items-center justify-center"
          aria-label="Назад"
        >
          <Icon name="ChevronLeft" size={16} className="text-white" />
        </button>
      )}
      <div
        ref={ref}
        onScroll={update}
        className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {FEED_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={(e) => pick(c.id, e.currentTarget)}
            className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
              value === c.id ? "bg-white text-black" : "bg-white/10 text-white/70"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {canRight && (
        <button
          onClick={() => scrollBy(1)}
          className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/70 items-center justify-center"
          aria-label="Вперёд"
        >
          <Icon name="ChevronRight" size={16} className="text-white" />
        </button>
      )}
    </div>
  );
};

export default CategoryBar;
