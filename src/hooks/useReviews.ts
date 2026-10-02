import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const REVIEWS_URL = "https://functions.poehali.dev/624a62b6-f281-4c64-8f3d-7fc562265b8e";

export interface Review {
  id: number;
  user_id: string;
  rating: number;
  text: string;
  image?: string | null;
  created_at?: string;
  author_name: string;
  author_handle?: string | null;
  author_avatar?: string | null;
}

const parseBody = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

export const useProductReviews = (productId: number) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${REVIEWS_URL}?action=list&product_id=${productId}`);
      const data = await parseBody(res);
      setReviews(data.reviews || []);
      setAvg(data.avg || 0);
      setCount(data.count || 0);
    } catch { /* ignore */ }
    setLoading(false);
  }, [productId]);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (rating: number, text: string, image?: string | null) => {
    if (!user?.id) return false;
    const res = await fetch(`${REVIEWS_URL}?action=add`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ product_id: productId, rating, text, image }),
    }).catch(() => null);
    if (!res || !res.ok) return false;
    await refresh();
    return true;
  }, [user?.id, productId, refresh]);

  const remove = useCallback(async (id: number) => {
    if (!user?.id) return;
    await fetch(`${REVIEWS_URL}?action=delete&id=${id}`, { method: "DELETE", headers: { "X-User-Id": user.id } }).catch(() => {});
    refresh();
  }, [user?.id, refresh]);

  return { reviews, avg, count, loading, add, remove };
};

export const useReviewSummary = (productIds: number[]) => {
  const [summary, setSummary] = useState<Record<string, { avg: number; count: number }>>({});
  const key = productIds.join(",");
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`${REVIEWS_URL}?action=summary&product_ids=${key}`)
      .then(parseBody)
      .then((d) => { if (!cancelled) setSummary(d.summary || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key]);
  return summary;
};
