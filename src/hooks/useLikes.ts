import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGuestId } from "@/lib/guestId";

const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

export type LikeTargetType = "video" | "post";

export const useLikes = (targetType: LikeTargetType, targetId: string | number, initialCount = 0) => {
  const { user } = useAuth();
  const userId = user?.id || getGuestId();
  const [count, setCount] = useState<number>(initialCount);
  const [liked, setLiked] = useState(false);
  const [ready, setReady] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    fetch(`${COMMENTS_URL}?action=likes&target_type=${targetType}&target_id=${encodeURIComponent(String(targetId))}`, {
      headers: { "X-User-Id": userId },
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (typeof data.count === "number") setCount(prev => Math.max(prev, data.count));
        if (typeof data.liked === "boolean") setLiked(data.liked);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => { cancelled = true; };
  }, [targetType, targetId, userId]);

  const toggle = useCallback(async () => {
    if (!targetId || inFlight.current) return;
    inFlight.current = true;
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    try {
      const res = await fetch(`${COMMENTS_URL}?action=likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body: JSON.stringify({ target_type: targetType, target_id: String(targetId) }),
      });
      const data = await res.json();
      if (typeof data.count === "number") setCount(data.count);
      if (typeof data.liked === "boolean") setLiked(data.liked);
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      inFlight.current = false;
    }
  }, [targetType, targetId, userId, liked, count]);

  return { liked, count, toggle, ready };
};
