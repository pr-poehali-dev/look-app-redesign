import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPendingReferral } from "@/hooks/useProducts";

const CART_URL = "https://functions.poehali.dev/32fdb3d3-b4f4-4dda-ac97-b0b038649b0f";

export interface CartItem {
  id: number;
  product_id: number;
  quantity: number;
  title: string;
  price: number;
  image?: string | null;
  promo_code?: string | null;
  video_id?: number | null;
}

export const useCart = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!user?.id) { setItems([]); setTotal(0); return; }
    setLoading(true);
    fetch(`${CART_URL}?action=list`, { headers: { "X-User-Id": user.id } })
      .then((r) => r.json())
      .then((raw) => {
        const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const addToCart = useCallback(async (productId: number, quantity = 1) => {
    if (!user?.id) return false;
    try {
      const ref = getPendingReferral(productId) || undefined;
      await fetch(`${CART_URL}?action=add`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id },
        body: JSON.stringify({ product_id: productId, quantity, ref }),
      });
      refresh();
      return true;
    } catch { return false; }
  }, [user?.id, refresh]);

  const updateQuantity = useCallback(async (itemId: number, quantity: number) => {
    if (!user?.id) return;
    await fetch(`${CART_URL}?action=update_quantity`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      body: JSON.stringify({ id: itemId, quantity }),
    }).catch(() => {});
    refresh();
  }, [user?.id, refresh]);

  const removeItem = useCallback(async (itemId: number) => {
    if (!user?.id) return;
    await fetch(`${CART_URL}?action=remove&id=${itemId}`, {
      method: "DELETE",
      headers: { "X-User-Id": user.id },
    }).catch(() => {});
    refresh();
  }, [user?.id, refresh]);

  const checkout = useCallback(async () => {
    if (!user?.id) return null;
    try {
      const res = await fetch(`${CART_URL}?action=checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": user.id },
      });
      const raw = await res.json();
      const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
      refresh();
      return data;
    } catch { return null; }
  }, [user?.id, refresh]);

  return { items, total, loading, addToCart, updateQuantity, removeItem, checkout, refresh };
};