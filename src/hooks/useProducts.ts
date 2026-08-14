import { useCallback, useEffect, useState } from "react";

const PRODUCTS_URL = "https://functions.poehali.dev/c4d3aa37-b7c2-4047-880a-ab17127da315";

export type ProductStatus = "draft" | "pending" | "active" | "blocked";

export interface Product {
  id: number;
  video_id?: number | null;
  owner_user_id?: string;
  owner_handle?: string | null;
  owner_name?: string | null;
  owner_avatar?: string | null;
  title: string;
  description?: string;
  price: number;
  old_price?: number | null;
  image?: string | null;
  promo_code?: string | null;
  product_url?: string | null;
  category?: string;
  in_stock?: boolean;
  status?: ProductStatus;
  is_partner?: boolean;
  moderation_note?: string;
  created_at?: string;
}

export interface ProductHotspot {
  id: number;
  product_id: number;
  x: number;
  y: number;
  time_start: number;
  title: string;
  price: number;
  image?: string | null;
}

const parseBody = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

/** Товары для набора видео (video_id -> Product[]). Не грузит ничего, если список id пустой. */
export const useProductsByVideos = (videoIds: Array<number | string>) => {
  const [byVideo, setByVideo] = useState<Record<string, Product[]>>({});
  const key = videoIds.filter(Boolean).join(",");

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetch(`${PRODUCTS_URL}?action=by_video&video_ids=${encodeURIComponent(key)}`)
      .then(parseBody)
      .then((data) => { if (!cancelled) setByVideo(data.products || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key]);

  return byVideo;
};

/** Метки-хотспоты (координаты на кадре) конкретного видео. */
export const useProductHotspots = (videoId?: number | string | null) => {
  const [hotspots, setHotspots] = useState<ProductHotspot[]>([]);

  useEffect(() => {
    if (!videoId) return;
    let cancelled = false;
    fetch(`${PRODUCTS_URL}?action=hotspots&video_id=${encodeURIComponent(String(videoId))}`)
      .then(parseBody)
      .then((data) => { if (!cancelled) setHotspots(data.hotspots || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [videoId]);

  return hotspots;
};

const REF_STORAGE_KEY = "look_pending_referral";

/** Запоминает партнёрскую ссылку, по которой пришёл пользователь (?product=&ref=), на время сессии. */
export const setPendingReferral = (productId: number, ref: string) => {
  try { sessionStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ productId, ref })); } catch { /* ignore */ }
};

/** Достаёт запомненный ref-код, если он относится к этому товару. */
export const getPendingReferral = (productId: number): string | null => {
  try {
    const raw = sessionStorage.getItem(REF_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.productId === productId ? (data.ref || null) : null;
  } catch {
    return null;
  }
};

export const trackProductClick = (productId: number, videoId?: number, userId?: string) => {
  const ref = getPendingReferral(productId) || undefined;
  fetch(`${PRODUCTS_URL}?action=click`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": userId } : {}) },
    body: JSON.stringify({ product_id: productId, video_id: videoId, ref }),
  }).catch(() => {});
};

/** Загружает фото товара файлом (base64) и возвращает готовый CDN-URL. */
export const uploadProductImage = async (file: File, userId: string): Promise<string | null> => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.slice(r.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error || new Error("FileReader error"));
    reader.readAsDataURL(file);
  });
  try {
    const res = await fetch(`${PRODUCTS_URL}?action=upload_image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify({ file: base64, content_type: file.type || "image/jpeg" }),
    });
    const data = await parseBody(res);
    return data.url || null;
  } catch {
    return null;
  }
};

/** Моя витрина товаров (все статусы) + CRUD. */
export const useMyProducts = (userId?: string | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!userId) { setProducts([]); return; }
    setLoading(true);
    fetch(`${PRODUCTS_URL}?action=mine`, { headers: { "X-User-Id": userId } })
      .then(parseBody)
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (p: Partial<Product>) => {
    if (!userId) return null;
    const res = await fetch(`${PRODUCTS_URL}?action=create`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify(p),
    });
    const data = await parseBody(res);
    refresh();
    return data;
  }, [userId, refresh]);

  const update = useCallback(async (id: number, patch: Partial<Product>) => {
    if (!userId) return;
    await fetch(`${PRODUCTS_URL}?action=update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify({ id, ...patch }),
    }).catch(() => {});
    refresh();
  }, [userId, refresh]);

  const toggleVisibility = useCallback(async (id: number, hide: boolean) => {
    if (!userId) return;
    await fetch(`${PRODUCTS_URL}?action=toggle_visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify({ id, hide }),
    }).catch(() => {});
    refresh();
  }, [userId, refresh]);

  const remove = useCallback(async (id: number) => {
    if (!userId) return;
    await fetch(`${PRODUCTS_URL}?action=delete&id=${id}`, {
      method: "DELETE",
      headers: { "X-User-Id": userId },
    }).catch(() => {});
    refresh();
  }, [userId, refresh]);

  return { products, loading, refresh, create, update, toggleVisibility, remove };
};

/** Партнёрский каталог товаров брендов — доступен всем для привязки к видео. */
export const usePartnerCatalog = () => {
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    fetch(`${PRODUCTS_URL}?action=partner_catalog`)
      .then(parseBody)
      .then((data) => setProducts(data.products || []))
      .catch(() => {});
  }, []);
  return products;
};

/** Публичная витрина товаров конкретного продавца (только активные). */
export const useShopProducts = (userId?: string | null) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setProducts([]); return; }
    let cancelled = false;
    setLoading(true);
    fetch(`${PRODUCTS_URL}?action=shop&user_id=${encodeURIComponent(userId)}`)
      .then(parseBody)
      .then((data) => { if (!cancelled) setProducts(data.products || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  return { products, loading };
};

/** Общий каталог активных товаров всех продавцов (маркетплейс). */
export const useCatalog = (category?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    const q = category && category !== "all" ? `&category=${encodeURIComponent(category)}` : "";
    fetch(`${PRODUCTS_URL}?action=catalog${q}`)
      .then(parseBody)
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category]);

  useEffect(() => { refresh(); }, [refresh]);

  return { products, loading, refresh };
};

export interface HotspotToAttach { product_id: number; x: number; y: number; time_start: number }

export const attachHotspotsToVideo = async (videoId: number, hotspots: HotspotToAttach[], userId?: string) => {
  if (!hotspots.length) return;
  await fetch(`${PRODUCTS_URL}?action=attach_hotspots`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(userId ? { "X-User-Id": userId } : {}) },
    body: JSON.stringify({ video_id: videoId, hotspots }),
  }).catch(() => {});
};

/** Получить (или создать) свою партнёрскую ссылку на товар — можно продвигать чужой товар за комиссию. */
export const generateReferralLink = async (productId: number, userId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${PRODUCTS_URL}?action=generate_referral`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": userId },
      body: JSON.stringify({ product_id: productId }),
    });
    const data = await parseBody(res);
    return data.referral_code || null;
  } catch {
    return null;
  }
};

export interface ReferralStat {
  product_id: number;
  title: string;
  image?: string | null;
  referral_code: string;
  clicks: number;
  orders_count: number;
  earned: number;
}

/** Статистика по своим партнёрским ссылкам: переходы и заработок с продаж. */
export const useMyReferrals = (userId?: string | null) => {
  const [referrals, setReferrals] = useState<ReferralStat[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!userId) { setReferrals([]); return; }
    setLoading(true);
    fetch(`${PRODUCTS_URL}?action=my_referrals`, { headers: { "X-User-Id": userId } })
      .then(parseBody)
      .then((data) => setReferrals(data.referrals || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { referrals, loading, refresh };
};