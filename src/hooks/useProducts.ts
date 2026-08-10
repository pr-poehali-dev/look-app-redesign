import { useEffect, useState } from "react";

const PRODUCTS_URL = "https://functions.poehali.dev/c4d3aa37-b7c2-4047-880a-ab17127da315";

export interface Product {
  id: number;
  video_id: number;
  title: string;
  price: number;
  old_price?: number | null;
  image?: string | null;
  promo_code?: string | null;
  product_url?: string | null;
}

/** Товары для набора видео (video_id -> Product[]). Не грузит ничего, если список id пустой. */
export const useProductsByVideos = (videoIds: Array<number | string>) => {
  const [byVideo, setByVideo] = useState<Record<string, Product[]>>({});
  const key = videoIds.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`${PRODUCTS_URL}?action=by_video&video_ids=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((raw) => {
        if (cancelled) return;
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setByVideo(data.products || {});
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key]);

  return byVideo;
};

export const trackProductClick = (productId: number, videoId?: number, userId?: string) => {
  fetch(`${PRODUCTS_URL}?action=click`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": userId } : {}) },
    body: JSON.stringify({ product_id: productId, video_id: videoId }),
  }).catch(() => {});
};
