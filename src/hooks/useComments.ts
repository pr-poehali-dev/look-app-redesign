import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGuestId } from "@/lib/guestId";

const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

export interface CommentItem {
  id: number | string;
  name: string;
  handle?: string;
  text: string;
  time: string;
}

export type TargetType = "video" | "post";

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return "сейчас";
  try {
    const date = new Date(iso);
    const diff = Date.now() - date.getTime();
    if (diff < 60_000) return "сейчас";
    const min = Math.floor(diff / 60_000);
    if (min < 60) return `${min} мин`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ч`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} д`;
    return date.toLocaleDateString("ru-RU");
  } catch {
    return "сейчас";
  }
};

export const useComments = (targetType: TargetType, targetId: string | number, enabled: boolean, initialCount = 0) => {
  const { user } = useAuth();
  const userId = user?.id || getGuestId();
  const userName = user?.name || "Гость";
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [count, setCount] = useState<number>(initialCount);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    const cacheKey = `comments_cache_${targetType}_${targetId}`;
    const CACHE_TTL = 30_000;

    const mapList = (raw: { id: number; name: string; handle?: string; text: string; time?: string }[]): CommentItem[] =>
      raw.map(c => ({ id: c.id, name: c.name, handle: c.handle, text: c.text, time: formatRelative(c.time) }));

    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { ts, comments: rawList } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL) {
          const list = mapList(rawList);
          setComments(list);
          setCount(prev => Math.max(prev, list.length));
          setLoaded(true);
          return;
        }
      }
    } catch { /* ignore */ }

    setLoading(true);
    try {
      const res = await fetch(`${COMMENTS_URL}?target_type=${targetType}&target_id=${encodeURIComponent(String(targetId))}`);
      const data = await res.json();
      const rawList = data.comments || [];
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), comments: rawList })); } catch { /* ignore */ }
      const list = mapList(rawList);
      setComments(list);
      setCount(prev => Math.max(prev, list.length));
      setLoaded(true);
    } catch {
      // молча
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    if (enabled && !loaded) load();
  }, [enabled, loaded, load]);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    fetch(`${COMMENTS_URL}?action=count&target_type=${targetType}&target_ids=${encodeURIComponent(String(targetId))}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const c = data?.comments?.[String(targetId)];
        if (typeof c === "number") setCount(c);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [targetType, targetId]);

  useEffect(() => {
    setCount(prev => (prev === 0 || initialCount > prev ? initialCount : prev));
  }, [initialCount]);

  const send = useCallback(async (text: string, authorName?: string) => {
    const trimmed = text.trim();
    if (!trimmed || !targetId) return;
    const finalName = authorName || userName;
    const optimistic: CommentItem = {
      id: `tmp-${Date.now()}`,
      name: finalName,
      text: trimmed,
      time: "сейчас",
    };
    setComments(prev => [optimistic, ...prev]);
    setCount(c => c + 1);
    try {
      const res = await fetch(COMMENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body: JSON.stringify({
          target_type: targetType,
          target_id: String(targetId),
          text: trimmed,
          author_name: finalName,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setComments(prev => prev.map(c => c.id === optimistic.id ? {
          id: data.comment.id,
          name: data.comment.name,
          handle: data.comment.handle,
          text: data.comment.text,
          time: formatRelative(data.comment.time),
        } : c));
        try { sessionStorage.removeItem(`comments_cache_${targetType}_${targetId}`); } catch { /* ignore */ }
      }
    } catch {
      // оставляем оптимистичный
    }
  }, [targetType, targetId, userId, userName]);

  return { comments, count, loading, send, reload: load };
};