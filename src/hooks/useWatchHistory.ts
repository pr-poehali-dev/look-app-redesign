import { useEffect, useState } from "react";

export interface WatchItem {
  id: number | string;
  image: string;
  thumbnail?: string;
  title?: string;
  handle?: string;
  progress: number;
  at: number;
}

const KEY = "watch_history_v1";
const EVENT = "watch-history-change";
const MAX_ITEMS = 30;

const read = (): WatchItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const recordWatch = (item: Omit<WatchItem, "at">) => {
  try {
    const rest = read().filter((w) => String(w.id) !== String(item.id));
    localStorage.setItem(KEY, JSON.stringify([{ ...item, at: Date.now() }, ...rest].slice(0, MAX_ITEMS)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch { /* ignore */ }
};

export const useWatchHistory = (): WatchItem[] => {
  const [items, setItems] = useState<WatchItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(read());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return items;
};
