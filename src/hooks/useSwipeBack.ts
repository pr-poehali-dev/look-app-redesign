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

const closeSheet = (sheet: HTMLElement) => {
  const backdrop = sheet.parentElement;
  if (!backdrop) return;
  backdrop.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
  backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const scrolledInside = (el: HTMLElement | null, sheet: HTMLElement) => {
  while (el && el !== sheet.parentElement) {
    if (el.scrollTop > 0) return true;
    el = el.parentElement;
  }
  return false;
};

export const useSwipeBack = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let start: { x: number; y: number } | null = null;
    let sheetStart: { y: number; x: number; sheet: HTMLElement } | null = null;

    const onStart = (e: TouchEvent) => {
      const isMobile = window.innerWidth < 768;
      const t = e.touches[0];
      sheetStart = null;
      const target = e.target as HTMLElement | null;
      const sheet = isMobile && e.touches.length === 1 ? (target?.closest?.(".sheet-theme") as HTMLElement | null) : null;
      if (sheet && !scrolledInside(target, sheet)) sheetStart = { x: t.clientX, y: t.clientY, sheet };
      start = isMobile && e.touches.length === 1 && t.clientX <= EDGE ? { x: t.clientX, y: t.clientY } : null;
    };
    const onEnd = (e: TouchEvent) => {
      const ss = sheetStart;
      sheetStart = null;
      if (ss) {
        const t = e.changedTouches[0];
        const dy = t.clientY - ss.y;
        const dx = Math.abs(t.clientX - ss.x);
        if (dy > 90 && dy > dx * 1.5 && !scrolledInside(e.target as HTMLElement, ss.sheet)) {
          start = null;
          closeSheet(ss.sheet);
          return;
        }
      }
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
