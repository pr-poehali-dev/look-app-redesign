import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export const COLLECTIONS_URL = "https://functions.poehali.dev/935b3a06-14c9-4885-ad84-52799a161bfa";
const EVENT = "collections-change";

export interface Collection {
  id: number;
  title: string;
  is_system: boolean;
  total: number;
  unwatched: number;
  cover: string | null;
  videos: number;
}

export interface CollectionItem {
  id: number;
  item_type: string;
  item_id: string;
  image: string | null;
  title: string | null;
  handle: string | null;
  watched: boolean;
  url: string | null;
  is_video: boolean;
}

export interface CollectionPayload {
  itemType: "post" | "video" | "article";
  itemId: string | number;
  image?: string;
  title?: string;
  handle?: string;
  url?: string;
  isVideo?: boolean;
}

const parse = async (res: Response) => {
  const raw = await res.json();
  return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
};

const call = async (userId: string, action: string, method = "GET", body?: unknown, query = "") => {
  const res = await fetch(`${COLLECTIONS_URL}?action=${action}${query}`, {
    method,
    headers: { "Content-Type": "application/json", "X-User-Id": userId },
    body: body ? JSON.stringify(body) : undefined,
  });
  return parse(res);
};

const notify = () => window.dispatchEvent(new CustomEvent(EVENT));

export const saveToCollection = async (userId: string, payload: CollectionPayload, collectionId?: number) => {
  const data = await call(userId, "add_item", "POST", {
    collection_id: collectionId,
    item_type: payload.itemType,
    item_id: String(payload.itemId),
    image: payload.image || "",
    title: payload.title || "",
    handle: payload.handle || "",
    url: payload.url || "",
    is_video: !!payload.isVideo,
  });
  notify();
  return data as { ok?: boolean; title?: string; collection_id?: number };
};

export const createCollection = async (userId: string, title = "") => {
  const data = await call(userId, "create", "POST", { title });
  notify();
  return data as { id?: number; title?: string };
};

export const useCollections = () => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    if (!user?.id) { setCollections([]); return; }
    setLoading(true);
    call(user.id, "mine")
      .then((d) => setCollections(d.collections || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [refresh]);

  const rename = useCallback(async (id: number, title: string) => {
    if (!user?.id) return;
    await call(user.id, "rename", "PUT", { id, title });
    notify();
  }, [user?.id]);

  const remove = useCallback(async (id: number) => {
    if (!user?.id) return;
    await call(user.id, "delete", "DELETE", { id });
    notify();
  }, [user?.id]);

  return { collections, loading, refresh, rename, remove };
};

export const useCollectionView = (id: number, onlyNew: boolean) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [isSystem, setIsSystem] = useState(false);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((track = false) => {
    if (!user?.id) return;
    call(user.id, "view", "GET", undefined, `&id=${id}${onlyNew ? "&unwatched=1" : ""}${track ? "&track=1" : ""}`)
      .then((d) => {
        setTitle(d.title || "");
        setIsSystem(!!d.is_system);
        setItems(d.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, id, onlyNew]);

  useEffect(() => { load(true); }, [user?.id, id]);
  useEffect(() => { load(false); }, [onlyNew]);

  const setWatched = useCallback(async (itemId: number, watched: boolean) => {
    if (!user?.id) return;
    setItems((prev) => prev.map((it) => it.id === itemId ? { ...it, watched } : it));
    await call(user.id, "watched", "POST", { id: itemId, watched });
    notify();
  }, [user?.id]);

  const removeItem = useCallback(async (it: CollectionItem) => {
    if (!user?.id) return;
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    await call(user.id, "remove_item", "DELETE", { collection_id: id, item_type: it.item_type, item_id: it.item_id });
    notify();
  }, [user?.id, id]);

  return { title, isSystem, items, loading, setWatched, removeItem, reload: load };
};
