import { RefObject, useEffect, useRef, useState } from "react";

const THRESHOLD = 70;
const MAX_PULL = 110;

export const usePullToRefresh = (
  ref: RefObject<HTMLElement>,
  onRefresh: () => Promise<unknown> | void,
  enabled = true
) => {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onStart = (e: TouchEvent) => {
      if (busy.current || e.touches.length !== 1 || el.scrollTop > 0) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (el.scrollTop > 0) { startY.current = null; pullRef.current = 0; setPull(0); return; }
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) { if (pullRef.current) { pullRef.current = 0; setPull(0); } return; }
      const v = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = v;
      setPull(v);
    };

    const onEnd = async () => {
      const reached = pullRef.current >= THRESHOLD;
      startY.current = null;
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
