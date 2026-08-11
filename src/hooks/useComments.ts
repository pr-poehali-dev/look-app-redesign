import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getGuestId } from "@/lib/guestId";
import { fetchCommentCount } from "@/lib/likesBatch";

const COMMENTS_URL = "https://functions.poehali.dev/4ceed9c1-422c-484e-806e-b3cc8af8b9ec";

export interface CommentItem {
  id: number | string;
  name: string;
  handle?: string;
  text: string;
  time: string;
  parentId?: number | null;
  likes: number;
  liked?: boolean;
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
    setLoading(true);
    try {
      const res = await fetch(`${COMMENTS_URL}?target_type=${targetType}&target_id=${encodeURIComponent(String(targetId))}`);
      const data = await res.json();
      const list: CommentItem[] = (data.comments || []).map((c: { id: number; name: string; handle?: string; text: string; time?: string; parent_id?: number | null; likes?: number }) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        text: c.text,
        time: formatRelative(c.time),
        parentId: c.parent_id ?? null,
        likes: c.likes || 0,
      }));
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
    fetchCommentCount(targetType, String(targetId)).then(c => {
      if (cancelled) return;
      if (typeof c === "number") setCount(prev => Math.max(prev, c));
    });
    return () => { cancelled = true; };
  }, [targetType, targetId]);

  useEffect(() => {
    setCount(prev => (prev === 0 || initialCount > prev ? initialCount : prev));
  }, [initialCount]);

  const send = useCallback(async (text: string, authorName?: string, parentId?: number | string | null) => {
    const trimmed = text.trim();
    if (!trimmed || !targetId) return;
    const finalName = authorName || userName;
    const optimistic: CommentItem = {
      id: `tmp-${Date.now()}`,
      name: finalName,
      text: trimmed,
      time: "сейчас",
      parentId: parentId ? Number(parentId) : null,
      likes: 0,
    };
    setComments(prev => parentId
      ? (() => {
          const idx = prev.map(c => c.parentId).lastIndexOf(Number(parentId));
          const insertAt = idx === -1 ? prev.findIndex(c => c.id === parentId) + 1 : idx + 1;
          const copy = [...prev];
          copy.splice(insertAt <= 0 ? prev.length : insertAt, 0, optimistic);
          return copy;
        })()
      : [optimistic, ...prev]);
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
          parent_id: parentId || undefined,
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
          parentId: data.comment.parent_id ?? null,
          likes: data.comment.likes || 0,
        } : c));
      }
    } catch {
      // оставляем оптимистичный
    }
  }, [targetType, targetId, userId, userName]);

  const toggleLike = useCallback(async (commentId: number | string) => {
    setComments(prev => prev.map(c => c.id === commentId
      ? { ...c, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) }
      : c));
    try {
      await fetch(`${COMMENTS_URL}?action=likes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": userId },
        body: JSON.stringify({ target_type: "comment", target_id: String(commentId) }),
      });
    } catch {
      // оставляем оптимистичное состояние
    }
  }, [userId]);

  return { comments, count, loading, send, reload: load, toggleLike };
};
