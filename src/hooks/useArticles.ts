import { readFeedCache, writeFeedCache } from "@/lib/feedCache";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const ARTICLES_URL = "https://functions.poehali.dev/8a82c5d6-f598-4faf-a1ff-9e418c1823d8";

export interface Article {
  id: number;
  owner_user_id: string;
  title: string;
  cover_image: string | null;
  body: string;
  source_url?: string | null;
  views: number;
  created_at?: string;
  author_name: string;
  author_handle?: string | null;
  author_avatar?: string | null;
  read_minutes: number;
  kind?: "article" | "tutorial";
  steps?: TutorialStep[];
  steps_count?: number;
  materials?: string;
  duration?: string;
  difficulty?: "" | "easy" | "medium" | "hard";
}

export interface TutorialStep {
  title: string;
  text: string;
  image: string;
}

export const DIFFICULTY_LABEL: Record<string, string> = { easy: "Легко", medium: "Средне", hard: "Сложно" };

const parseBody = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

export const useArticles = (mode: "feed" | "mine") => {
  const { user } = useAuth();
  const cacheKey = `articles_feed_${user?.id || "anon"}`;
  const [articles, setArticles] = useState<Article[]>(() => (mode === "feed" ? readFeedCache<Article[]>(cacheKey) || [] : []));
  const [loading, setLoading] = useState(() => !(mode === "feed" && readFeedCache(cacheKey)));

  const refresh = useCallback(async () => {
    if (mode === "mine" && !user?.id) { setArticles([]); setLoading(false); return; }
    const url = mode === "feed" ? `${ARTICLES_URL}?action=feed` : `${ARTICLES_URL}?action=user&user_id=${encodeURIComponent(user!.id)}`;
    try {
      const data = await parseBody(await fetch(url));
      const next: Article[] = data.articles || [];
      if (mode === "feed") writeFeedCache(cacheKey, next.slice(0, 30));
      const sig = (l: Article[]) => l.map(a => `${a.id}:${a.title}:${a.cover_image}`).join("|");
      setArticles(prev => (sig(prev) === sig(next) ? prev : next));
    } catch { /* ignore */ }
    setLoading(false);
  }, [mode, user?.id, cacheKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const remove = useCallback(async (id: number) => {
    if (!user?.id) return;
    await fetch(`${ARTICLES_URL}?action=delete&id=${id}`, { method: "DELETE", headers: { "X-User-Id": user.id } }).catch(() => {});
    refresh();
  }, [user?.id, refresh]);

  return { articles, loading, refresh, remove };
};

export const useUserArticles = (userId?: string | null) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setArticles([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`${ARTICLES_URL}?action=user&user_id=${encodeURIComponent(userId)}`)
      .then(parseBody)
      .then((data) => { if (!cancelled) setArticles(data.articles || []); })
      .catch(() => { if (!cancelled) setArticles([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  return { articles, loading };
};

export const fetchArticle = async (id: number): Promise<Article | null> => {
  try {
    const data = await parseBody(await fetch(`${ARTICLES_URL}?action=view&id=${id}`));
    return data.article || null;
  } catch {
    return null;
  }
};

export const saveArticle = async (
  userId: string,
  a: {
    id?: number; title: string; body: string; cover_image?: string | null; source_url?: string | null;
    kind?: "article" | "tutorial"; steps?: TutorialStep[]; materials?: string; duration?: string; difficulty?: string;
  }
): Promise<boolean> => {
  const res = await fetch(`${ARTICLES_URL}?action=${a.id ? "update" : "create"}`, {
    method: a.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: JSON.stringify(a),
  }).catch(() => null);
  return !!res && res.ok;
};

export const importArticleByUrl = async (userId: string, url: string): Promise<{ article?: Partial<Article>; error?: string }> => {
  try {
    const res = await fetch(`${ARTICLES_URL}?action=import_url`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify({ url }),
    });
    const data = await parseBody(res);
    if (!res.ok) return { error: data.error || "Не удалось импортировать" };
    return { article: data.article };
  } catch {
    return { error: "Нет связи с сервером" };
  }
};
