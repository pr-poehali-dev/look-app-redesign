import { useEffect, useState, useCallback } from "react";

export type SavedItemType = "post" | "video";

export interface SavedItem {
  type: SavedItemType;
  id: number | string;
  image: string;
  title?: string;
  handle?: string;
  views?: number;
  savedAt: number;
}

const STORAGE_KEY = "saved_items_v1";
const EVENT_NAME = "saved-items-change";

const readAll = (): SavedItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeAll = (items: SavedItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
};

const keyOf = (type: SavedItemType, id: number | string) => `${type}:${id}`;

export const isSavedNow = (type: SavedItemType, id: number | string) => {
  return readAll().some(it => keyOf(it.type, it.id) === keyOf(type, id));
};

export const useSavedItem = (type: SavedItemType, id: number | string, payload: Omit<SavedItem, "type" | "id" | "savedAt">) => {
  const [saved, setSaved] = useState<boolean>(() => isSavedNow(type, id));

  useEffect(() => {
    const sync = () => setSaved(isSavedNow(type, id));
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, [type, id]);

  const toggle = useCallback(() => {
    const all = readAll();
    const k = keyOf(type, id);
    const exists = all.find(it => keyOf(it.type, it.id) === k);
    if (exists) {
      writeAll(all.filter(it => keyOf(it.type, it.id) !== k));
    } else {
      writeAll([{ type, id, savedAt: Date.now(), ...payload }, ...all]);
    }
  }, [type, id, payload]);

  return { saved, toggle };
};

export const useSavedList = (): SavedItem[] => {
  const [items, setItems] = useState<SavedItem[]>(readAll);

  useEffect(() => {
    const sync = () => setItems(readAll());
    window.addEventListener(EVENT_NAME, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT_NAME, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return items;
};
