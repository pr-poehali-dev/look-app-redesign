import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGuestId } from "@/lib/guestId";
import { fetchLikeCount } from "@/lib/likesBatch";

const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

export type LikeTargetType = "video" | "post";

// Общее состояние лайков между всеми карточками одного поста/видео (лента, мозаика, полный просмотр)
type LikeState = { count: number; liked: boolean };
const likeCache = new Map<string, LikeState>();
const listeners = new Map<string, Set<(s: LikeState) => void>>();

const cacheKey = (targetType: LikeTargetType, targetId: string | number) => `${targetType}:${targetId}`;

const notify = (key: string, state: LikeState) => {
  likeCache.set(key, state);
  listeners.get(key)?.forEach((fn) => fn(state));
};

export const useLikes = (targetType: LikeTargetType, targetId: string | number, initialCount = 0) => {
  const { user } = useAuth();
  const userId = user?.id || getGuestId();
  const key = cacheKey(targetType, targetId);
  const cached = likeCache.get(key);
  const [count, setCount] = useState<number>(cached?.count ?? initialCount);
  const [liked, setLiked] = useState(cached?.liked ?? false);
  const [ready, setReady] = useState(!!cached);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!targetId) return;
    const set = listeners.get(key) || new Set();
    const onChange = (s: LikeState) => { setCount(s.count); setLiked(s.liked); };
    set.add(onChange);
    listeners.set(key, set);
    return () => { set.delete(onChange); };
  }, [key, targetId]);

  useEffect(() => {
    if (!targetId) return;
    if (likeCache.has(key)) { setReady(true); return; }
    let cancelled = false;
    fetchLikeCount(targetType, String(targetId)).then((cnt) => {
      if (cancelled) return;
      const finalCount = Math.max(initialCount, cnt);
      if (!likeCache.has(key)) notify(key, { count: finalCount, liked: false });
      setReady(true);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetType, targetId, userId, key]);

  const toggle = useCallback(async () => {
    if (!targetId || inFlight.current) return;
    inFlight.current = true;
    const prev = likeCache.get(key) || { count, liked };
    const optimistic = { liked: !prev.liked, count: prev.liked ? Math.max(0, prev.count - 1) : prev.count + 1 };
    notify(key, optimistic);
    try {
      const res = await fetch(`${COMMENTS_URL}?action=likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body: JSON.stringify({ target_type: targetType, target_id: String(targetId) }),
      });
      const data = await res.json();
      const next = { ...optimistic };
      if (typeof data.count === "number") next.count = data.count;
      if (typeof data.liked === "boolean") next.liked = data.liked;
      notify(key, next);
    } catch {
      notify(key, prev);
    } finally {
      inFlight.current = false;
    }
  }, [targetType, targetId, userId, key, liked, count]);

  return { liked, count, toggle, ready };
};