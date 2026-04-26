import { useEffect, useState, useCallback } from "react";

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

export const useComments = (targetType: TargetType, targetId: string | number, enabled: boolean) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await fetch(`${COMMENTS_URL}?target_type=${targetType}&target_id=${encodeURIComponent(String(targetId))}`);
      const data = await res.json();
      const list: CommentItem[] = (data.comments || []).map((c: { id: number; name: string; handle?: string; text: string; time?: string }) => ({
        id: c.id,
        name: c.name,
        handle: c.handle,
        text: c.text,
        time: formatRelative(c.time),
      }));
      setComments(list);
    } catch {
      // молча
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const send = useCallback(async (text: string, authorName = "Я") => {
    const trimmed = text.trim();
    if (!trimmed || !targetId) return;
    const optimistic: CommentItem = {
      id: `tmp-${Date.now()}`,
      name: authorName,
      text: trimmed,
      time: "сейчас",
    };
    setComments(prev => [optimistic, ...prev]);
    try {
      const res = await fetch(COMMENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_id: String(targetId),
          text: trimmed,
          author_name: authorName,
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
      }
    } catch {
      // оставляем оптимистичный
    }
  }, [targetType, targetId]);

  return { comments, loading, send, reload: load };
};