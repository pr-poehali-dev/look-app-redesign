import { useEffect } from "react";

const MIN_DX = 60;
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

const isBlocked = (el: HTMLElement | null) => {
  if (!el) return false;
  if (el.closest?.("input,textarea,select,[contenteditable=true],[role=slider],[data-no-swipe],.sheet-theme")) return true;
  let n: HTMLElement | null = el;
  while (n && n !== document.body) {
    if (n.scrollWidth > n.clientWidth + 4) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === "auto" || ox === "scroll") return true;
    }
    n = n.parentElement;
  }
  return false;
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
    let start: { x: number; y: number; target: HTMLElement | null } | null = null;
    let sheetStart: { y: number; x: number; sheet: HTMLElement } | null = null;

    const onStart = (e: TouchEvent) => {
      const isMobile = window.innerWidth < 768;
      const t = e.touches[0];
      sheetStart = null;
      const target = e.target as HTMLElement | null;
      if (!isMobile || e.touches.length !== 1) { start = null; return; }
      const sheet = target?.closest?.(".sheet-theme") as HTMLElement | null;
      if (sheet) sheetStart = { x: t.clientX, y: t.clientY, sheet };
      start = { x: t.clientX, y: t.clientY, target };
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
      if (isBlocked(s.target)) return;
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
