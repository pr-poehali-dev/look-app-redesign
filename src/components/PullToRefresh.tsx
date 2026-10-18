import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const BASE_THRESHOLD = 90;
const SNAP_THRESHOLD = 150;
const MAX_FLICK_SPEED = 0.9;
const MIN_HOLD_MS = 250;

const isScrollable = (el: HTMLElement) => {
  const oy = getComputedStyle(el).overflowY;
  return (oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1;
};

const analyze = (target: EventTarget | null) => {
  let el = target as HTMLElement | null;
  let atTop = true;
  let snap = false;
  while (el && el !== document.documentElement) {
    if (el.nodeType === 1) {
      if (el.closest("input, textarea, select, [contenteditable='true'], [role='dialog'], [data-no-ptr]")) return null;
      if (isScrollable(el)) {
        if (el.scrollTop > 0) atTop = false;
        if (el.className && typeof el.className === "string" && el.className.includes("snap-y")) snap = true;
      }
    }
    el = el.parentElement;
  }
  if (window.scrollY > 0) atTop = false;
  return { atTop, snap };
};

const PullToRefresh = () => {
  const [pull, setPull] = useState(0);
  const [loading, setLoading] = useState(false);
  const [armed, setArmed] = useState(false);
  const st = useRef({ y0: 0, x0: 0, t0: 0, active: false, snap: false, dist: 0, tOk: 0 });

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || loading) return;
      const a = analyze(e.target);
      if (!a || !a.atTop) { st.current.active = false; return; }
      const t = e.touches[0];
      st.current = { y0: t.clientY, x0: t.clientX, t0: Date.now(), active: true, snap: a.snap, dist: 0, tOk: 0 };
    };

    const onMove = (e: TouchEvent) => {
      const s = st.current;
      if (!s.active) return;
      const t = e.touches[0];
      const dy = t.clientY - s.y0;
      const dx = Math.abs(t.clientX - s.x0);
      if (dy <= 0 || dx > dy * 0.6) {
        if (dy < -8 || dx > 30) { s.active = false; setPull(0); setArmed(false); }
        return;
      }
      const dist = dy * 0.55;
      s.dist = dist;
      const need = s.snap ? SNAP_THRESHOLD : BASE_THRESHOLD;
      setPull(Math.min(dist, need + 30));
      setArmed(dist >= need);
    };

    const onEnd = () => {
      const s = st.current;
      if (!s.active) return;
      s.active = false;
      const need = s.snap ? SNAP_THRESHOLD : BASE_THRESHOLD;
      const elapsed = Date.now() - s.t0;
      const speed = s.dist / Math.max(elapsed, 1);
      const deliberate = elapsed >= MIN_HOLD_MS && speed <= MAX_FLICK_SPEED;
      if (s.dist >= need && deliberate) {
        setLoading(true);
        setPull(need);
        setTimeout(() => window.location.reload(), 250);
      } else {
        setPull(0);
      }
      setArmed(false);
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [loading]);

  if (pull < 12 && !loading) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[300] flex justify-center pointer-events-none"
      style={{ top: "env(safe-area-inset-top)", transform: `translateY(${Math.max(pull - 36, 0)}px)`, opacity: Math.min(pull / 60, 1) }}
    >
      <div className="w-9 h-9 rounded-full bg-black/70 backdrop-blur flex items-center justify-center shadow-lg">
        <Icon
          name={loading ? "Loader" : "ArrowDown"}
          size={18}
          className={`text-white transition-transform ${loading ? "animate-spin" : armed ? "rotate-180" : ""}`}
        />
      </div>
    </div>
  );
};

export default PullToRefresh;
