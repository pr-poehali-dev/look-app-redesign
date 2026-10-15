import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

const COLLABS_URL = "https://functions.poehali.dev/c8abec04-3371-4a40-9aa7-892ac2f3c18b";

export type CollabStatus = "pending" | "accepted" | "declined" | "published" | "cancelled";

export interface BrandCollab {
  id: number;
  brand_user_id: string;
  brand_name: string;
  author_user_id: string;
  product_title: string;
  message: string;
  product_url: string | null;
  status: CollabStatus;
  video_id: number | null;
  created_at: string | null;
  brand_handle: string | null;
  brand_avatar: string | null;
  author_handle: string | null;
  author_avatar: string | null;
}

const call = async (userId: string, action: string, body?: Record<string, unknown>) => {
  const headers: Record<string, string> = { "X-User-Id": userId };
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(body ? COLLABS_URL : `${COLLABS_URL}?action=${action}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify({ action, ...body }) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
};

export const useBrandCollabs = (kind: "incoming" | "outgoing") => {
  const { user } = useAuth();
  const [collabs, setCollabs] = useState<BrandCollab[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) { setCollabs([]); return; }
    setLoading(true);
    const { ok, data } = await call(String(user.id), kind);
    setCollabs(ok ? data.collabs || [] : []);
    setLoading(false);
  }, [user?.id, kind]);

  useEffect(() => { reload(); }, [reload]);

  const respond = async (id: number, decision: "accept" | "decline") => {
    if (!user?.id) return false;
    const { ok } = await call(String(user.id), "respond", { id, decision });
    if (ok) await reload();
    return ok;
  };

  const cancel = async (id: number) => {
    if (!user?.id) return false;
    const { ok } = await call(String(user.id), "cancel", { id });
    if (ok) await reload();
    return ok;
  };

  const send = async (payload: { author_handle: string; brand_name: string; product_title: string; message: string; product_url: string }) => {
    if (!user?.id) return { ok: false, error: "Войдите в аккаунт" };
    const { ok, data } = await call(String(user.id), "send", payload);
    if (ok) await reload();
    return { ok, error: ok ? "" : (data.error as string) || "Не удалось отправить" };
  };

  return { collabs, loading, reload, respond, cancel, send };
};

export const useAcceptedCollabs = () => {
  const { collabs } = useBrandCollabs("incoming");
  return collabs.filter((c) => c.status === "accepted");
};
