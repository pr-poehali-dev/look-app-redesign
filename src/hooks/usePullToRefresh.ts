import { RefObject, useEffect, useRef, useState } from "react";

const THRESHOLD = 80;
const MAX_PULL = 120;
const DEAD_ZONE = 24;

export const usePullToRefresh = (
  ref: RefObject<HTMLElement>,
  onRefresh: () => Promise<unknown> | void,
  enabled = true
) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const locked = useRef(false);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const innerScrolled = (target: EventTarget | null) => {
      let n = target as HTMLElement | null;
      while (n && n !== el) {
        if (n.scrollTop > 0) return true;
        n = n.parentElement;
      }
      return false;
    };

    const onStart = (e: TouchEvent) => {
      locked.current = false;
      if (busy.current || e.touches.length !== 1 || el.scrollTop > 0 || innerScrolled(e.target)) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || locked.current) return;
      if (el.scrollTop > 0 || innerScrolled(e.target)) {
        locked.current = true; pullRef.current = 0; setPull(0); return;
      }
      const dy = e.touches[0].clientY - startY.current;
      const dx = Math.abs(e.touches[0].clientX - startX.current);
      if (dy < -6 || dx > Math.abs(dy)) {
        locked.current = true; pullRef.current = 0; setPull(0); return;
      }
      if (dy <= DEAD_ZONE) return;
      const v = Math.min(MAX_PULL, (dy - DEAD_ZONE) * 0.5);
      pullRef.current = v;
      setPull(v);
    };

    const onEnd = async () => {
      const reached = !locked.current && pullRef.current >= THRESHOLD;
      startY.current = null;
      locked.current = false;
      pullRef.current = 0;
      if (!reached || busy.current) { setPull(0); return; }
      busy.current = true;
      setRefreshing(true);
      setPull(THRESHOLD * 0.7);
      const minWait = new Promise((r) => setTimeout(r, 700));
      try { await Promise.all([Promise.resolve(cb.current()), minWait]); } catch { /* ignore */ }
      busy.current = false;
      setRefreshing(false);
      setPull(0);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [ref, enabled]);

  return { pull, refreshing };
};
