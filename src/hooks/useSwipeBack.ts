import { useEffect } from "react";

const EDGE = 32;
const MIN_DX = 70;
const TOP_ZONE = 130;

const findBackButton = (): HTMLElement | null => {
  const icons = document.querySelectorAll("svg.lucide-arrow-left, svg.lucide-chevron-left");
  let found: HTMLElement | null = null;
  icons.forEach((svg) => {
    const btn = svg.closest("button") as HTMLElement | null;
    if (!btn || btn.hasAttribute("disabled")) return;
    const r = btn.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.top < 0 || r.top > TOP_ZONE || r.left > 120) return;
    found = btn;
  });
  return found;
};

export const useSwipeBack = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let start: { x: number; y: number } | null = null;

    const onStart = (e: TouchEvent) => {
      const isMobile = window.innerWidth < 768;
      const t = e.touches[0];
      start = isMobile && e.touches.length === 1 && t.clientX <= EDGE ? { x: t.clientX, y: t.clientY } : null;
    };
    const onEnd = (e: TouchEvent) => {
      const s = start;
      start = null;
      if (!s) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - s.x;
      const dy = Math.abs(t.clientY - s.y);
      if (dx < MIN_DX || dx < dy * 1.5) return;
      findBackButton()?.click();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, []);
};
